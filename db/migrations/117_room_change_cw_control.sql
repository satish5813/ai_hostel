-- =====================================================================
-- 117  Room change: the Chief Warden's full control of their building, 5 Oct 2026.
--   * The Chief Warden (or Director, Hostels) may take the Floor Warden's step too, so one approval is enough.
--   * The Chief Warden may give any free bed of any room type, also after approving (the held bed moves with it);
--     the request's room type follows the bed.
--   * The Chief Warden may move a resident without a request from the student (hostel.fn_room_change_direct):
--     the request is recorded as arranged by the Chief Warden, the Floor Warden's step is marked not needed,
--     and the move is then carried out as any approved request (fn_room_change_complete), at once or later.
-- =====================================================================
BEGIN;

ALTER TABLE hostel.room_change ADD COLUMN IF NOT EXISTS arranged_by varchar(20) REFERENCES ref.staff_master;
COMMENT ON COLUMN hostel.room_change.arranged_by IS 'Chief Warden who moved the student without a request from the student; empty when the student asked';

-- a bed must be free now; the bed this request already holds is released by the caller first
CREATE OR REPLACE FUNCTION hostel.fn_room_change_check_bed(p_change hostel.room_change) RETURNS void LANGUAGE plpgsql AS $$
DECLARE b record;
BEGIN
  SELECT * INTO b FROM hostel.v_bed WHERE subspace_id = p_change.to_subspace_id;
  IF b.subspace_id IS NULL THEN RAISE EXCEPTION 'Bed % does not exist', p_change.to_subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF b.facility_id <> p_change.facility_id THEN RAISE EXCEPTION 'A room change stays within the hostel: bed % is in another hostel', b.bed_label USING ERRCODE = 'check_violation'; END IF;
  IF b.room_type_id IS DISTINCT FROM p_change.to_room_type_id THEN RAISE EXCEPTION 'Bed % is %, not the room type asked for', b.bed_label, b.type_name USING ERRCODE = 'check_violation'; END IF;
  IF b.space_id = (SELECT space_id FROM infra.subspace WHERE subspace_id = p_change.from_subspace_id) THEN
    RAISE EXCEPTION 'Bed % is in the room the student already lives in', b.bed_label USING ERRCODE = 'check_violation'; END IF;
  IF b.room_status = 'Under_Maintenance' THEN RAISE EXCEPTION 'Room % is under maintenance', b.room_code USING ERRCODE = 'check_violation'; END IF;
  IF coalesce(b.is_blocked, false) THEN RAISE EXCEPTION 'Room % is blocked by the Chief Warden', b.room_code USING ERRCODE = 'check_violation'; END IF;
  IF b.bed_status <> 'Vacant' THEN RAISE EXCEPTION 'Bed % is % and cannot be given', b.bed_label, lower(b.bed_status::text) USING ERRCODE = 'check_violation'; END IF;
END $$;

CREATE OR REPLACE FUNCTION hostel.fn_room_change_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st record; v_type smallint; v_year varchar;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO st FROM hostel.fn_student_stay(NEW.student_id);
    IF st.hostel_alloc_id IS NULL THEN RAISE EXCEPTION 'Student % does not live in a hostel room', NEW.student_id USING ERRCODE = 'check_violation'; END IF;
    SELECT room_type_id INTO v_type FROM hostel.v_bed WHERE subspace_id = st.subspace_id;
    NEW.facility_id := st.facility_id; NEW.from_alloc_id := st.hostel_alloc_id; NEW.from_subspace_id := st.subspace_id; NEW.from_room_type_id := v_type;
    IF NEW.kind = 'Same_Type' THEN NEW.to_room_type_id := coalesce(NEW.to_room_type_id, v_type); END IF;
    NEW.status := 'Pending_FW';
    SELECT academic_year INTO v_year FROM hostel.academic_year WHERE is_current;
    IF NOT EXISTS (SELECT 1 FROM hostel.room_type_fee WHERE facility_id = NEW.facility_id AND room_type_id = NEW.to_room_type_id AND academic_year = v_year) THEN
      RAISE EXCEPTION 'This hostel has no fee set for that room type in %', v_year USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM hostel.vacate_request v WHERE v.student_id = NEW.student_id AND v.status::text NOT IN ('Rejected', 'Cancelled', 'Checked_Out')) THEN
      RAISE EXCEPTION 'The student has asked to vacate the hostel: cancel that first' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.to_subspace_id IS NOT NULL THEN PERFORM hostel.fn_room_change_check_bed(NEW); END IF;
    RETURN NEW;
  END IF;
  -- another bed (and with it, perhaps another room type) while the request is open
  IF NEW.to_subspace_id IS DISTINCT FROM OLD.to_subspace_id OR NEW.to_room_type_id IS DISTINCT FROM OLD.to_room_type_id THEN
    IF OLD.status NOT IN ('Pending_FW', 'Pending_CW', 'Approved') THEN RAISE EXCEPTION 'The bed can be changed only before the move' USING ERRCODE = 'check_violation'; END IF;
    NEW.kind := CASE WHEN NEW.to_room_type_id = OLD.from_room_type_id THEN 'Same_Type' ELSE 'Room_Type' END;
    IF OLD.status = 'Approved' THEN
      IF NEW.to_subspace_id IS NULL THEN RAISE EXCEPTION 'An approved request keeps a bed' USING ERRCODE = 'check_violation'; END IF;
      UPDATE infra.subspace SET status = 'Vacant' WHERE subspace_id = OLD.to_subspace_id AND status = 'Held';
    END IF;
    IF NEW.to_subspace_id IS NOT NULL THEN PERFORM hostel.fn_room_change_check_bed(NEW); END IF;
    IF OLD.status = 'Approved' THEN UPDATE infra.subspace SET status = 'Held' WHERE subspace_id = NEW.to_subspace_id AND status = 'Vacant'; END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('Moved', 'Rejected', 'Cancelled') THEN RAISE EXCEPTION 'This request is already %', lower(OLD.status) USING ERRCODE = 'check_violation'; END IF;
    IF NEW.status = 'Cancelled' THEN NEW.cancelled_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;

-- level 1: the Floor Warden of the floor, or the Chief Warden / Director of the hostel; level 2: the Chief Warden / Director
CREATE OR REPLACE FUNCTION hostel.fn_room_change_step_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rc hostel.room_change%ROWTYPE; st record; v_cw boolean;
BEGIN
  IF NEW.request_type <> 'Room_Change' OR NEW.decision NOT IN ('Approved', 'Rejected') THEN RETURN NEW; END IF;
  SELECT * INTO rc FROM hostel.room_change WHERE change_id = NEW.request_id;
  IF rc.status NOT IN ('Pending_FW', 'Pending_CW') THEN RAISE EXCEPTION 'Room change % is %', rc.change_no, lower(rc.status) USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO st FROM hostel.fn_student_stay(rc.student_id);
  v_cw := hostel.fn_staff_has_role(NEW.acted_by, 'Chief_Warden', st.facility_id)
       OR EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = NEW.acted_by AND ur.role_code = 'Director_Hostels');
  IF NEW.level = 1 THEN
    IF NOT (v_cw OR EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.staff_id = NEW.acted_by AND a.hostel_role = 'Floor_Warden' AND a.status = 'Active'
                             AND a.facility_id = st.facility_id AND (a.zone_id IS NULL OR a.zone_id = st.zone_id))) THEN
      RAISE EXCEPTION 'Only the Floor Warden of the student''s floor or the Chief Warden takes this step' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF NOT v_cw THEN RAISE EXCEPTION 'Only the Chief Warden of this hostel decides a room change' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.decision = 'Approved' AND rc.to_subspace_id IS NULL THEN RAISE EXCEPTION 'Give the student a bed before approving' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.decision = 'Approved' THEN PERFORM hostel.fn_room_change_check_bed(rc); END IF;
  END IF;
  IF NEW.decision = 'Rejected' AND length(btrim(coalesce(NEW.remarks, ''))) < 3 THEN
    RAISE EXCEPTION 'Say why the request is not approved' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;

-- the Chief Warden moves a resident: an approved request at once (and the move too, when p_move_now)
CREATE OR REPLACE FUNCTION hostel.fn_room_change_direct(p_student varchar, p_bed varchar, p_reason text, p_by varchar,
                                                        p_move_now boolean DEFAULT false, p_reading numeric DEFAULT NULL, p_key varchar DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE st record; v_type smallint; v_from smallint; v_id bigint;
BEGIN
  SELECT * INTO st FROM hostel.fn_student_stay(p_student);
  IF st.hostel_alloc_id IS NULL THEN RAISE EXCEPTION 'Student % does not live in a hostel room', p_student USING ERRCODE = 'check_violation'; END IF;
  IF NOT (hostel.fn_staff_has_role(p_by, 'Chief_Warden', st.facility_id)
          OR EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = p_by AND ur.role_code = 'Director_Hostels')) THEN
    RAISE EXCEPTION 'Only the Chief Warden of this hostel moves a student directly' USING ERRCODE = 'check_violation';
  END IF;
  SELECT room_type_id INTO v_type FROM hostel.v_bed WHERE subspace_id = p_bed;
  IF v_type IS NULL THEN RAISE EXCEPTION 'Bed % does not exist or has no room type', p_bed USING ERRCODE = 'check_violation'; END IF;
  SELECT room_type_id INTO v_from FROM hostel.v_bed WHERE subspace_id = st.subspace_id;
  -- an open request of the student's is closed: this move replaces it
  UPDATE hostel.room_change SET status = 'Cancelled', updated_by = p_by WHERE student_id = p_student AND status IN ('Pending_FW', 'Pending_CW', 'Approved');
  INSERT INTO hostel.room_change (student_id, facility_id, from_alloc_id, from_subspace_id, from_room_type_id, kind, to_room_type_id, to_subspace_id, reason, arranged_by, created_by)
  VALUES (p_student, st.facility_id, st.hostel_alloc_id, st.subspace_id, v_from, CASE WHEN v_type = v_from THEN 'Same_Type' ELSE 'Room_Type' END, v_type, p_bed, p_reason, p_by, p_by)
  RETURNING change_id INTO v_id;
  UPDATE shared.approval_step SET decision = 'Skipped', decided_on = now(), remarks = 'Arranged by the Chief Warden'
   WHERE request_type = 'Room_Change' AND request_id = v_id AND level = 1;
  UPDATE shared.approval_step SET decision = 'Approved', acted_by = p_by, remarks = 'Arranged by the Chief Warden'
   WHERE request_type = 'Room_Change' AND request_id = v_id AND level = 2;
  IF p_move_now THEN PERFORM hostel.fn_room_change_complete(v_id, p_by, p_reading, p_key); END IF;
  RETURN v_id;
END $$;
COMMENT ON FUNCTION hostel.fn_room_change_direct(varchar, varchar, text, varchar, boolean, numeric, varchar) IS 'Chief Warden: move a resident to another bed of the hostel without a request from the student';

COMMIT;
