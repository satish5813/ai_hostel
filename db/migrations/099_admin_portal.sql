-- =====================================================================
-- 099  Administrator portal (Stage 1 of docs/flow-a-to-f.html), 3 Oct 2026.
--   * registration window per academic year: students can register only between the open and close dates
--   * due dates come from the policy settings (registration_fee_due_days, instalment_1_due_days), not a fixed 7 days
--   * fix: a meter can be recharged more than once (the reference index allowed one demand per meter)
-- =====================================================================

-- ---------- fix: several recharges per meter ----------
DROP INDEX IF EXISTS hostel.ux_fee_demand_reference;
CREATE UNIQUE INDEX ux_fee_demand_reference ON hostel.fee_demand (reference_type, reference_id) WHERE reference_type IN ('room_handover', 'discipline_punishment');

-- ---------- registration window ----------
ALTER TABLE hostel.academic_year ADD COLUMN IF NOT EXISTS registration_opens date, ADD COLUMN IF NOT EXISTS registration_closes date;
ALTER TABLE hostel.academic_year ADD CONSTRAINT ck_academic_year_window CHECK (registration_closes IS NULL OR registration_opens IS NULL OR registration_closes >= registration_opens);
COMMENT ON COLUMN hostel.academic_year.registration_opens IS 'First day students can apply for a hostel for this year. Empty: registration is not open.';
COMMENT ON COLUMN hostel.academic_year.registration_closes IS 'Last day students can apply. After it, only the hostel office can register a student.';
-- years that exist keep working: their window runs from 90 days before the year starts to its end
UPDATE hostel.academic_year SET registration_opens = start_date - 90, registration_closes = end_date WHERE registration_opens IS NULL;

-- ---------- due dates from policy ----------
CREATE OR REPLACE FUNCTION hostel.fn_policy_days(p_key text, p_default integer) RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT amount::int FROM shared.policy_setting WHERE setting_key = p_key), p_default)
$$;

CREATE OR REPLACE FUNCTION hostel.fn_registration_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_gender ref.gender; v_hostel_gender hostel.hostel_gender; y hostel.academic_year%ROWTYPE; v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  SELECT gender INTO v_gender FROM ref.student_master WHERE student_id = NEW.student_id;
  SELECT hostel_gender INTO v_hostel_gender FROM hostel.hostel_profile WHERE facility_id = NEW.facility_id;
  IF NOT ((v_gender = 'Male' AND v_hostel_gender = 'Boys') OR (v_gender = 'Female' AND v_hostel_gender = 'Girls')) THEN
    RAISE EXCEPTION 'Student % (%) cannot register for a % hostel', NEW.student_id, v_gender, v_hostel_gender USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- the student applies inside the window; the hostel office may still register a student after it closes
    SELECT * INTO y FROM hostel.academic_year WHERE academic_year = NEW.academic_year;
    IF NEW.created_by = NEW.student_id AND (y.registration_opens IS NULL OR v_today < y.registration_opens OR v_today > coalesce(y.registration_closes, 'infinity'::date)) THEN
      RAISE EXCEPTION '%', CASE WHEN y.registration_opens IS NULL THEN format('Hostel registration for %s is not open yet', NEW.academic_year)
                                ELSE format('Hostel registration for %s is open from %s to %s', NEW.academic_year, to_char(y.registration_opens, 'DD Mon YYYY'), to_char(y.registration_closes, 'DD Mon YYYY')) END
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  -- the registration fee demand is raised with the application
  IF TG_OP = 'INSERT' AND NEW.reg_demand_id IS NULL THEN
    INSERT INTO hostel.fee_demand (student_id, fee_head, amount_due, due_date, reference_type, created_by)
    SELECT NEW.student_id, 'Registration', rtf.registration_fee, current_date + hostel.fn_policy_days('registration_fee_due_days', 7), 'hostel_registration', NEW.created_by
    FROM hostel.room_type_fee rtf WHERE rtf.facility_id = NEW.facility_id AND rtf.room_type_id = NEW.room_type_id AND rtf.academic_year = NEW.academic_year
    RETURNING demand_id INTO NEW.reg_demand_id;
    IF NEW.reg_demand_id IS NULL THEN
      RAISE EXCEPTION 'No Room_Type_Fee for hostel %, room type %, year %', NEW.facility_id, NEW.room_type_id, NEW.academic_year USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION hostel.fn_fee_plan_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; f hostel.room_type_fee%ROWTYPE; v_first numeric(12,2); v_due date := current_date + hostel.fn_policy_days('instalment_1_due_days', 7);
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
    VALUES (r.student_id, NEW.fee_plan_id, 'Hostel', 1, f.hostel_fee, v_due, 'fee_plan', NEW.fee_plan_id, NEW.created_by);
  ELSE
    v_first := round(f.hostel_fee * f.instalment_1_pct / 100, 2);
    INSERT INTO hostel.fee_demand (student_id, fee_plan_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (r.student_id, NEW.fee_plan_id, 'Hostel', 1, v_first,                v_due,                   'fee_plan', NEW.fee_plan_id, NEW.created_by),
           (r.student_id, NEW.fee_plan_id, 'Hostel', 2, f.hostel_fee - v_first, f.instalment_2_due_date, 'fee_plan', NEW.fee_plan_id, NEW.created_by);
  END IF;
  RETURN NULL;
END $$;
