-- =====================================================================
-- 060  hostel — rules the database must enforce (Workflows A–F) and derived values nobody types
--      Everything here is a trigger or function; the static rules are constraints in 050–056.
-- =====================================================================

-- ---------- document numbers: HR-2026-00412, RC-2026-00001, OP-2026-00001 ----------
CREATE TABLE hostel.doc_counter (
  prefix   varchar(5) NOT NULL,
  year     smallint   NOT NULL,
  last_seq integer    NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);
CREATE OR REPLACE FUNCTION hostel.fn_next_doc_no(p_prefix varchar) RETURNS varchar LANGUAGE plpgsql AS $$
DECLARE v_year smallint := extract(year FROM current_date); v_seq integer;
BEGIN
  INSERT INTO hostel.doc_counter (prefix, year, last_seq) VALUES (p_prefix, v_year, 1)
  ON CONFLICT (prefix, year) DO UPDATE SET last_seq = hostel.doc_counter.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN p_prefix || '-' || v_year || '-' || lpad(v_seq::text, 5, '0');
END $$;

CREATE OR REPLACE FUNCTION hostel.fn_fill_doc_no() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'hostel_registration' THEN IF NEW.registration_no IS NULL THEN NEW.registration_no := hostel.fn_next_doc_no('HR'); END IF;
  ELSIF TG_TABLE_NAME = 'fee_receipt'      THEN IF NEW.receipt_no      IS NULL THEN NEW.receipt_no      := hostel.fn_next_doc_no('RC'); END IF;
  ELSIF TG_TABLE_NAME = 'outpass'          THEN IF NEW.outpass_no      IS NULL THEN NEW.outpass_no      := hostel.fn_next_doc_no('OP'); END IF;
  END IF;
  RETURN NEW;
END $$;
ALTER TABLE hostel.hostel_registration ALTER COLUMN registration_no DROP NOT NULL;
ALTER TABLE hostel.fee_receipt         ALTER COLUMN receipt_no      DROP NOT NULL;
ALTER TABLE hostel.outpass             ALTER COLUMN outpass_no      DROP NOT NULL;
CREATE TRIGGER trg_reg_no     BEFORE INSERT ON hostel.hostel_registration FOR EACH ROW EXECUTE FUNCTION hostel.fn_fill_doc_no();
CREATE TRIGGER trg_receipt_no BEFORE INSERT ON hostel.fee_receipt         FOR EACH ROW EXECUTE FUNCTION hostel.fn_fill_doc_no();
CREATE TRIGGER trg_outpass_no BEFORE INSERT ON hostel.outpass             FOR EACH ROW EXECUTE FUNCTION hostel.fn_fill_doc_no();
-- the numbers are still mandatory once the row exists
ALTER TABLE hostel.hostel_registration ADD CONSTRAINT ck_reg_no_present     CHECK (registration_no IS NOT NULL) NOT VALID;
ALTER TABLE hostel.fee_receipt         ADD CONSTRAINT ck_receipt_no_present CHECK (receipt_no IS NOT NULL) NOT VALID;
ALTER TABLE hostel.outpass             ADD CONSTRAINT ck_outpass_no_present CHECK (outpass_no IS NOT NULL) NOT VALID;

-- ---------- helpers: where does a bed / a student live ----------
CREATE OR REPLACE FUNCTION hostel.fn_bed_location(p_subspace_id varchar,
  OUT space_id varchar, OUT zone_id varchar, OUT facility_id varchar, OUT room_type_id smallint, OUT space_status infra.space_status, OUT bed_status infra.subspace_status)
LANGUAGE sql STABLE AS $$
  SELECT s.space_id, s.zone_id, z.facility_id, rp.room_type_id, s.status, ss.status
  FROM infra.subspace ss JOIN infra.space s ON s.space_id = ss.space_id JOIN infra.zone z ON z.zone_id = s.zone_id
  LEFT JOIN hostel.room_profile rp ON rp.space_id = s.space_id
  WHERE ss.subspace_id = p_subspace_id
$$;

CREATE OR REPLACE FUNCTION hostel.fn_student_stay(p_student_id varchar,
  OUT hostel_alloc_id bigint, OUT subspace_id varchar, OUT space_id varchar, OUT zone_id varchar, OUT facility_id varchar)
LANGUAGE sql STABLE AS $$
  SELECT a.hostel_alloc_id, a.subspace_id, s.space_id, s.zone_id, z.facility_id
  FROM hostel.hostel_allocation a JOIN infra.subspace ss ON ss.subspace_id = a.subspace_id
  JOIN infra.space s ON s.space_id = ss.space_id JOIN infra.zone z ON z.zone_id = s.zone_id
  WHERE a.student_id = p_student_id AND a.status = 'Active'
$$;

-- B rule: approvers are found by looking up Staff_Space_Assignment for the student's floor and hostel
CREATE OR REPLACE FUNCTION hostel.fn_find_approver(p_student_id varchar, p_role varchar) RETURNS varchar LANGUAGE sql STABLE AS $$
  SELECT ssa.staff_id
  FROM hostel.fn_student_stay(p_student_id) st
  JOIN hostel.staff_space_assignment ssa ON ssa.facility_id = st.facility_id AND ssa.hostel_role = p_role AND ssa.status = 'Active'
   AND (ssa.zone_id IS NULL OR ssa.zone_id = st.zone_id)
  ORDER BY ssa.zone_id NULLS LAST, ssa.from_date DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION hostel.fn_staff_has_role(p_staff_id varchar, p_role varchar, p_facility_id varchar) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM hostel.staff_space_assignment
                 WHERE staff_id = p_staff_id AND hostel_role = p_role AND facility_id = p_facility_id AND status = 'Active')
$$;

-- =====================================================================
-- Workflow A
-- =====================================================================
-- A: the student's gender must match Hostel_Gender; only one active registration flow at a time
CREATE OR REPLACE FUNCTION hostel.fn_registration_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_gender ref.gender; v_hostel_gender hostel.hostel_gender;
BEGIN
  SELECT gender INTO v_gender FROM ref.student_master WHERE student_id = NEW.student_id;
  SELECT hostel_gender INTO v_hostel_gender FROM hostel.hostel_profile WHERE facility_id = NEW.facility_id;
  IF NOT ((v_gender = 'Male' AND v_hostel_gender = 'Boys') OR (v_gender = 'Female' AND v_hostel_gender = 'Girls')) THEN
    RAISE EXCEPTION 'Student % (%) cannot register for a % hostel', NEW.student_id, v_gender, v_hostel_gender USING ERRCODE = 'check_violation';
  END IF;
  -- the registration fee demand is raised with the application
  IF TG_OP = 'INSERT' AND NEW.reg_demand_id IS NULL THEN
    INSERT INTO hostel.fee_demand (student_id, fee_head, amount_due, due_date, reference_type, created_by)
    SELECT NEW.student_id, 'Registration', rtf.registration_fee, current_date + 7, 'hostel_registration', NEW.created_by
    FROM hostel.room_type_fee rtf WHERE rtf.facility_id = NEW.facility_id AND rtf.room_type_id = NEW.room_type_id AND rtf.academic_year = NEW.academic_year
    RETURNING demand_id INTO NEW.reg_demand_id;
    IF NEW.reg_demand_id IS NULL THEN
      RAISE EXCEPTION 'No Room_Type_Fee for hostel %, room type %, year %', NEW.facility_id, NEW.room_type_id, NEW.academic_year USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_registration_before BEFORE INSERT OR UPDATE OF facility_id, student_id ON hostel.hostel_registration FOR EACH ROW EXECUTE FUNCTION hostel.fn_registration_before();

-- A: a Room_Offer is created only when the registration fee demand is Paid; the bed must be Vacant, not in a room
--    Under_Maintenance, in the chosen hostel and of the chosen room type; offering holds the bed
CREATE OR REPLACE FUNCTION hostel.fn_room_offer_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; d hostel.demand_status; loc record; v_hours numeric;
BEGIN
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  SELECT status INTO d FROM hostel.fee_demand WHERE demand_id = r.reg_demand_id;
  IF d IS DISTINCT FROM 'Paid' THEN
    RAISE EXCEPTION 'Registration % : registration fee is not paid (demand status %)', r.registration_no, d USING ERRCODE = 'check_violation';
  END IF;
  IF r.status NOT IN ('Fee_Paid','Waitlisted','Allotted') THEN
    RAISE EXCEPTION 'Registration % is % and cannot receive an offer', r.registration_no, r.status USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO loc FROM hostel.fn_bed_location(NEW.subspace_id);
  IF loc.space_status = 'Under_Maintenance' THEN RAISE EXCEPTION 'Bed % is in a room under maintenance', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.bed_status <> 'Vacant' THEN RAISE EXCEPTION 'Bed % is % and cannot be offered', NEW.subspace_id, loc.bed_status USING ERRCODE = 'check_violation'; END IF;
  IF loc.facility_id <> r.facility_id THEN RAISE EXCEPTION 'Bed % is not in hostel %', NEW.subspace_id, r.facility_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.room_type_id IS DISTINCT FROM r.room_type_id THEN RAISE EXCEPTION 'Bed % is not of the room type chosen', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE subspace_id = NEW.subspace_id AND status = 'Active') THEN
    RAISE EXCEPTION 'Bed % has an active allocation', NEW.subspace_id USING ERRCODE = 'check_violation';
  END IF;
  NEW.offer_no := coalesce((SELECT max(offer_no) FROM hostel.room_offer WHERE registration_id = NEW.registration_id), 0) + 1;
  SELECT amount INTO v_hours FROM shared.policy_setting WHERE setting_key = 'offer_hold_hours';
  NEW.hold_until := NEW.offered_on + make_interval(hours => coalesce(v_hours, 48)::int);
  UPDATE infra.subspace SET status = 'Held' WHERE subspace_id = NEW.subspace_id;
  UPDATE hostel.hostel_registration SET status = 'Allotted', waitlist_no = NULL WHERE registration_id = NEW.registration_id AND status <> 'Allotted';
  RETURN NEW;
END $$;
CREATE TRIGGER trg_room_offer_before_insert BEFORE INSERT ON hostel.room_offer FOR EACH ROW EXECUTE FUNCTION hostel.fn_room_offer_before_insert();

-- A: the student's decision releases the hold (Declined / Expired) or marks the registration Accepted
CREATE OR REPLACE FUNCTION hostel.fn_room_offer_decision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.student_decision <> 'Pending' THEN
    RAISE EXCEPTION 'Offer % was already decided (%)', OLD.offer_id, OLD.student_decision USING ERRCODE = 'check_violation';
  END IF;
  NEW.decision_on := coalesce(NEW.decision_on, now());
  IF NEW.student_decision IN ('Declined','Expired') THEN
    UPDATE infra.subspace SET status = 'Vacant' WHERE subspace_id = NEW.subspace_id AND status = 'Held';
    UPDATE hostel.hostel_registration SET status = 'Fee_Paid' WHERE registration_id = NEW.registration_id AND status = 'Allotted';
  ELSIF NEW.student_decision = 'Accepted' THEN
    IF now() > OLD.hold_until THEN RAISE EXCEPTION 'Offer % expired on %', OLD.offer_id, OLD.hold_until USING ERRCODE = 'check_violation'; END IF;
    UPDATE hostel.hostel_registration SET status = 'Accepted' WHERE registration_id = NEW.registration_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_room_offer_decision BEFORE UPDATE OF student_decision ON hostel.room_offer FOR EACH ROW
  WHEN (OLD.student_decision IS DISTINCT FROM NEW.student_decision) EXECUTE FUNCTION hostel.fn_room_offer_decision();

-- A: a Fee_Plan is created only for a registration whose offer is Accepted; it creates the hostel demands
--    (Single -> one demand; Two_Instalments -> exactly two). The mess demand is always one, raised with the subscription.
CREATE OR REPLACE FUNCTION hostel.fn_fee_plan_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; f hostel.room_type_fee%ROWTYPE; v_first numeric(12,2);
BEGIN
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  IF NOT EXISTS (SELECT 1 FROM hostel.room_offer WHERE registration_id = NEW.registration_id AND student_decision = 'Accepted') THEN
    RAISE EXCEPTION 'Registration % has no accepted room offer', r.registration_no USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO f FROM hostel.room_type_fee WHERE fee_id = NEW.fee_id;
  IF f.facility_id <> r.facility_id OR f.room_type_id <> r.room_type_id OR f.academic_year <> r.academic_year THEN
    RAISE EXCEPTION 'Fee % does not match the registration''s hostel, room type and year', NEW.fee_id USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.plan_type = 'Single' THEN
    INSERT INTO hostel.fee_demand (student_id, fee_plan_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (r.student_id, NEW.fee_plan_id, 'Hostel', 1, f.hostel_fee, current_date + 7, 'fee_plan', NEW.fee_plan_id, NEW.created_by);
  ELSE
    v_first := round(f.hostel_fee * f.instalment_1_pct / 100, 2);
    INSERT INTO hostel.fee_demand (student_id, fee_plan_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (r.student_id, NEW.fee_plan_id, 'Hostel', 1, v_first,                current_date + 7,       'fee_plan', NEW.fee_plan_id, NEW.created_by),
           (r.student_id, NEW.fee_plan_id, 'Hostel', 2, f.hostel_fee - v_first, f.instalment_2_due_date, 'fee_plan', NEW.fee_plan_id, NEW.created_by);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_fee_plan_after_insert AFTER INSERT ON hostel.fee_plan FOR EACH ROW EXECUTE FUNCTION hostel.fn_fee_plan_after_insert();

-- A: a second hostel instalment exists only on a Two_Instalments plan
CREATE OR REPLACE FUNCTION hostel.fn_fee_demand_before() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fee_head = 'Hostel' AND NEW.instalment_no = 2 AND NEW.fee_plan_id IS NOT NULL
     AND (SELECT plan_type FROM hostel.fee_plan WHERE fee_plan_id = NEW.fee_plan_id) = 'Single' THEN
    RAISE EXCEPTION 'A Single plan has only one hostel demand' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fee_demand_before BEFORE INSERT ON hostel.fee_demand FOR EACH ROW EXECUTE FUNCTION hostel.fn_fee_demand_before();

-- A: Amount_Paid is the sum of successful receipts (never typed); the demand and plan status follow from it
CREATE OR REPLACE FUNCTION hostel.fn_receipt_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_demand_id bigint := coalesce(NEW.demand_id, OLD.demand_id); d hostel.fee_demand%ROWTYPE; v_paid numeric(12,2);
BEGIN
  SELECT coalesce(sum(amount), 0) INTO v_paid FROM hostel.fee_receipt WHERE demand_id = v_demand_id AND gateway_status = 'Success';
  UPDATE hostel.fee_demand
     SET amount_paid = v_paid,
         status = CASE WHEN status = 'Waived' THEN 'Waived'
                       WHEN v_paid >= amount_due THEN 'Paid'
                       WHEN v_paid > 0 THEN 'Part_Paid'
                       WHEN due_date < current_date THEN 'Overdue' ELSE 'Pending' END::hostel.demand_status,
         updated_at = now()
   WHERE demand_id = v_demand_id RETURNING * INTO d;
  -- the registration moves on when its registration fee is paid
  IF d.fee_head = 'Registration' AND d.status = 'Paid' THEN
    UPDATE hostel.hostel_registration SET status = 'Fee_Paid' WHERE reg_demand_id = d.demand_id AND status = 'Applied';
  END IF;
  -- the plan is Fully_Paid when every demand on it is paid; the registration is then Confirmed
  IF d.fee_plan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hostel.fee_demand WHERE fee_plan_id = d.fee_plan_id AND status NOT IN ('Paid','Waived')) THEN
    UPDATE hostel.fee_plan SET status = 'Fully_Paid', updated_at = now() WHERE fee_plan_id = d.fee_plan_id AND status = 'Open';
    UPDATE hostel.hostel_registration r SET status = 'Confirmed'
      FROM hostel.fee_plan p WHERE p.fee_plan_id = d.fee_plan_id AND r.registration_id = p.registration_id AND r.status = 'Accepted';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_receipt_after AFTER INSERT OR UPDATE OF gateway_status, amount ON hostel.fee_receipt FOR EACH ROW EXECUTE FUNCTION hostel.fn_receipt_after();

-- A: receipts are immutable except for the gateway outcome (Pending -> Success / Failed)
CREATE OR REPLACE FUNCTION hostel.fn_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Receipts cannot be deleted; record a refund as a new row' USING ERRCODE = 'integrity_constraint_violation'; END IF;
  IF OLD.gateway_status <> 'Pending' OR (to_jsonb(NEW) - 'gateway_status' - 'gateway_ref') <> (to_jsonb(OLD) - 'gateway_status' - 'gateway_ref') THEN
    RAISE EXCEPTION 'Receipt % cannot be changed once recorded', OLD.receipt_no USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_receipt_guard BEFORE UPDATE OR DELETE ON hostel.fee_receipt FOR EACH ROW EXECUTE FUNCTION hostel.fn_receipt_guard();
-- the registration fee is never refundable
CREATE OR REPLACE FUNCTION hostel.fn_receipt_before() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT fee_head FROM hostel.fee_demand WHERE demand_id = NEW.demand_id) = 'Registration' THEN NEW.is_refundable := false; END IF;
  IF NEW.payment_mode IN ('Cash','DD') AND NEW.gateway_status = 'Pending' THEN NEW.gateway_status := 'Success'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_receipt_before BEFORE INSERT ON hostel.fee_receipt FOR EACH ROW EXECUTE FUNCTION hostel.fn_receipt_before();

-- A: check-in — the accepted offer becomes the stay; bed Occupied; student becomes hosteller; meter map opens (Workflow C)
CREATE OR REPLACE FUNCTION hostel.fn_allocation_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_meter bigint; loc record; v_open int;
BEGIN
  SELECT * INTO loc FROM hostel.fn_bed_location(NEW.subspace_id);
  IF NEW.occupant_type = 'Student' THEN
    IF NEW.offer_id IS NULL OR (SELECT student_decision FROM hostel.room_offer WHERE offer_id = NEW.offer_id) <> 'Accepted' THEN
      RAISE EXCEPTION 'A student allocation needs an Accepted room offer' USING ERRCODE = 'check_violation';
    END IF;
    IF (SELECT subspace_id FROM hostel.room_offer WHERE offer_id = NEW.offer_id) <> NEW.subspace_id THEN
      RAISE EXCEPTION 'Allocation bed differs from the offered bed' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE hostel.hostel_registration r SET status = 'Checked_In'
      FROM hostel.room_offer o WHERE o.offer_id = NEW.offer_id AND r.registration_id = o.registration_id;
    UPDATE ref.student_master SET is_hosteller = true WHERE student_id = NEW.student_id;
    INSERT INTO hostel.student_current_status (student_id, current_status) VALUES (NEW.student_id, 'In_Hostel')
      ON CONFLICT (student_id) DO UPDATE SET current_status = 'In_Hostel', updated_at = now();
  END IF;
  UPDATE infra.subspace SET status = 'Occupied' WHERE subspace_id = NEW.subspace_id;
  -- Workflow C: Meter_Student_Map is opened by check-in, not by hand; shares are split equally among open occupants
  SELECT meter_id INTO v_meter FROM hostel.room_meter WHERE space_id = loc.space_id AND status = 'Active';
  IF v_meter IS NOT NULL THEN
    INSERT INTO hostel.meter_student_map (meter_id, hostel_alloc_id, from_datetime, created_by)
    VALUES (v_meter, NEW.hostel_alloc_id, NEW.allocation_date::timestamptz, NEW.created_by);
    SELECT count(*) INTO v_open FROM hostel.meter_student_map WHERE meter_id = v_meter AND to_datetime IS NULL;
    UPDATE hostel.meter_student_map SET share_pct = round(100.0 / v_open, 2) WHERE meter_id = v_meter AND to_datetime IS NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_allocation_after_insert AFTER INSERT ON hostel.hostel_allocation FOR EACH ROW EXECUTE FUNCTION hostel.fn_allocation_after_insert();

-- A / N: vacating or transferring frees the bed, closes the meter map, updates the student
CREATE OR REPLACE FUNCTION hostel.fn_allocation_after_close() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_meter bigint; v_open int;
BEGIN
  UPDATE infra.subspace SET status = 'Vacant' WHERE subspace_id = NEW.subspace_id AND status = 'Occupied';
  UPDATE hostel.meter_student_map SET to_datetime = coalesce(NEW.vacate_date::timestamptz + interval '23:59', now()), updated_at = now()
    WHERE hostel_alloc_id = NEW.hostel_alloc_id AND to_datetime IS NULL RETURNING meter_id INTO v_meter;
  IF v_meter IS NOT NULL THEN
    SELECT count(*) INTO v_open FROM hostel.meter_student_map WHERE meter_id = v_meter AND to_datetime IS NULL;
    IF v_open > 0 THEN UPDATE hostel.meter_student_map SET share_pct = round(100.0 / v_open, 2) WHERE meter_id = v_meter AND to_datetime IS NULL; END IF;
  END IF;
  IF NEW.occupant_type = 'Student' AND NEW.status = 'Vacated' THEN
    UPDATE ref.student_master SET is_hosteller = false WHERE student_id = NEW.student_id;
    UPDATE hostel.hostel_registration r SET status = 'Vacated' FROM hostel.room_offer o
      WHERE o.offer_id = NEW.offer_id AND r.registration_id = o.registration_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_allocation_after_close AFTER UPDATE OF status ON hostel.hostel_allocation FOR EACH ROW
  WHEN (OLD.status = 'Active' AND NEW.status IN ('Vacated','Transferred')) EXECUTE FUNCTION hostel.fn_allocation_after_close();
CREATE OR REPLACE FUNCTION hostel.fn_allocation_before_close() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('Vacated','Transferred') AND NEW.vacate_date IS NULL THEN NEW.vacate_date := current_date; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_allocation_before_close BEFORE UPDATE OF status ON hostel.hostel_allocation FOR EACH ROW EXECUTE FUNCTION hostel.fn_allocation_before_close();

-- A: Total_Damage_Amount is the sum of the lines; at check-out a damage demand is raised for it
CREATE OR REPLACE FUNCTION hostel.fn_handover_line_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id bigint := coalesce(NEW.handover_id, OLD.handover_id); h hostel.room_handover%ROWTYPE; v_student varchar;
BEGIN
  UPDATE hostel.room_handover SET total_damage_amount = (SELECT coalesce(sum(damage_amount),0) FROM hostel.room_handover_line WHERE handover_id = v_id), updated_at = now()
   WHERE handover_id = v_id RETURNING * INTO h;
  IF h.handover_type = 'Check_Out' AND h.total_damage_amount > 0 THEN
    SELECT student_id INTO v_student FROM hostel.hostel_allocation WHERE hostel_alloc_id = h.hostel_alloc_id;
    IF v_student IS NOT NULL THEN
      INSERT INTO hostel.fee_demand (student_id, fee_head, amount_due, due_date, reference_type, reference_id, created_by)
      VALUES (v_student, 'Damage', h.total_damage_amount, current_date + 7, 'room_handover', h.handover_id, h.done_by)
      ON CONFLICT DO NOTHING;
      UPDATE hostel.fee_demand SET amount_due = h.total_damage_amount, updated_at = now()
       WHERE reference_type = 'room_handover' AND reference_id = h.handover_id AND status IN ('Pending','Overdue');
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_handover_line_after AFTER INSERT OR UPDATE OR DELETE ON hostel.room_handover_line FOR EACH ROW EXECUTE FUNCTION hostel.fn_handover_line_after();
CREATE UNIQUE INDEX ux_fee_demand_reference ON hostel.fee_demand (reference_type, reference_id) WHERE reference_type IN ('room_handover','meter_recharge','discipline_punishment');

-- A / C: the meter reading taken at a handover is also a Meter_Reading row (source = Handover)
CREATE OR REPLACE FUNCTION hostel.fn_handover_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_meter bigint;
BEGIN
  SELECT rm.meter_id INTO v_meter FROM hostel.hostel_allocation a JOIN infra.subspace ss ON ss.subspace_id = a.subspace_id
    JOIN hostel.room_meter rm ON rm.space_id = ss.space_id AND rm.status = 'Active' WHERE a.hostel_alloc_id = NEW.hostel_alloc_id;
  IF v_meter IS NOT NULL THEN
    INSERT INTO hostel.meter_reading (meter_id, reading_at, reading_kwh, source, read_by, handover_id, created_by)
    VALUES (v_meter, NEW.handover_on, NEW.meter_reading, 'Handover', NEW.done_by, NEW.handover_id, NEW.created_by);
  END IF;
  IF NEW.handover_type = 'Check_Out' THEN
    UPDATE hostel.hostel_allocation SET status = 'Vacated', vacate_date = NEW.handover_on::date, updated_by = NEW.done_by WHERE hostel_alloc_id = NEW.hostel_alloc_id AND status = 'Active';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_handover_after_insert AFTER INSERT ON hostel.room_handover FOR EACH ROW EXECUTE FUNCTION hostel.fn_handover_after_insert();

-- =====================================================================
-- Workflow C
-- =====================================================================
-- C: a reading cannot be lower than the previous reading of the same meter
CREATE OR REPLACE FUNCTION hostel.fn_meter_reading_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_prev numeric;
BEGIN
  SELECT reading_kwh INTO v_prev FROM hostel.meter_reading WHERE meter_id = NEW.meter_id AND reading_at < NEW.reading_at ORDER BY reading_at DESC LIMIT 1;
  IF v_prev IS NOT NULL AND NEW.reading_kwh < v_prev THEN
    RAISE EXCEPTION 'Meter % : reading % is lower than the previous reading %', NEW.meter_id, NEW.reading_kwh, v_prev USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM hostel.meter_reading WHERE meter_id = NEW.meter_id AND reading_at > NEW.reading_at AND reading_kwh < NEW.reading_kwh) THEN
    RAISE EXCEPTION 'Meter % : a later reading is lower than %', NEW.meter_id, NEW.reading_kwh USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_meter_reading_before BEFORE INSERT ON hostel.meter_reading FOR EACH ROW EXECUTE FUNCTION hostel.fn_meter_reading_before();
CREATE TRIGGER trg_meter_reading_immutable BEFORE UPDATE OR DELETE ON hostel.meter_reading FOR EACH ROW EXECUTE FUNCTION shared.fn_block_change();

-- C: Meter_Student_Map is opened and closed by check-in and check-out, not by hand
CREATE OR REPLACE FUNCTION hostel.fn_meter_map_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.system_write', true) IS DISTINCT FROM 'on' AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Meter_Student_Map is maintained by check-in and check-out only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_meter_map_guard BEFORE INSERT OR UPDATE OR DELETE ON hostel.meter_student_map FOR EACH ROW EXECUTE FUNCTION hostel.fn_meter_map_guard();

-- C: Units_Credited = amount paid / rate per unit of the room type's current tariff (never typed)
CREATE OR REPLACE FUNCTION hostel.fn_recharge_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_amount numeric; v_status hostel.gateway_status; v_rate numeric;
BEGIN
  SELECT amount, gateway_status INTO v_amount, v_status FROM hostel.fee_receipt WHERE receipt_id = NEW.receipt_id;
  IF v_status <> 'Success' THEN RAISE EXCEPTION 'A recharge exists only for a successful payment' USING ERRCODE = 'check_violation'; END IF;
  SELECT t.rate_per_unit INTO v_rate FROM hostel.room_meter rm JOIN hostel.room_profile rp ON rp.space_id = rm.space_id
    JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id AND current_date >= t.effective_from AND (t.effective_to IS NULL OR current_date <= t.effective_to)
   WHERE rm.meter_id = NEW.meter_id;
  IF v_rate IS NULL THEN RAISE EXCEPTION 'No current electricity tariff for meter %', NEW.meter_id USING ERRCODE = 'check_violation'; END IF;
  NEW.units_credited := round(v_amount / v_rate, 2);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_recharge_before BEFORE INSERT ON hostel.meter_recharge FOR EACH ROW EXECUTE FUNCTION hostel.fn_recharge_before();

-- C: monthly roll-up (run by the scheduler on the 1st): opening/closing reading, included and recharged units
CREATE OR REPLACE FUNCTION hostel.fn_rollup_meter_month(p_month date) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_from timestamptz := date_trunc('month', p_month); v_to timestamptz := date_trunc('month', p_month) + interval '1 month'; n integer;
BEGIN
  INSERT INTO hostel.meter_monthly_usage (meter_id, usage_month, opening_reading, closing_reading, included_units, recharged_units)
  SELECT rm.meter_id, v_from::date,
         (SELECT reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at <  v_from ORDER BY reading_at DESC LIMIT 1),
         (SELECT reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at <  v_to   ORDER BY reading_at DESC LIMIT 1),
         coalesce((SELECT t.included_units_per_month FROM hostel.room_profile rp JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id
                    AND v_from::date >= t.effective_from AND (t.effective_to IS NULL OR v_from::date <= t.effective_to) WHERE rp.space_id = rm.space_id), 0),
         coalesce((SELECT sum(units_credited) FROM hostel.meter_recharge mr WHERE mr.meter_id = rm.meter_id AND mr.status = 'Credited' AND mr.created_at >= v_from AND mr.created_at < v_to), 0)
  FROM hostel.room_meter rm WHERE rm.status = 'Active'
  ON CONFLICT (meter_id, usage_month) DO UPDATE SET opening_reading = EXCLUDED.opening_reading, closing_reading = EXCLUDED.closing_reading,
     included_units = EXCLUDED.included_units, recharged_units = EXCLUDED.recharged_units, computed_at = now()
  WHERE EXCLUDED.opening_reading IS NOT NULL AND EXCLUDED.closing_reading IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

-- =====================================================================
-- Workflow D
-- =====================================================================
-- D: no Movement_Event is stored for a student without a current Tracking_Consent
CREATE OR REPLACE FUNCTION hostel.fn_has_consent(p_student_id varchar) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM hostel.tracking_consent WHERE student_id = p_student_id AND withdrawn_on IS NULL)
$$;
CREATE OR REPLACE FUNCTION hostel.fn_movement_before() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT hostel.fn_has_consent(NEW.student_id) THEN
    RAISE EXCEPTION 'Student % has no current tracking consent; event not stored', NEW.student_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_movement_before BEFORE INSERT ON hostel.movement_event FOR EACH ROW EXECUTE FUNCTION hostel.fn_movement_before();

-- D: the parent who consents must be one of the student's own contacts
CREATE OR REPLACE FUNCTION hostel.fn_consent_before() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hostel.student_contact WHERE contact_id = NEW.contact_id AND student_id = NEW.student_id AND relation <> 'Self') THEN
    RAISE EXCEPTION 'Contact % is not a parent or guardian of student %', NEW.contact_id, NEW.student_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_consent_before BEFORE INSERT ON hostel.tracking_consent FOR EACH ROW EXECUTE FUNCTION hostel.fn_consent_before();

-- D / E: the latest event sets the status; an Out at a campus gate without an Approved outing raises No_Pass_Exit;
--        the gate exit and return are written back on the outpass; a late return raises Pass_Overdue
CREATE OR REPLACE FUNCTION hostel.fn_movement_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p hostel.capture_point%ROWTYPE; op hostel.outpass%ROWTYPE; v_status hostel.current_status; v_facility varchar; v_late int;
BEGIN
  SELECT * INTO p FROM hostel.capture_point WHERE point_id = NEW.point_id;
  SELECT facility_id INTO v_facility FROM hostel.fn_student_stay(NEW.student_id);
  v_facility := coalesce(v_facility, p.facility_id);
  IF p.point_type = 'Campus_Gate' AND NEW.direction = 'Out' THEN
    SELECT * INTO op FROM hostel.outpass WHERE student_id = NEW.student_id AND status = 'Approved' AND NEW.event_at BETWEEN leave_from - interval '2 hours' AND return_by ORDER BY leave_from LIMIT 1;
    IF op.outpass_id IS NULL THEN
      v_status := 'Outside_No_Pass';
      INSERT INTO hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to)
      VALUES ('No_Pass_Exit', NEW.student_id, v_facility, 'movement_event', NEW.event_id, 'Critical', hostel.fn_find_approver(NEW.student_id, 'Floor_Warden'));
    ELSE
      v_status := 'Outside_On_Pass';
      UPDATE hostel.outpass SET status = 'Out', actual_out_event_id = NEW.event_id, actual_out_at = NEW.event_at, updated_at = now() WHERE outpass_id = op.outpass_id;
    END IF;
  ELSIF p.point_type = 'Campus_Gate' AND NEW.direction = 'In' THEN
    SELECT * INTO op FROM hostel.outpass WHERE student_id = NEW.student_id AND status IN ('Out','Overdue') ORDER BY actual_out_at DESC LIMIT 1;
    IF op.outpass_id IS NOT NULL THEN
      v_late := greatest(0, floor(extract(epoch FROM (NEW.event_at - op.return_by)) / 60))::int;
      UPDATE hostel.outpass SET status = 'Returned', actual_in_event_id = NEW.event_id, actual_in_at = NEW.event_at,
             late_by_minutes = NULLIF(v_late, 0), updated_at = now() WHERE outpass_id = op.outpass_id;
      IF v_late > 0 THEN
        INSERT INTO hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to)
        VALUES ('Pass_Overdue', NEW.student_id, v_facility, 'outpass', op.outpass_id, 'Warning', hostel.fn_find_approver(NEW.student_id, 'Floor_Warden'));
      END IF;
    END IF;
    v_status := 'On_Campus';
  ELSIF p.point_type = 'Hostel_Gate' THEN
    v_status := CASE WHEN NEW.direction = 'In' THEN 'In_Hostel' ELSE 'On_Campus' END;
  ELSIF p.point_type = 'Room_Corridor' THEN
    v_status := CASE WHEN NEW.direction = 'In' THEN 'In_Room' ELSE 'In_Hostel' END;
  ELSE
    v_status := 'On_Campus';
  END IF;
  INSERT INTO hostel.student_current_status (student_id, current_status, last_event_id, last_event_at)
  VALUES (NEW.student_id, v_status, NEW.event_id, NEW.event_at)
  ON CONFLICT (student_id) DO UPDATE SET current_status = EXCLUDED.current_status, last_event_id = EXCLUDED.last_event_id, last_event_at = EXCLUDED.last_event_at, updated_at = now()
  WHERE hostel.student_current_status.last_event_at IS NULL OR EXCLUDED.last_event_at >= hostel.student_current_status.last_event_at;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_movement_after AFTER INSERT ON hostel.movement_event FOR EACH ROW EXECUTE FUNCTION hostel.fn_movement_after();

-- D: Movement_Event rows older than the retention period are deleted by a scheduled job
CREATE OR REPLACE FUNCTION hostel.fn_purge_movement_events() RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_days numeric; n bigint;
BEGIN
  SELECT amount INTO v_days FROM shared.policy_setting WHERE setting_key = 'movement_retention_days';
  PERFORM set_config('app.system_write', 'on', true);
  ALTER TABLE hostel.movement_event DISABLE TRIGGER trg_movement_immutable;
  DELETE FROM hostel.movement_event WHERE event_at < now() - make_interval(days => coalesce(v_days, 180)::int)
    AND event_id NOT IN (SELECT actual_out_event_id FROM hostel.outpass WHERE actual_out_event_id IS NOT NULL UNION SELECT actual_in_event_id FROM hostel.outpass WHERE actual_in_event_id IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  ALTER TABLE hostel.movement_event ENABLE TRIGGER trg_movement_immutable;
  INSERT INTO shared.audit_log (kind, outcome, actor, table_name, detail) VALUES ('purge movement events', 'allowed', 'scheduler', 'hostel.movement_event', jsonb_build_object('rows', n, 'retention_days', v_days));
  RETURN n;
END $$;

-- D: students outside after the hostel gate-close time, or not seen for a day, are reported (scheduled job)
CREATE OR REPLACE FUNCTION hostel.fn_raise_not_seen_alerts() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  INSERT INTO hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to)
  SELECT 'Not_Seen', s.student_id, st.facility_id, 'student_current_status', NULL, 'Warning', hostel.fn_find_approver(s.student_id, 'Floor_Warden')
  FROM hostel.student_current_status s JOIN hostel.fn_student_stay(s.student_id) st ON true
  WHERE (s.last_event_at IS NULL OR s.last_event_at < now() - interval '24 hours')
    AND s.current_status NOT IN ('Outside_On_Pass','On_Sick_Leave')
    AND NOT EXISTS (SELECT 1 FROM hostel.hostel_alert a WHERE a.student_id = s.student_id AND a.alert_type = 'Not_Seen' AND a.status <> 'Closed');
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

-- =====================================================================
-- Workflow E
-- =====================================================================
-- E: Outing_Category and Levels_Required are derived; a student with a punishment that bars outings cannot apply
CREATE OR REPLACE FUNCTION hostel.fn_outpass_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_levels smallint;
BEGIN
  NEW.outing_category := CASE WHEN (NEW.leave_from AT TIME ZONE 'Asia/Kolkata')::date = (NEW.return_by AT TIME ZONE 'Asia/Kolkata')::date THEN 'Same_Day' ELSE 'Day_Or_More' END;
  SELECT count(*) INTO v_levels FROM shared.approval_rule r
   WHERE r.request_type = 'Outpass' AND r.status = 'Active' AND r.level >= 1
     AND (r.condition_key IS NULL OR (r.condition_key = 'outing_category' AND r.condition_value = NEW.outing_category::text));
  NEW.levels_required := coalesce(nullif(v_levels, 0), 2);
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM hostel.discipline_punishment WHERE student_id = NEW.student_id AND status = 'In_Force' AND bars_outings
               AND from_date <= NEW.leave_from::date AND (to_date IS NULL OR to_date >= NEW.leave_from::date)) THEN
      RAISE EXCEPTION 'Student % has a punishment in force that bars outings', NEW.student_id USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = NEW.student_id AND status = 'Active') THEN
      RAISE EXCEPTION 'Student % is not a current hosteller', NEW.student_id USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM hostel.student_contact WHERE student_id = NEW.student_id AND is_outpass_approver AND is_verified AND status = 'Active') THEN
      RAISE EXCEPTION 'Student % has no verified parent or guardian marked as outpass approver', NEW.student_id USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_outpass_before BEFORE INSERT OR UPDATE OF leave_from, return_by ON hostel.outpass FOR EACH ROW EXECUTE FUNCTION hostel.fn_outpass_before();

-- E: on application the approval steps are created from the rules (level 0 parent, then 1..n)
CREATE OR REPLACE FUNCTION hostel.fn_outpass_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO shared.approval_step (request_type, request_id, level, rule_id, approver_role)
  SELECT 'Outpass', NEW.outpass_id, r.level, r.rule_id, r.approver_role
  FROM shared.approval_rule r
  WHERE r.request_type = 'Outpass' AND r.status = 'Active'
    AND (r.condition_key IS NULL OR (r.condition_key = 'outing_category' AND r.condition_value = NEW.outing_category::text))
  ORDER BY r.level;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_outpass_after_insert AFTER INSERT ON hostel.outpass FOR EACH ROW EXECUTE FUNCTION hostel.fn_outpass_after_insert();

-- E / F / N: levels are taken in order; a rejection ends the request; the parent step only by the verified approver contact;
--            the QR token is issued only after the final required level; the request status follows the steps
CREATE OR REPLACE FUNCTION hostel.fn_approval_step_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_student varchar; v_prev shared.decision; v_facility varchar;
BEGIN
  IF OLD.decision <> 'Pending' THEN RAISE EXCEPTION 'Step % was already decided', OLD.step_id USING ERRCODE = 'check_violation'; END IF;
  IF NEW.decision = 'Pending' THEN RETURN NEW; END IF;
  NEW.decided_on := coalesce(NEW.decided_on, now());
  -- previous level must be done
  SELECT decision INTO v_prev FROM shared.approval_step WHERE request_type = NEW.request_type AND request_id = NEW.request_id AND level < NEW.level ORDER BY level DESC LIMIT 1;
  IF v_prev IS NOT NULL AND v_prev NOT IN ('Approved','Recommended','Skipped') THEN
    RAISE EXCEPTION 'Level % cannot be taken before level % is approved', NEW.level, NEW.level - 1 USING ERRCODE = 'check_violation';
  END IF;
  -- who is acting
  IF NEW.request_type = 'Outpass' THEN SELECT student_id INTO v_student FROM hostel.outpass WHERE outpass_id = NEW.request_id;
  ELSIF NEW.request_type = 'Sick_Leave' THEN SELECT student_id INTO v_student FROM hostel.sick_leave WHERE sick_leave_id = NEW.request_id;
  ELSIF NEW.request_type = 'Vacate' THEN SELECT student_id INTO v_student FROM hostel.vacate_request WHERE vacate_id = NEW.request_id;
  END IF;
  IF NEW.approver_role = 'Parent' THEN
    IF NEW.acted_by_contact IS NULL OR NOT EXISTS (SELECT 1 FROM hostel.student_contact WHERE contact_id = NEW.acted_by_contact AND student_id = v_student AND is_outpass_approver AND is_verified AND status = 'Active') THEN
      RAISE EXCEPTION 'The parent step can be taken only by the verified contact marked as outpass approver' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.decision = 'Approved' THEN NEW.decision := 'Recommended'; END IF;
  ELSE
    IF NEW.acted_by IS NULL THEN RAISE EXCEPTION 'A staff member must be named for level %', NEW.level USING ERRCODE = 'check_violation'; END IF;
    SELECT facility_id INTO v_facility FROM hostel.fn_student_stay(v_student);
    IF v_facility IS NOT NULL AND NEW.approver_role IN ('Floor_Warden','Chief_Warden','Warden') AND NOT hostel.fn_staff_has_role(NEW.acted_by, NEW.approver_role, v_facility) THEN
      RAISE EXCEPTION 'Staff % is not an active % of hostel %', NEW.acted_by, NEW.approver_role, v_facility USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_approval_step_before BEFORE UPDATE OF decision ON shared.approval_step FOR EACH ROW EXECUTE FUNCTION hostel.fn_approval_step_before();

CREATE OR REPLACE FUNCTION hostel.fn_approval_step_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op hostel.outpass%ROWTYPE; v_done smallint;
BEGIN
  IF NEW.decision = 'Pending' THEN RETURN NULL; END IF;
  IF NEW.request_type = 'Outpass' THEN
    SELECT * INTO op FROM hostel.outpass WHERE outpass_id = NEW.request_id;
    IF NEW.decision = 'Rejected' THEN
      UPDATE hostel.outpass SET status = 'Rejected', updated_at = now() WHERE outpass_id = op.outpass_id;
      UPDATE shared.approval_step SET decision = 'Skipped', decided_on = now() WHERE request_type = 'Outpass' AND request_id = op.outpass_id AND level > NEW.level AND decision = 'Pending';
    ELSE
      SELECT count(*) INTO v_done FROM shared.approval_step WHERE request_type = 'Outpass' AND request_id = op.outpass_id AND level BETWEEN 1 AND op.levels_required AND decision = 'Approved';
      UPDATE hostel.outpass SET
        status = CASE WHEN v_done >= op.levels_required THEN 'Approved'
                      WHEN NEW.level = 0 THEN 'Parent_Recommended'
                      WHEN NEW.level = 1 THEN 'L1_Approved'
                      WHEN NEW.level = 2 THEN 'L2_Approved' ELSE status END,
        qr_token = CASE WHEN v_done >= op.levels_required THEN coalesce(qr_token, encode(gen_random_bytes(24), 'hex')) ELSE qr_token END,
        updated_at = now()
      WHERE outpass_id = op.outpass_id;
      IF v_done >= op.levels_required THEN
        INSERT INTO shared.notification (recipient_type, student_id, contact_id, channel, template_code, body, related_type, related_id)
        SELECT 'Parent', op.student_id, c.contact_id, 'SMS', 'OUTPASS_ISSUED',
               format('Outpass %s issued for %s: %s to %s.', op.outpass_no, op.student_id, to_char(op.leave_from AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI'), to_char(op.return_by AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI')),
               'outpass', op.outpass_id::text
        FROM hostel.student_contact c WHERE c.student_id = op.student_id AND c.is_outpass_approver AND c.status = 'Active';
      END IF;
    END IF;
  ELSIF NEW.request_type = 'Sick_Leave' THEN
    IF NEW.decision = 'Rejected' THEN
      UPDATE hostel.sick_leave SET status = 'Rejected', updated_at = now() WHERE sick_leave_id = NEW.request_id;
    ELSIF NEW.level = 1 THEN
      UPDATE hostel.sick_leave SET status = 'Recommended', updated_at = now() WHERE sick_leave_id = NEW.request_id AND status = 'Applied';
    ELSIF NEW.level = 2 THEN
      UPDATE hostel.sick_leave SET status = 'Approved', approved_by = NEW.acted_by, updated_at = now() WHERE sick_leave_id = NEW.request_id;
    END IF;
  ELSIF NEW.request_type = 'Vacate' THEN
    IF NEW.decision = 'Rejected' THEN
      UPDATE hostel.vacate_request SET status = 'Rejected', updated_at = now() WHERE vacate_id = NEW.request_id;
    ELSE
      UPDATE hostel.vacate_request v SET status = CASE WHEN (SELECT count(*) FROM shared.approval_step s WHERE s.request_type = 'Vacate' AND s.request_id = v.vacate_id AND s.decision = 'Approved') >= v.levels_required THEN 'Approved'
                                                       WHEN NEW.level = 1 THEN 'L1_Approved' WHEN NEW.level = 2 THEN 'L2_Approved' WHEN NEW.level = 3 THEN 'L3_Approved' ELSE status END, updated_at = now()
      WHERE vacate_id = NEW.request_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_approval_step_after AFTER UPDATE OF decision ON shared.approval_step FOR EACH ROW EXECUTE FUNCTION hostel.fn_approval_step_after();

-- E: a pass whose return time has passed while the student is Out becomes Overdue (scheduled job)
CREATE OR REPLACE FUNCTION hostel.fn_mark_overdue_outpasses() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  WITH upd AS (UPDATE hostel.outpass SET status = 'Overdue', updated_at = now() WHERE status = 'Out' AND return_by < now() RETURNING outpass_id, student_id)
  INSERT INTO hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to)
  SELECT 'Pass_Overdue', u.student_id, st.facility_id, 'outpass', u.outpass_id, 'Critical', hostel.fn_find_approver(u.student_id, 'Floor_Warden')
  FROM upd u JOIN hostel.fn_student_stay(u.student_id) st ON true;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE hostel.student_current_status s SET current_status = 'Overdue', updated_at = now()
    FROM hostel.outpass o WHERE o.student_id = s.student_id AND o.status = 'Overdue' AND s.current_status = 'Outside_On_Pass';
  UPDATE hostel.room_offer SET student_decision = 'Expired' WHERE student_decision = 'Pending' AND hold_until < now();
  RETURN n;
END $$;

-- =====================================================================
-- Workflow F
-- =====================================================================
-- F: steps are created on application; Recommended needs the Floor Warden's visit (constraint); only the Chief Warden can approve
CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO shared.approval_step (request_type, request_id, level, rule_id, approver_role)
  SELECT 'Sick_Leave', NEW.sick_leave_id, r.level, r.rule_id, r.approver_role FROM shared.approval_rule r
  WHERE r.request_type = 'Sick_Leave' AND r.status = 'Active' ORDER BY r.level;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_sick_leave_after_insert AFTER INSERT ON hostel.sick_leave FOR EACH ROW EXECUTE FUNCTION hostel.fn_sick_leave_after_insert();

CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_before_update() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_facility varchar;
BEGIN
  IF NEW.status = 'Approved' AND OLD.status <> 'Approved' THEN
    SELECT facility_id INTO v_facility FROM hostel.fn_student_stay(NEW.student_id);
    IF NEW.approved_by IS NULL OR NOT hostel.fn_staff_has_role(NEW.approved_by, 'Chief_Warden', v_facility) THEN
      RAISE EXCEPTION 'Only the Chief Warden of hostel % can approve a sick leave', v_facility USING ERRCODE = 'check_violation';
    END IF;
    NEW.room_meals_required := true;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sick_leave_before_update BEFORE UPDATE OF status ON hostel.sick_leave FOR EACH ROW EXECUTE FUNCTION hostel.fn_sick_leave_before_update();

-- F: once Approved, a Sick_Meal_Delivery row is expected for every slot of every day; status becomes On_Sick_Leave
CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_after_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status <> 'Approved' THEN
    INSERT INTO hostel.sick_meal_delivery (sick_leave_id, meal_date, slot, created_by)
    SELECT NEW.sick_leave_id, d::date, s, NEW.updated_by
    FROM generate_series(NEW.from_date, NEW.to_date, interval '1 day') d CROSS JOIN unnest(enum_range(NULL::hostel.meal_slot)) s
    ON CONFLICT DO NOTHING;
    INSERT INTO hostel.student_current_status (student_id, current_status) VALUES (NEW.student_id, 'On_Sick_Leave')
      ON CONFLICT (student_id) DO UPDATE SET current_status = 'On_Sick_Leave', updated_at = now();
  END IF;
  IF NEW.status = 'Closed' AND OLD.status <> 'Closed' THEN
    UPDATE hostel.sick_meal_delivery SET status = 'Not_Required' WHERE sick_leave_id = NEW.sick_leave_id AND status = 'Pending' AND meal_date > NEW.closed_on;
    UPDATE hostel.student_current_status SET current_status = 'In_Hostel', updated_at = now() WHERE student_id = NEW.student_id AND current_status = 'On_Sick_Leave';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_sick_leave_after_update AFTER UPDATE OF status ON hostel.sick_leave FOR EACH ROW EXECUTE FUNCTION hostel.fn_sick_leave_after_update();

-- F: a missing delivery raises a Sick_Meal_Missed alert (scheduled job after each slot)
CREATE OR REPLACE FUNCTION hostel.fn_flag_missed_sick_meals() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  WITH missed AS (
    UPDATE hostel.sick_meal_delivery d SET status = 'Missed', updated_at = now()
    FROM hostel.sick_leave sl
    WHERE d.sick_leave_id = sl.sick_leave_id AND sl.status = 'Approved' AND d.status = 'Pending'
      AND (d.meal_date + CASE d.slot WHEN 'Breakfast' THEN time '10:00' WHEN 'Lunch' THEN time '15:00' WHEN 'Evening_Snacks' THEN time '19:00' ELSE time '22:30' END) < (now() AT TIME ZONE 'Asia/Kolkata')
    RETURNING d.sick_leave_id, d.meal_date, d.slot, sl.student_id)
  INSERT INTO hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to)
  SELECT 'Sick_Meal_Missed', m.student_id, st.facility_id, 'sick_leave', m.sick_leave_id, 'Warning', hostel.fn_find_approver(m.student_id, 'Mess_Incharge')
  FROM missed m JOIN hostel.fn_student_stay(m.student_id) st ON true;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

-- =====================================================================
-- Fee overdue job (A): demands past due date become Overdue and raise Fee_Overdue alerts to the Chief Warden
-- =====================================================================
CREATE OR REPLACE FUNCTION hostel.fn_mark_overdue_fees() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  WITH upd AS (UPDATE hostel.fee_demand SET status = 'Overdue', updated_at = now() WHERE status IN ('Pending','Part_Paid') AND due_date < current_date RETURNING demand_id, student_id, fee_head)
  INSERT INTO hostel.hostel_alert (alert_type, student_id, facility_id, related_type, related_id, severity, assigned_to)
  SELECT (CASE WHEN u.fee_head = 'Hostel' THEN 'Instalment_Overdue' ELSE 'Fee_Overdue' END)::hostel.alert_type, u.student_id, st.facility_id, 'fee_demand', u.demand_id, 'Warning', hostel.fn_find_approver(u.student_id, 'Chief_Warden')
  FROM upd u JOIN hostel.fn_student_stay(u.student_id) st ON true;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

-- =====================================================================
-- updated_at and audit triggers on every hostel table that carries them
-- =====================================================================
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.table_schema, c.table_name FROM information_schema.columns c
           WHERE c.column_name = 'updated_at' AND c.table_schema IN ('hostel','shared','portal','infra')
             AND EXISTS (SELECT 1 FROM information_schema.tables x WHERE x.table_schema = c.table_schema AND x.table_name = c.table_name AND x.table_type = 'BASE TABLE')
  LOOP
    EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at()', t.table_schema, t.table_name);
  END LOOP;
  FOR t IN SELECT * FROM (VALUES
      ('hostel','hostel_registration','registration_id'), ('hostel','room_offer','offer_id'), ('hostel','hostel_allocation','hostel_alloc_id'),
      ('hostel','room_handover','handover_id'), ('hostel','fee_plan','fee_plan_id'), ('hostel','fee_demand','demand_id'), ('hostel','fee_receipt','receipt_id'),
      ('hostel','staff_space_assignment','assignment_id'), ('hostel','space_qr','qr_id'), ('hostel','room_meter','meter_id'), ('hostel','electricity_tariff','tariff_id'),
      ('hostel','meter_recharge','recharge_id'), ('hostel','tracking_consent','consent_id'), ('hostel','hostel_alert','alert_id'), ('hostel','outpass','outpass_id'),
      ('hostel','sick_leave','sick_leave_id'), ('hostel','student_contact','contact_id'), ('hostel','hostel_profile','facility_id'), ('hostel','room_type_fee','fee_id'),
      ('shared','approval_step','step_id'), ('shared','approval_rule','rule_id'), ('shared','policy_setting','setting_key')) AS v(s, t, k)
  LOOP
    EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row(%L)', t.s, t.t, t.k);
  END LOOP;
END $$;
