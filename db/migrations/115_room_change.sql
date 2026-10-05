-- =====================================================================
-- 115  Room change asked by the student, 5 Oct 2026.
--   A resident asks for another room in the same hostel: another room type (2-sharing AC -> 3-sharing AC ...)
--   or another room of the same type. Approval in two levels on the shared engine:
--     level 1  Floor Warden of the student's floor (the Chief Warden when the floor has none)
--     level 2  Chief Warden of the hostel, who may give another bed before approving; the bed is then held
--   On the day of the move the Floor Warden (or Chief Warden) reads the old room's meter and hands over the key;
--   the move is carried out by the Transfer exception of 100 and the money is settled at once:
--     hostel fee   the year is charged at the old rate up to the move and at the new rate after it; what was paid
--                  stays with the student. Dearer room: a demand for the difference. Cheaper room: the unpaid
--                  instalments are reduced, and what is left over is a refund due (Accounts).
--     electricity  the student's share of the old room's units this month, up to the move, is billed now;
--                  earlier bills stay as they are; the month-end bill of the old room counts this share as settled
--                  and shares the rest among the others.
-- =====================================================================
ALTER TYPE shared.request_type ADD VALUE IF NOT EXISTS 'Room_Change';
COMMIT;
BEGIN;

INSERT INTO shared.approval_rule (request_type, level, approver_role, step_name, is_final, status)
SELECT 'Room_Change', v.l, v.r, v.n, v.f, 'Active' FROM (VALUES (1::smallint, 'Floor_Warden', 'Floor Warden approves', false), (2::smallint, 'Chief_Warden', 'Chief Warden approves and gives the bed', true)) v(l, r, n, f)
WHERE NOT EXISTS (SELECT 1 FROM shared.approval_rule x WHERE x.request_type = 'Room_Change' AND x.level = v.l);

CREATE TABLE hostel.room_change (
  change_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  change_no        varchar(20) UNIQUE,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master,
  facility_id      varchar(30) NOT NULL REFERENCES hostel.hostel_profile,
  from_alloc_id    bigint NOT NULL REFERENCES hostel.hostel_allocation,
  from_subspace_id varchar(30) NOT NULL REFERENCES infra.subspace,
  from_room_type_id smallint NOT NULL REFERENCES hostel.room_type,
  kind             varchar(10) NOT NULL CHECK (kind IN ('Room_Type', 'Same_Type')),
  to_room_type_id  smallint NOT NULL REFERENCES hostel.room_type,
  to_subspace_id   varchar(30) REFERENCES infra.subspace,
  reason           text NOT NULL CHECK (length(btrim(reason)) >= 10),
  status           varchar(12) NOT NULL DEFAULT 'Pending_FW' CHECK (status IN ('Pending_FW', 'Pending_CW', 'Approved', 'Moved', 'Rejected', 'Cancelled')),
  requested_at     timestamptz NOT NULL DEFAULT now(),
  approved_by      varchar(20) REFERENCES ref.staff_master,
  move_date        date,
  moved_by         varchar(20) REFERENCES ref.staff_master,
  meter_reading    numeric(12,2),
  key_no           varchar(20),
  exception_id     bigint REFERENCES hostel.allotment_exception,
  new_alloc_id     bigint REFERENCES hostel.hostel_allocation,
  hostel_adjustment numeric(12,2),                         -- + to pay, - credit
  hostel_demand_id bigint REFERENCES hostel.fee_demand,
  refund_due       numeric(12,2) NOT NULL DEFAULT 0,
  elec_space_id    varchar(30),
  elec_month       date,
  elec_amount      numeric(12,2),
  elec_demand_id   bigint REFERENCES hostel.fee_demand,
  statement        jsonb,
  cancelled_at     timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (kind <> 'Same_Type' OR to_room_type_id = from_room_type_id),
  CHECK (kind <> 'Room_Type' OR to_room_type_id <> from_room_type_id),
  CHECK (status <> 'Approved' OR (to_subspace_id IS NOT NULL AND approved_by IS NOT NULL)),
  CHECK (status <> 'Moved' OR (move_date IS NOT NULL AND moved_by IS NOT NULL AND new_alloc_id IS NOT NULL))
);
CREATE UNIQUE INDEX ux_room_change_open_student ON hostel.room_change (student_id) WHERE status IN ('Pending_FW', 'Pending_CW', 'Approved');
CREATE UNIQUE INDEX ux_room_change_open_bed ON hostel.room_change (to_subspace_id) WHERE status IN ('Pending_FW', 'Pending_CW', 'Approved') AND to_subspace_id IS NOT NULL;
CREATE INDEX ix_room_change_facility ON hostel.room_change (facility_id, status);
CREATE INDEX ix_room_change_elec ON hostel.room_change (elec_space_id, elec_month) WHERE status = 'Moved';
COMMENT ON TABLE hostel.room_change IS 'A resident''s request to move to another room of the hostel: Floor Warden, then Chief Warden; on the move the hostel fee and the electricity are settled';
COMMENT ON COLUMN hostel.room_change.hostel_adjustment IS 'Hostel fee for the rest of the year at the new rate minus the old: + a new demand, - a credit';
COMMENT ON COLUMN hostel.room_change.refund_due IS 'Credit left after reducing the unpaid hostel instalments: refunded or adjusted by Accounts';
COMMENT ON COLUMN hostel.room_change.elec_amount IS 'The student''s share of the old room''s electricity this month up to the move, billed at the move';
CREATE TRIGGER trg_audit_room_change AFTER INSERT OR UPDATE OR DELETE ON hostel.room_change FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('change_id');
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON hostel.room_change FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();

-- a bed may be given for a room change: vacant, not blocked, not under maintenance, in the hostel, of the room type, another room
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
  IF b.bed_status <> 'Vacant' AND NOT (b.bed_status = 'Held' AND p_change.status = 'Approved') THEN
    RAISE EXCEPTION 'Bed % is % and cannot be given', b.bed_label, lower(b.bed_status::text) USING ERRCODE = 'check_violation'; END IF;
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
      RAISE EXCEPTION 'You have asked to vacate the hostel: cancel that first' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.to_subspace_id IS NOT NULL THEN PERFORM hostel.fn_room_change_check_bed(NEW); END IF;
    RETURN NEW;
  END IF;
  -- a new bed while the request is open (the student before the Floor Warden acts, the Chief Warden before approving)
  IF NEW.to_subspace_id IS DISTINCT FROM OLD.to_subspace_id THEN
    IF OLD.status NOT IN ('Pending_FW', 'Pending_CW') THEN RAISE EXCEPTION 'The bed can be changed only before the Chief Warden approves' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.to_subspace_id IS NOT NULL THEN PERFORM hostel.fn_room_change_check_bed(NEW); END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('Moved', 'Rejected', 'Cancelled') THEN RAISE EXCEPTION 'This request is already %', lower(OLD.status) USING ERRCODE = 'check_violation'; END IF;
    IF NEW.status = 'Cancelled' THEN NEW.cancelled_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_room_change_before BEFORE INSERT OR UPDATE ON hostel.room_change FOR EACH ROW EXECUTE FUNCTION hostel.fn_room_change_before();

CREATE OR REPLACE FUNCTION hostel.fn_room_change_after() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hostel.room_change SET change_no = 'RCH-' || to_char(NEW.requested_at, 'YYYY') || '-' || lpad(NEW.change_id::text, 5, '0') WHERE change_id = NEW.change_id;
    INSERT INTO shared.approval_step (request_type, request_id, level, rule_id, approver_role)
    SELECT 'Room_Change', NEW.change_id, r.level, r.rule_id, r.approver_role FROM shared.approval_rule r
     WHERE r.request_type = 'Room_Change' AND r.status = 'Active' ORDER BY r.level;
    RETURN NULL;
  END IF;
  IF NEW.status IN ('Cancelled', 'Rejected') AND OLD.status NOT IN ('Cancelled', 'Rejected') THEN
    -- the steps not taken are closed, a held bed is freed
    UPDATE shared.approval_step SET decision = 'Skipped', decided_on = now(), remarks = coalesce(remarks, 'Request ' || lower(NEW.status))
     WHERE request_type = 'Room_Change' AND request_id = NEW.change_id AND decision = 'Pending';
    IF OLD.status = 'Approved' THEN UPDATE infra.subspace SET status = 'Vacant' WHERE subspace_id = OLD.to_subspace_id AND status = 'Held'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_room_change_after AFTER INSERT OR UPDATE OF status ON hostel.room_change FOR EACH ROW EXECUTE FUNCTION hostel.fn_room_change_after();

-- who may act on a room-change step: the Floor Warden of the student's floor (or, with none on that floor, the Chief Warden),
-- then the Chief Warden of the hostel (or the Director, Hostels); the Chief Warden approves only with a bed given
CREATE OR REPLACE FUNCTION hostel.fn_room_change_step_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rc hostel.room_change%ROWTYPE; st record; v_ok boolean; v_dir boolean;
BEGIN
  IF NEW.request_type <> 'Room_Change' OR NEW.decision NOT IN ('Approved', 'Rejected') THEN RETURN NEW; END IF;
  SELECT * INTO rc FROM hostel.room_change WHERE change_id = NEW.request_id;
  IF rc.status NOT IN ('Pending_FW', 'Pending_CW') THEN RAISE EXCEPTION 'Room change % is %', rc.change_no, lower(rc.status) USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO st FROM hostel.fn_student_stay(rc.student_id);
  v_dir := EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = NEW.acted_by AND ur.role_code = 'Director_Hostels');
  IF NEW.level = 1 THEN
    v_ok := EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.staff_id = NEW.acted_by AND a.hostel_role = 'Floor_Warden' AND a.status = 'Active'
                     AND a.facility_id = st.facility_id AND (a.zone_id IS NULL OR a.zone_id = st.zone_id))
         OR ((hostel.fn_staff_has_role(NEW.acted_by, 'Chief_Warden', st.facility_id) OR v_dir)
             AND NOT EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.hostel_role = 'Floor_Warden' AND a.status = 'Active'
                              AND a.facility_id = st.facility_id AND (a.zone_id IS NULL OR a.zone_id = st.zone_id)));
    IF NOT v_ok THEN RAISE EXCEPTION 'Only the Floor Warden of the student''s floor takes this step' USING ERRCODE = 'check_violation'; END IF;
  ELSE
    IF NOT (hostel.fn_staff_has_role(NEW.acted_by, 'Chief_Warden', st.facility_id) OR v_dir) THEN
      RAISE EXCEPTION 'Only the Chief Warden of this hostel decides a room change' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.decision = 'Approved' AND rc.to_subspace_id IS NULL THEN
      RAISE EXCEPTION 'Give the student a bed before approving' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.decision = 'Approved' THEN PERFORM hostel.fn_room_change_check_bed(rc); END IF;
  END IF;
  IF NEW.decision = 'Rejected' AND length(btrim(coalesce(NEW.remarks, ''))) < 3 THEN
    RAISE EXCEPTION 'Say why the request is not approved' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_approval_step_room_change BEFORE UPDATE OF decision ON shared.approval_step FOR EACH ROW
  WHEN (NEW.request_type = 'Room_Change') EXECUTE FUNCTION hostel.fn_room_change_step_before();

CREATE OR REPLACE FUNCTION hostel.fn_room_change_step_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rc hostel.room_change%ROWTYPE; v_left integer; v_bed text;
BEGIN
  IF NEW.decision NOT IN ('Approved', 'Rejected') THEN RETURN NULL; END IF;
  SELECT * INTO rc FROM hostel.room_change WHERE change_id = NEW.request_id;
  IF NEW.decision = 'Rejected' THEN
    UPDATE hostel.room_change SET status = 'Rejected', updated_by = NEW.acted_by WHERE change_id = rc.change_id;
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', rc.student_id, 'In_App', 'ROOM_CHANGE', 'Room change not approved',
            format('Your room change %s was not approved: %s', rc.change_no, NEW.remarks), 'room_change', rc.change_id::text);
    RETURN NULL;
  END IF;
  SELECT count(*) INTO v_left FROM shared.approval_step WHERE request_type = 'Room_Change' AND request_id = rc.change_id AND decision = 'Pending';
  IF v_left > 0 THEN
    UPDATE hostel.room_change SET status = 'Pending_CW', updated_by = NEW.acted_by WHERE change_id = rc.change_id;
  ELSE
    UPDATE hostel.room_change SET status = 'Approved', approved_by = NEW.acted_by, updated_by = NEW.acted_by WHERE change_id = rc.change_id;
    UPDATE infra.subspace SET status = 'Held' WHERE subspace_id = rc.to_subspace_id AND status = 'Vacant';
    SELECT bed_label INTO v_bed FROM hostel.v_bed WHERE subspace_id = rc.to_subspace_id;
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', rc.student_id, 'In_App', 'ROOM_CHANGE', 'Room change approved',
            format('Your room change %s is approved: bed %s. Your Floor Warden will move you and settle the fee and electricity on the day.', rc.change_no, v_bed),
            'room_change', rc.change_id::text);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_approval_step_room_change_after AFTER UPDATE OF decision ON shared.approval_step FOR EACH ROW
  WHEN (NEW.request_type = 'Room_Change') EXECUTE FUNCTION hostel.fn_room_change_step_after();

-- ---------------------------------------------------------------------
-- The money statement of a move on p_date to room type p_to_type: hostel fee and electricity.
-- p_reading = the old room's meter today (empty: the latest reading recorded).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hostel.fn_room_change_statement(p_student varchar, p_to_type smallint, p_date date DEFAULT current_date, p_reading numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE st record; y hostel.academic_year%ROWTYPE; b record; f_old numeric; f_new numeric; t_new text; v_plan bigint;
        old_unused numeric; new_part numeric; n_days int; d_before int; d_after int; adj numeric; billed numeric; paid numeric; unpaid numeric; credit numeric; refund numeric;
        m0 date := date_trunc('month', p_date)::date; m_days int; m record; open_v numeric; open_at timestamptz; close_v numeric; close_at timestamptz; src text;
        rate numeric; incl numeric; rech numeric; units numeric; billable numeric; room_amt numeric; my_days numeric; all_days numeric; share numeric;
        e_due numeric; e_list jsonb; o_due numeric;
BEGIN
  SELECT * INTO st FROM hostel.fn_student_stay(p_student);
  IF st.hostel_alloc_id IS NULL THEN RAISE EXCEPTION 'Student % does not live in a hostel room', p_student USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO b FROM hostel.v_bed WHERE subspace_id = st.subspace_id;
  SELECT * INTO y FROM hostel.academic_year WHERE is_current;
  SELECT hostel_fee INTO f_old FROM hostel.room_type_fee WHERE facility_id = b.facility_id AND room_type_id = b.room_type_id AND academic_year = y.academic_year;
  SELECT f.hostel_fee, rt.type_name INTO f_new, t_new FROM hostel.room_type_fee f JOIN hostel.room_type rt USING (room_type_id)
   WHERE f.facility_id = b.facility_id AND f.room_type_id = p_to_type AND f.academic_year = y.academic_year;
  IF f_new IS NULL THEN RAISE EXCEPTION 'This hostel has no fee set for that room type' USING ERRCODE = 'check_violation'; END IF;
  f_old := coalesce(f_old, f_new);

  -- hostel fee: the old rate up to the day before the move, the new rate from the move
  n_days := y.end_date - y.start_date + 1;
  d_after := greatest(0, least(n_days, y.end_date - greatest(p_date, y.start_date) + 1));
  d_before := n_days - d_after;
  -- the old rate's part not used, the new rate's part; whole rupees, so the parts add up to the year's total
  old_unused := round(f_old * d_after / n_days, 0); new_part := round(f_new * d_after / n_days, 0);
  adj := new_part - old_unused;
  SELECT p.fee_plan_id INTO v_plan FROM hostel.hostel_allocation a JOIN hostel.room_offer o ON o.offer_id = a.offer_id JOIN hostel.fee_plan p ON p.registration_id = o.registration_id
   WHERE a.hostel_alloc_id = st.hostel_alloc_id;
  SELECT coalesce(sum(amount_due), 0), coalesce(sum(amount_paid), 0), coalesce(sum(greatest(amount_due - amount_paid, 0)) FILTER (WHERE status <> 'Waived'), 0)
    INTO billed, paid, unpaid
    FROM hostel.fee_demand WHERE student_id = p_student AND fee_head = 'Hostel'
     AND (fee_plan_id = v_plan OR (reference_type = 'room_change' AND created_at >= y.start_date));
  credit := CASE WHEN adj < 0 THEN least(-adj, unpaid) ELSE 0 END;
  refund := CASE WHEN adj < 0 THEN -adj - credit ELSE 0 END;

  -- electricity: the old room's units this month up to the move, shared by days among those who lived there
  SELECT * INTO m FROM hostel.room_meter WHERE space_id = st.space_id AND status = 'Active' ORDER BY meter_id DESC LIMIT 1;
  m_days := (m0 + interval '1 month')::date - m0;
  IF m.meter_id IS NOT NULL THEN
    SELECT reading_kwh, reading_at INTO open_v, open_at FROM hostel.meter_reading WHERE meter_id = m.meter_id AND reading_at < m0 ORDER BY reading_at DESC LIMIT 1;
    IF open_v IS NULL THEN
      SELECT reading_kwh, reading_at INTO open_v, open_at FROM hostel.meter_reading WHERE meter_id = m.meter_id AND reading_at >= m0 ORDER BY reading_at LIMIT 1;
    END IF;
    IF p_reading IS NOT NULL THEN close_v := p_reading; close_at := now(); src := 'Read on the day of the move';
    ELSE SELECT reading_kwh, reading_at INTO close_v, close_at FROM hostel.meter_reading WHERE meter_id = m.meter_id ORDER BY reading_at DESC LIMIT 1; src := 'Latest reading recorded'; END IF;
    SELECT t.rate_per_unit, t.included_units_per_month INTO rate, incl FROM hostel.electricity_tariff t
     WHERE t.room_type_id = b.room_type_id AND t.approved_by IS NOT NULL AND m0 >= t.effective_from AND (t.effective_to IS NULL OR m0 <= t.effective_to)
     ORDER BY t.effective_from DESC LIMIT 1;
    SELECT coalesce(sum(units_credited), 0) INTO rech FROM hostel.meter_recharge WHERE meter_id = m.meter_id AND status = 'Credited' AND created_at >= m0 AND created_at < p_date + 1;
    units := greatest(0, coalesce(close_v - open_v, 0));
    billable := greatest(0, units - round(coalesce(incl, 0) * (p_date - m0) / m_days, 2) - rech);
    room_amt := round(billable * coalesce(rate, 0), 2);
    SELECT coalesce(sum(least(coalesce(a.vacate_date + 1, p_date), p_date) - greatest(a.allocation_date, m0)) FILTER (WHERE a.student_id = p_student), 0),
           coalesce(sum(least(coalesce(a.vacate_date + 1, p_date), p_date) - greatest(a.allocation_date, m0)), 0)
      INTO my_days, all_days
      FROM hostel.hostel_allocation a JOIN infra.subspace ss ON ss.subspace_id = a.subspace_id
     WHERE ss.space_id = st.space_id AND a.occupant_type = 'Student' AND a.status IN ('Active', 'Vacated', 'Transferred')
       AND a.allocation_date < p_date AND coalesce(a.vacate_date + 1, p_date) > m0;
    share := CASE WHEN all_days > 0 AND rate IS NOT NULL THEN round(room_amt * my_days / all_days, 2) ELSE 0 END;
  END IF;
  SELECT coalesce(sum(amount_due - amount_paid), 0), coalesce(jsonb_agg(jsonb_build_object('demand_id', demand_id, 'due_date', due_date, 'amount', amount_due - amount_paid, 'status', status) ORDER BY due_date), '[]')
    INTO e_due, e_list FROM hostel.fee_demand WHERE student_id = p_student AND fee_head = 'Electricity' AND status IN ('Pending', 'Part_Paid', 'Overdue');
  SELECT coalesce(sum(amount_due - amount_paid), 0) INTO o_due FROM hostel.fee_demand
   WHERE student_id = p_student AND fee_head NOT IN ('Hostel', 'Electricity') AND status IN ('Pending', 'Part_Paid', 'Overdue');

  RETURN jsonb_build_object(
    'move_date', p_date, 'academic_year', y.academic_year, 'year_start', y.start_date, 'year_end', y.end_date, 'year_days', n_days,
    'days_old', d_before, 'days_new', d_after,
    'hostel', jsonb_build_object('old_type', b.type_name, 'old_fee', f_old, 'new_type', t_new, 'new_fee', f_new,
        'old_part', f_old - old_unused, 'new_part', new_part, 'year_total', f_old + adj,
        'adjustment', adj, 'billed', billed, 'paid', paid, 'unpaid', unpaid, 'credit_to_instalments', credit, 'refund_due', refund,
        'to_pay_after', greatest(unpaid + greatest(adj, 0) - credit, 0)),
    'electricity', jsonb_build_object('meter_no', m.meter_no, 'month', m0, 'opening', open_v, 'opening_at', open_at, 'reading', close_v, 'reading_at', close_at,
        'reading_source', src, 'units', units, 'included', round(coalesce(incl, 0) * (p_date - m0) / m_days, 2), 'recharged', rech, 'billable', billable, 'rate', rate,
        'room_amount', room_amt, 'my_days', my_days, 'all_days', all_days, 'my_share', coalesce(share, 0), 'dues', e_due, 'dues_list', e_list),
    'other_dues', o_due,
    'total_to_pay', greatest(unpaid + greatest(adj, 0) - credit, 0) + coalesce(share, 0) + e_due + o_due,
    'refund_due', refund);
END $$;
COMMENT ON FUNCTION hostel.fn_room_change_statement(varchar, smallint, date, numeric) IS 'What a room change does to the student''s money: hostel fee pro rata, the electricity share up to the move, dues carried over';

-- ---------------------------------------------------------------------
-- The move, by the Floor Warden or Chief Warden on the day: meter, Transfer, fee and electricity settlement.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hostel.fn_room_change_complete(p_change bigint, p_by varchar, p_reading numeric, p_key varchar) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE rc hostel.room_change%ROWTYPE; st record; s jsonb; v_exc bigint; v_alloc bigint; v_reg bigint; v_year varchar; v_fee bigint; v_meter bigint;
        adj numeric; credit numeric; d record; take numeric; v_hd bigint; v_ed bigint; share numeric; v_dir boolean;
BEGIN
  SELECT * INTO rc FROM hostel.room_change WHERE change_id = p_change FOR UPDATE;
  IF rc.change_id IS NULL THEN RAISE EXCEPTION 'Room change % not found', p_change USING ERRCODE = 'no_data_found'; END IF;
  IF rc.status <> 'Approved' THEN RAISE EXCEPTION 'Room change % is % and cannot be carried out', rc.change_no, lower(rc.status) USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO st FROM hostel.fn_student_stay(rc.student_id);
  IF st.hostel_alloc_id IS DISTINCT FROM rc.from_alloc_id THEN RAISE EXCEPTION 'The student no longer lives in the room the request was made from' USING ERRCODE = 'check_violation'; END IF;
  v_dir := EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = p_by AND ur.role_code = 'Director_Hostels');
  IF NOT (v_dir OR hostel.fn_staff_has_role(p_by, 'Chief_Warden', rc.facility_id)
          OR EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.staff_id = p_by AND a.hostel_role = 'Floor_Warden' AND a.status = 'Active'
                      AND a.facility_id = rc.facility_id AND (a.zone_id IS NULL OR a.zone_id = st.zone_id))) THEN
    RAISE EXCEPTION 'Only the Floor Warden of the student''s floor or the Chief Warden carries out the move' USING ERRCODE = 'check_violation';
  END IF;

  -- 1. the old room's meter on the day
  SELECT meter_id INTO v_meter FROM hostel.room_meter WHERE space_id = st.space_id AND status = 'Active' ORDER BY meter_id DESC LIMIT 1;
  IF v_meter IS NOT NULL AND p_reading IS NOT NULL THEN
    INSERT INTO hostel.meter_reading (meter_id, reading_at, reading_kwh, source, read_by, created_by) VALUES (v_meter, now(), p_reading, 'Handover', p_by, p_by);
  END IF;
  s := hostel.fn_room_change_statement(rc.student_id, rc.to_room_type_id, current_date, p_reading);

  -- 2. the move (Transfer exception of 100, decided by the Chief Warden who approved)
  UPDATE infra.subspace SET status = 'Vacant' WHERE subspace_id = rc.to_subspace_id AND status = 'Held';
  INSERT INTO hostel.allotment_exception (kind, facility_id, from_alloc_id, subspace_id, key_no, reason, requested_by, created_by)
  VALUES ('Transfer', rc.facility_id, rc.from_alloc_id, rc.to_subspace_id, nullif(btrim(p_key), ''), 'Room change ' || rc.change_no || ': ' || rc.reason, p_by, p_by)
  RETURNING exception_id INTO v_exc;
  UPDATE hostel.allotment_exception SET status = 'Approved', decided_by = rc.approved_by, decided_at = now(), decision_remarks = 'Room change ' || rc.change_no, updated_by = p_by
   WHERE exception_id = v_exc;
  SELECT hostel_alloc_id INTO v_alloc FROM hostel.allotment_exception WHERE exception_id = v_exc;

  -- 3. the registration and fee plan follow the new room type
  SELECT o.registration_id INTO v_reg FROM hostel.hostel_allocation a JOIN hostel.room_offer o ON o.offer_id = a.offer_id WHERE a.hostel_alloc_id = v_alloc;
  SELECT academic_year INTO v_year FROM hostel.academic_year WHERE is_current;
  SELECT fee_id INTO v_fee FROM hostel.room_type_fee WHERE facility_id = rc.facility_id AND room_type_id = rc.to_room_type_id AND academic_year = v_year;
  UPDATE hostel.hostel_registration SET room_type_id = rc.to_room_type_id, updated_by = p_by WHERE registration_id = v_reg AND room_type_id IS DISTINCT FROM rc.to_room_type_id;
  UPDATE hostel.fee_plan SET fee_id = v_fee, updated_by = p_by WHERE registration_id = v_reg AND fee_id IS DISTINCT FROM v_fee;

  -- 4. hostel fee: a demand for the difference, or a credit on the unpaid instalments (latest first), the rest a refund
  adj := (s -> 'hostel' ->> 'adjustment')::numeric;
  IF adj > 0 THEN
    INSERT INTO hostel.fee_demand (student_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (rc.student_id, 'Hostel', 1, adj, current_date + 15, 'room_change', rc.change_id, p_by) RETURNING demand_id INTO v_hd;
  ELSIF adj < 0 THEN
    credit := -adj;
    FOR d IN SELECT demand_id, amount_due, amount_paid FROM hostel.fee_demand
              WHERE student_id = rc.student_id AND fee_head = 'Hostel' AND status IN ('Pending', 'Part_Paid', 'Overdue') AND amount_due > amount_paid
              ORDER BY due_date DESC, demand_id DESC LOOP
      EXIT WHEN credit <= 0;
      take := least(credit, d.amount_due - d.amount_paid);
      UPDATE hostel.fee_demand SET amount_due = amount_due - take, updated_by = p_by,
             status = CASE WHEN amount_due - take <= amount_paid THEN 'Paid' ELSE status END
       WHERE demand_id = d.demand_id;
      credit := credit - take;
    END LOOP;
  END IF;

  -- 5. electricity up to the move
  share := (s -> 'electricity' ->> 'my_share')::numeric;
  IF share > 0 THEN
    INSERT INTO hostel.fee_demand (student_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (rc.student_id, 'Electricity', 1, share, current_date + 15, 'room_change', rc.change_id, p_by) RETURNING demand_id INTO v_ed;
  END IF;

  UPDATE hostel.room_change SET status = 'Moved', move_date = current_date, moved_by = p_by, meter_reading = p_reading, key_no = nullif(btrim(p_key), ''),
         exception_id = v_exc, new_alloc_id = v_alloc, hostel_adjustment = adj, hostel_demand_id = v_hd, refund_due = (s ->> 'refund_due')::numeric,
         elec_space_id = st.space_id, elec_month = date_trunc('month', current_date)::date, elec_amount = coalesce(share, 0), elec_demand_id = v_ed,
         statement = s, updated_by = p_by
   WHERE change_id = rc.change_id;
  INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
  VALUES ('Student', rc.student_id, 'In_App', 'ROOM_CHANGE', 'You have moved room',
          format('Room change %s done: you now live in %s. %s', rc.change_no, (SELECT bed_label FROM hostel.v_bed WHERE subspace_id = rc.to_subspace_id),
                 CASE WHEN adj > 0 THEN format('Hostel fee difference ₹%s is added to your fees.', adj) WHEN adj < 0 THEN format('₹%s of hostel fee is credited to you.', -adj) ELSE '' END),
          'room_change', rc.change_id::text);
  RETURN s;
END $$;
COMMENT ON FUNCTION hostel.fn_room_change_complete(bigint, varchar, numeric, varchar) IS 'Carries out an approved room change on the day: meter reading, move, hostel fee and electricity settlement';

-- ---------------------------------------------------------------------
-- 110 again: the month's electricity bills, now counting the share a student already paid on moving out of the room.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hostel.fn_generate_electricity_bills(p_month date) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE m0 date := date_trunc('month', p_month)::date; m1 date := (date_trunc('month', p_month) + interval '1 month')::date;
        u record; b bigint; n integer := 0; rate numeric; billable numeric; total numeric; tot_days numeric; s record; given numeric;
        v_settled numeric; rest numeric; rest_days numeric;
BEGIN
  PERFORM hostel.fn_rollup_meter_month(m0);
  FOR u IN SELECT mu.*, rm.space_id FROM hostel.meter_monthly_usage mu JOIN hostel.room_meter rm USING (meter_id)
            WHERE mu.usage_month = m0 AND mu.opening_reading IS NOT NULL AND mu.closing_reading IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM hostel.electricity_bill x WHERE x.meter_id = mu.meter_id AND x.bill_month = m0) LOOP
    SELECT t.rate_per_unit INTO rate FROM hostel.room_profile rp JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id
     WHERE rp.space_id = u.space_id AND t.approved_by IS NOT NULL AND m0 >= t.effective_from AND (t.effective_to IS NULL OR m0 <= t.effective_to)
     ORDER BY t.effective_from DESC LIMIT 1;
    CONTINUE WHEN rate IS NULL;
    billable := greatest(0, u.units_used - u.included_units - u.recharged_units);
    total := round(billable * rate, 2);
    INSERT INTO hostel.electricity_bill (meter_id, space_id, bill_month, opening_reading, closing_reading, included_units, recharged_units, billable_units, rate_per_unit, amount, issued_by)
    VALUES (u.meter_id, u.space_id, m0, u.opening_reading, u.closing_reading, u.included_units, u.recharged_units, billable, rate, total, 'system') RETURNING bill_id INTO b;

    CREATE TEMP TABLE IF NOT EXISTS _occ (student_id varchar(20), days numeric, settled numeric, demand_id bigint) ON COMMIT DROP;
    TRUNCATE _occ;
    INSERT INTO _occ (student_id, days)
    SELECT a.student_id, sum(least(coalesce(a.vacate_date + 1, m1), m1) - greatest(a.allocation_date, m0))
      FROM hostel.hostel_allocation a JOIN infra.subspace ss ON ss.subspace_id = a.subspace_id
     WHERE ss.space_id = u.space_id AND a.occupant_type = 'Student' AND a.status IN ('Active', 'Vacated', 'Transferred')
       AND a.allocation_date < m1 AND coalesce(a.vacate_date + 1, m1) > m0
     GROUP BY a.student_id HAVING sum(least(coalesce(a.vacate_date + 1, m1), m1) - greatest(a.allocation_date, m0)) > 0;
    -- 115: students who moved out of this room this month already paid their share on the day of the move
    UPDATE _occ o SET settled = x.amount, demand_id = x.demand_id
      FROM (SELECT student_id, sum(elec_amount) AS amount, max(elec_demand_id) AS demand_id FROM hostel.room_change
             WHERE status = 'Moved' AND elec_space_id = u.space_id AND elec_month = m0 GROUP BY student_id) x
     WHERE x.student_id = o.student_id;
    SELECT sum(days) INTO tot_days FROM _occ;
    CONTINUE WHEN tot_days IS NULL;
    UPDATE hostel.electricity_bill SET occupants = (SELECT count(*) FROM _occ) WHERE bill_id = b;
    SELECT coalesce(sum(o.settled), 0), coalesce(sum(o.days) FILTER (WHERE o.settled IS NULL), 0) INTO v_settled, rest_days FROM _occ o;
    rest := greatest(0, total - v_settled);

    given := 0;
    FOR s IN SELECT * FROM _occ ORDER BY settled IS NULL, student_id LOOP
      IF s.settled IS NOT NULL THEN
        INSERT INTO hostel.electricity_bill_share (bill_id, student_id, days_in_room, share_pct, units, amount, demand_id)
        VALUES (b, s.student_id, s.days, greatest(0.01, round(100 * s.days / tot_days, 2)), CASE WHEN total > 0 THEN round(billable * s.settled / total, 2) ELSE 0 END, s.settled, s.demand_id);
      ELSE
        INSERT INTO hostel.electricity_bill_share (bill_id, student_id, days_in_room, share_pct, units, amount)
        VALUES (b, s.student_id, s.days, round(100 * s.days / tot_days, 2), coalesce(round(billable * (rest / nullif(total, 0)) * s.days / rest_days, 2), 0), round(rest * s.days / rest_days, 2));
        given := given + round(rest * s.days / rest_days, 2);
      END IF;
    END LOOP;
    UPDATE hostel.electricity_bill_share SET amount = amount + (rest - given)
     WHERE share_id = (SELECT min(share_id) FROM hostel.electricity_bill_share WHERE bill_id = b AND demand_id IS NULL) AND rest <> given AND rest_days > 0;

    WITH d AS (
      INSERT INTO hostel.fee_demand (student_id, fee_head, instalment_no, amount_due, due_date, amount_paid, status, reference_type, reference_id, created_by)
      SELECT sh.student_id, 'Electricity', 1, sh.amount, m1 + 14, 0, 'Pending', 'electricity_bill_share', sh.share_id, 'system'
        FROM hostel.electricity_bill_share sh WHERE sh.bill_id = b AND sh.amount > 0 AND sh.demand_id IS NULL
      RETURNING demand_id, reference_id)
    UPDATE hostel.electricity_bill_share sh SET demand_id = d.demand_id FROM d WHERE sh.share_id = d.reference_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
COMMENT ON FUNCTION hostel.fn_generate_electricity_bills(date) IS 'Bills every metered room for the month and shares it among its occupants by days; a share paid on a room change counts as settled';

COMMIT;
