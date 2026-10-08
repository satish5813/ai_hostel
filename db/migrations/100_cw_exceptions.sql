-- =====================================================================
-- 100  Chief Warden portal (Stage 2 of docs/flow-a-to-f.html), 3 Oct 2026.
--   Allotment exceptions: Room Allotment asks, the Chief Warden of the hostel decides (use case CW-03):
--     Blocked_Room / Reserved_Room   a bed in a room the Chief Warden blocked or kept for staff, guests, medical
--     Other_Room_Type                a bed of another room type than the student applied for
--     Waitlist_Jump                  a bed ahead of students who were waiting longer
--     Transfer                       move a checked-in student to another bed
--     Staff_Room                     a room for resident faculty or staff
--   An approved exception is carried out by the database in the same transaction, so the decision and its effect
--   cannot drift apart. A blocked room or another room type can no longer be offered without an approved exception.
-- =====================================================================

CREATE TYPE hostel.exception_kind   AS ENUM ('Blocked_Room', 'Reserved_Room', 'Other_Room_Type', 'Waitlist_Jump', 'Transfer', 'Staff_Room');
CREATE TYPE hostel.exception_status AS ENUM ('Pending', 'Approved', 'Refused', 'Cancelled');

CREATE TABLE hostel.allotment_exception (
  exception_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind             hostel.exception_kind NOT NULL,
  facility_id      varchar(30) NOT NULL REFERENCES hostel.hostel_profile,
  registration_id  bigint REFERENCES hostel.hostel_registration,
  student_id       varchar(20) REFERENCES ref.student_master,
  staff_id         varchar(20) REFERENCES ref.staff_master,
  from_alloc_id    bigint REFERENCES hostel.hostel_allocation,
  subspace_id      varchar(30) NOT NULL REFERENCES infra.subspace,
  key_no           varchar(20),
  reason           text NOT NULL CHECK (length(btrim(reason)) >= 5),
  requested_by     varchar(20) NOT NULL REFERENCES ref.staff_master,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  status           hostel.exception_status NOT NULL DEFAULT 'Pending',
  decided_by       varchar(20) REFERENCES ref.staff_master,
  decided_at       timestamptz,
  decision_remarks text,
  offer_id         bigint REFERENCES hostel.room_offer,
  hostel_alloc_id  bigint REFERENCES hostel.hostel_allocation,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       varchar(20),
  updated_at       timestamptz,
  updated_by       varchar(20),
  CHECK (kind <> 'Staff_Room' OR (staff_id IS NOT NULL AND key_no IS NOT NULL)),
  CHECK (kind <> 'Transfer' OR from_alloc_id IS NOT NULL),
  CHECK (kind IN ('Staff_Room', 'Transfer') OR registration_id IS NOT NULL),
  CHECK (status IN ('Pending', 'Cancelled') OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)),
  CHECK (status <> 'Refused' OR length(btrim(coalesce(decision_remarks, ''))) > 0)
);
CREATE UNIQUE INDEX ux_exception_pending_bed ON hostel.allotment_exception (subspace_id) WHERE status = 'Pending';
CREATE INDEX ix_exception_facility ON hostel.allotment_exception (facility_id, status);
COMMENT ON TABLE hostel.allotment_exception IS 'A bed given outside the allotment rules: asked by Room Allotment, decided by the Chief Warden of the hostel, carried out by the database on approval.';
CREATE TRIGGER trg_audit_allotment_exception AFTER INSERT OR UPDATE OR DELETE ON hostel.allotment_exception FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('exception_id');

-- the request: the bed decides the hostel; the bed must be free; the student or stay must belong to that hostel
CREATE OR REPLACE FUNCTION hostel.fn_exception_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE loc record; v_fac varchar; v_cw boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO loc FROM hostel.fn_bed_location(NEW.subspace_id);
    IF loc.facility_id IS NULL THEN RAISE EXCEPTION 'Bed % does not exist', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
    IF loc.space_status = 'Under_Maintenance' THEN RAISE EXCEPTION 'Bed % is in a room under maintenance', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
    IF loc.bed_status <> 'Vacant' THEN RAISE EXCEPTION 'Bed % is % and cannot be given', NEW.subspace_id, loc.bed_status USING ERRCODE = 'check_violation'; END IF;
    NEW.facility_id := loc.facility_id;
    IF NEW.registration_id IS NOT NULL THEN
      SELECT facility_id, student_id INTO v_fac, NEW.student_id FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
      IF v_fac <> loc.facility_id THEN RAISE EXCEPTION 'The student applied for another hostel' USING ERRCODE = 'check_violation'; END IF;
    END IF;
    IF NEW.kind = 'Transfer' THEN
      SELECT a.student_id, b.facility_id INTO NEW.student_id, v_fac FROM hostel.hostel_allocation a JOIN hostel.v_bed b ON b.subspace_id = a.subspace_id
       WHERE a.hostel_alloc_id = NEW.from_alloc_id AND a.status = 'Active' AND a.occupant_type = 'Student';
      IF NEW.student_id IS NULL THEN RAISE EXCEPTION 'Stay % is not an active student stay', NEW.from_alloc_id USING ERRCODE = 'check_violation'; END IF;
      IF v_fac <> loc.facility_id THEN RAISE EXCEPTION 'A transfer stays within one hostel' USING ERRCODE = 'check_violation'; END IF;
    END IF;
    RETURN NEW;
  END IF;
  -- a decision
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF OLD.status <> 'Pending' THEN RAISE EXCEPTION 'This request was already %', lower(OLD.status::text) USING ERRCODE = 'check_violation'; END IF;
  IF NEW.status IN ('Approved', 'Refused') THEN
    v_cw := hostel.fn_staff_has_role(NEW.decided_by, 'Chief_Warden', NEW.facility_id)
            OR EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = NEW.decided_by AND ur.role_code = 'Director_Hostels');
    IF NOT v_cw THEN RAISE EXCEPTION 'Only the Chief Warden of this hostel decides an exception' USING ERRCODE = 'check_violation'; END IF;
    NEW.decided_at := coalesce(NEW.decided_at, now());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_exception_before BEFORE INSERT OR UPDATE ON hostel.allotment_exception FOR EACH ROW EXECUTE FUNCTION hostel.fn_exception_before();

-- the approval is carried out at once
CREATE OR REPLACE FUNCTION hostel.fn_exception_apply() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_offer bigint; v_alloc bigint; v_reg bigint; v_year varchar; old_alloc hostel.hostel_allocation%ROWTYPE;
BEGIN
  IF NEW.status <> 'Approved' OR OLD.status = 'Approved' THEN RETURN NULL; END IF;
  PERFORM set_config('hostel.exception', NEW.exception_id::text, true);
  IF NEW.kind IN ('Blocked_Room', 'Reserved_Room', 'Other_Room_Type', 'Waitlist_Jump') THEN
    INSERT INTO hostel.room_offer (registration_id, subspace_id, offered_by, created_by)
    VALUES (NEW.registration_id, NEW.subspace_id, NEW.requested_by, NEW.decided_by) RETURNING offer_id INTO v_offer;
    -- the student applied for another room type: the registration follows the bed
    UPDATE hostel.hostel_registration r SET room_type_id = loc.room_type_id, updated_by = NEW.decided_by
      FROM hostel.fn_bed_location(NEW.subspace_id) loc WHERE r.registration_id = NEW.registration_id AND r.room_type_id IS DISTINCT FROM loc.room_type_id;
    UPDATE hostel.allotment_exception SET offer_id = v_offer WHERE exception_id = NEW.exception_id;
  ELSIF NEW.kind = 'Transfer' THEN
    SELECT * INTO old_alloc FROM hostel.hostel_allocation WHERE hostel_alloc_id = NEW.from_alloc_id;
    SELECT registration_id INTO v_reg FROM hostel.room_offer WHERE offer_id = old_alloc.offer_id;
    UPDATE hostel.hostel_allocation SET status = 'Transferred', remarks = 'Moved to ' || NEW.subspace_id || ' (exception ' || NEW.exception_id || ')', updated_by = NEW.decided_by
     WHERE hostel_alloc_id = old_alloc.hostel_alloc_id;
    INSERT INTO hostel.room_offer (registration_id, subspace_id, offered_by, created_by)
    VALUES (v_reg, NEW.subspace_id, NEW.requested_by, NEW.decided_by) RETURNING offer_id INTO v_offer;
    UPDATE hostel.room_offer SET student_decision = 'Accepted', updated_by = NEW.decided_by WHERE offer_id = v_offer;
    INSERT INTO hostel.hostel_allocation (occupant_type, student_id, subspace_id, offer_id, academic_year, allocation_date, key_no, checked_in_by, approved_by, remarks, created_by)
    VALUES ('Student', old_alloc.student_id, NEW.subspace_id, v_offer, old_alloc.academic_year, current_date, coalesce(NEW.key_no, old_alloc.key_no), NEW.requested_by, NEW.decided_by,
            'Moved from ' || old_alloc.subspace_id || ' (exception ' || NEW.exception_id || ')', NEW.decided_by)
    RETURNING hostel_alloc_id INTO v_alloc;
    UPDATE hostel.allotment_exception SET offer_id = v_offer, hostel_alloc_id = v_alloc WHERE exception_id = NEW.exception_id;
  ELSIF NEW.kind = 'Staff_Room' THEN
    SELECT academic_year INTO v_year FROM hostel.academic_year WHERE is_current;
    INSERT INTO hostel.hostel_allocation (occupant_type, staff_id, subspace_id, academic_year, allocation_date, key_no, checked_in_by, approved_by, remarks, created_by)
    VALUES ('Staff', NEW.staff_id, NEW.subspace_id, v_year, current_date, NEW.key_no, NEW.requested_by, NEW.decided_by, NEW.reason, NEW.decided_by)
    RETURNING hostel_alloc_id INTO v_alloc;
    UPDATE hostel.allotment_exception SET hostel_alloc_id = v_alloc WHERE exception_id = NEW.exception_id;
  END IF;
  PERFORM set_config('hostel.exception', '', true);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_exception_apply AFTER UPDATE OF status ON hostel.allotment_exception FOR EACH ROW EXECUTE FUNCTION hostel.fn_exception_apply();

-- room offers: a blocked room or another room type needs an approved exception (or the mapping of a resident from a file)
CREATE OR REPLACE FUNCTION hostel.fn_room_offer_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; d hostel.demand_status; loc record; v_hours numeric;
        v_exc hostel.allotment_exception%ROWTYPE; v_ok boolean;
BEGIN
  SELECT * INTO v_exc FROM hostel.allotment_exception
   WHERE exception_id = nullif(current_setting('hostel.exception', true), '')::bigint AND status = 'Approved' AND subspace_id = NEW.subspace_id;
  v_ok := v_exc.exception_id IS NOT NULL OR current_setting('hostel.mapping', true) = 'on';
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  SELECT status INTO d FROM hostel.fee_demand WHERE demand_id = r.reg_demand_id;
  IF d IS DISTINCT FROM 'Paid' AND d IS DISTINCT FROM 'Waived' THEN
    RAISE EXCEPTION 'Registration % : registration fee is not paid (demand status %)', r.registration_no, d USING ERRCODE = 'check_violation';
  END IF;
  IF r.status NOT IN ('Fee_Paid','Waitlisted','Allotted') AND NOT (v_exc.kind IS NOT DISTINCT FROM 'Transfer' AND r.status = 'Checked_In') THEN
    RAISE EXCEPTION 'Registration % is % and cannot receive an offer', r.registration_no, r.status USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO loc FROM hostel.fn_bed_location(NEW.subspace_id);
  IF loc.space_status = 'Under_Maintenance' THEN RAISE EXCEPTION 'Bed % is in a room under maintenance', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.bed_status <> 'Vacant' THEN RAISE EXCEPTION 'Bed % is % and cannot be offered', NEW.subspace_id, loc.bed_status USING ERRCODE = 'check_violation'; END IF;
  IF loc.facility_id <> r.facility_id THEN RAISE EXCEPTION 'Bed % is not in hostel %', NEW.subspace_id, r.facility_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.room_type_id IS DISTINCT FROM r.room_type_id AND NOT v_ok THEN
    RAISE EXCEPTION 'Bed % is not of the room type chosen: ask the Chief Warden for an exception', NEW.subspace_id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM hostel.room_block k WHERE k.space_id = loc.space_id AND k.status = 'Blocked') AND NOT v_ok THEN
    RAISE EXCEPTION 'Room % is blocked by the Chief Warden: ask for an exception', loc.space_id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE subspace_id = NEW.subspace_id AND status = 'Active') THEN
    RAISE EXCEPTION 'Bed % has an active allocation', NEW.subspace_id USING ERRCODE = 'check_violation';
  END IF;
  NEW.offer_no := coalesce((SELECT max(offer_no) FROM hostel.room_offer WHERE registration_id = NEW.registration_id), 0) + 1;
  SELECT amount INTO v_hours FROM shared.policy_setting WHERE setting_key = 'offer_hold_hours';
  NEW.hold_until := NEW.offered_on + make_interval(hours => coalesce(v_hours, 48)::int);
  UPDATE infra.subspace SET status = 'Held' WHERE subspace_id = NEW.subspace_id;
  IF v_exc.kind IS DISTINCT FROM 'Transfer' THEN
    UPDATE hostel.hostel_registration SET status = 'Allotted', waitlist_no = NULL WHERE registration_id = NEW.registration_id AND status <> 'Allotted';
  END IF;
  RETURN NEW;
END $$;

-- mapping a resident from a file keeps working in a blocked room: it marks itself for the offer rule
CREATE OR REPLACE FUNCTION hostel.fn_map_student_bed(p_student varchar, p_bed varchar, p_year varchar, p_key varchar, p_date date, p_by varchar)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE loc record; v_reg bigint; v_offer bigint; v_alloc bigint;
BEGIN
  SELECT * INTO loc FROM hostel.fn_bed_location(p_bed);
  IF loc.facility_id IS NULL THEN RAISE EXCEPTION 'Bed % does not exist', p_bed USING ERRCODE = 'check_violation'; END IF;
  IF loc.room_type_id IS NULL THEN RAISE EXCEPTION 'Room of bed % has no room type', p_bed USING ERRCODE = 'check_violation'; END IF;
  IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = p_student AND status = 'Active') THEN
    RAISE EXCEPTION 'Student % already has a bed', p_student USING ERRCODE = 'check_violation';
  END IF;
  SELECT registration_id INTO v_reg FROM hostel.hostel_registration WHERE student_id = p_student AND academic_year = p_year;
  IF v_reg IS NULL THEN
    INSERT INTO hostel.hostel_registration (student_id, academic_year, facility_id, room_type_id, rules_accepted, remarks, created_by)
    VALUES (p_student, p_year, loc.facility_id, loc.room_type_id, true, 'Mapped from a file', p_by) RETURNING registration_id INTO v_reg;
  ELSE
    UPDATE hostel.hostel_registration SET facility_id = loc.facility_id, room_type_id = loc.room_type_id, updated_by = p_by WHERE registration_id = v_reg AND status IN ('Applied','Fee_Paid','Waitlisted');
  END IF;
  UPDATE hostel.fee_demand d SET status = 'Waived', updated_by = p_by FROM hostel.hostel_registration r
    WHERE r.registration_id = v_reg AND d.demand_id = r.reg_demand_id AND d.status IN ('Pending','Overdue');
  UPDATE hostel.hostel_registration SET status = 'Fee_Paid' WHERE registration_id = v_reg AND status = 'Applied';
  PERFORM set_config('hostel.mapping', 'on', true);
  INSERT INTO hostel.room_offer (registration_id, subspace_id, offer_no, hold_until, offered_by, created_by)
  VALUES (v_reg, p_bed, 0, now() + interval '1 day', p_by, p_by) RETURNING offer_id INTO v_offer;
  PERFORM set_config('hostel.mapping', '', true);
  UPDATE hostel.room_offer SET student_decision = 'Accepted', updated_by = p_by WHERE offer_id = v_offer;
  UPDATE hostel.hostel_registration SET fee_check_status = 'Verified', fee_checked_by = p_by, fee_checked_on = now(), fee_check_remarks = 'Mapped from a file' WHERE registration_id = v_reg;
  INSERT INTO hostel.hostel_allocation (occupant_type, student_id, subspace_id, offer_id, academic_year, allocation_date, key_no, checked_in_by, created_by)
  VALUES ('Student', p_student, p_bed, v_offer, p_year, coalesce(p_date, current_date), coalesce(nullif(p_key, ''), 'NA'), p_by, p_by) RETURNING hostel_alloc_id INTO v_alloc;
  RETURN v_alloc;
END $$;
