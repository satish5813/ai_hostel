-- =====================================================================
-- 118  Joining fees and renewal fees, 5 Oct 2026.
--   First year (joining):   Registration fee, Caution deposit, Electricity caution deposit, Hostel fee, Mess fee, Meter charge
--   Renewal (2nd year on):  Hostel fee, Mess fee, Meter charge only: no registration fee, no deposits (they are still held)
--   * room_type_fee gets the electricity caution deposit and the yearly electricity meter charge
--   * fee heads Electricity_Deposit (refundable, kept in the caution deposit account as its own kind) and Meter_Charge
--   * the deposits and the meter charge are raised with the hostel fee plan, so the stay is confirmed when all are paid
--   * a renewal registration is not charged the registration fee and goes straight to choosing the room
-- =====================================================================
ALTER TYPE hostel.fee_head ADD VALUE IF NOT EXISTS 'Electricity_Deposit';
ALTER TYPE hostel.fee_head ADD VALUE IF NOT EXISTS 'Meter_Charge';
COMMIT;
BEGIN;

ALTER TABLE hostel.room_type_fee ADD COLUMN IF NOT EXISTS elec_caution_deposit numeric(12,2) NOT NULL DEFAULT 2000 CHECK (elec_caution_deposit >= 0);
ALTER TABLE hostel.room_type_fee ADD COLUMN IF NOT EXISTS meter_charge numeric(12,2) NOT NULL DEFAULT 500 CHECK (meter_charge >= 0);
COMMENT ON COLUMN hostel.room_type_fee.elec_caution_deposit IS 'Refundable electricity caution deposit, paid once on joining; 0 = none';
COMMENT ON COLUMN hostel.room_type_fee.meter_charge IS 'Electricity meter charge for the year (meter rent and upkeep), paid every year; 0 = none';
COMMENT ON COLUMN hostel.room_type_fee.registration_fee IS 'One-time, non-refundable; charged on joining, not on renewal';

-- the deposit account keeps two kinds: the hostel caution deposit and the electricity caution deposit
ALTER TABLE hostel.caution_entry ADD COLUMN IF NOT EXISTS deposit_kind varchar(11) NOT NULL DEFAULT 'Hostel' CHECK (deposit_kind IN ('Hostel', 'Electricity'));
COMMENT ON COLUMN hostel.caution_entry.deposit_kind IS 'Which deposit the line belongs to: Hostel (caution deposit) or Electricity (electricity caution deposit)';

CREATE OR REPLACE VIEW hostel.v_caution_balance AS
SELECT student_id,
       coalesce(sum(amount) FILTER (WHERE entry_type IN ('Opening', 'Collected')), 0)::numeric(12,2) AS paid_in,
       coalesce(sum(amount) FILTER (WHERE entry_type = 'Deduction' AND status = 'Approved'), 0)::numeric(12,2) AS deducted,
       coalesce(sum(amount) FILTER (WHERE entry_type = 'Refund'), 0)::numeric(12,2) AS refunded,
       coalesce(sum(amount) FILTER (WHERE entry_type = 'Deduction' AND status = 'Proposed'), 0)::numeric(12,2) AS proposed,
       coalesce(sum(CASE WHEN entry_type IN ('Opening', 'Collected') THEN amount WHEN entry_type = 'Refund' OR (entry_type = 'Deduction' AND status = 'Approved') THEN -amount ELSE 0 END), 0)::numeric(12,2) AS balance,
       max(created_at) AS last_entry_at,
       coalesce(sum(CASE WHEN entry_type IN ('Opening', 'Collected') THEN amount WHEN entry_type = 'Refund' OR (entry_type = 'Deduction' AND status = 'Approved') THEN -amount ELSE 0 END) FILTER (WHERE deposit_kind = 'Hostel'), 0)::numeric(12,2) AS hostel_balance,
       coalesce(sum(CASE WHEN entry_type IN ('Opening', 'Collected') THEN amount WHEN entry_type = 'Refund' OR (entry_type = 'Deduction' AND status = 'Approved') THEN -amount ELSE 0 END) FILTER (WHERE deposit_kind = 'Electricity'), 0)::numeric(12,2) AS elec_balance
FROM hostel.caution_entry GROUP BY student_id;

CREATE OR REPLACE FUNCTION hostel.fn_caution_balance(p_student varchar, p_kind varchar) RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT CASE p_kind WHEN 'Electricity' THEN elec_balance ELSE hostel_balance END FROM hostel.v_caution_balance WHERE student_id = p_student), 0)
$$;

-- 116 again: what is taken out can never be more than what is held of that deposit
DO $do$
DECLARE s text;
BEGIN
  s := pg_get_functiondef('hostel.fn_caution_entry_before()'::regprocedure);
  s := replace(s, 'v_bal := hostel.fn_caution_balance(NEW.student_id);', 'v_bal := hostel.fn_caution_balance(NEW.student_id, NEW.deposit_kind);');
  s := replace(s, 'Only ₹% of caution deposit is held for this student; ₹% cannot be taken', 'Only ₹% of this deposit is held for the student; ₹% cannot be taken');
  EXECUTE s;
END $do$;

-- a successful receipt against either deposit demand is the "Collected" line of that kind
CREATE OR REPLACE FUNCTION hostel.fn_caution_from_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d hostel.fee_demand%ROWTYPE;
BEGIN
  IF NEW.gateway_status <> 'Success' OR (TG_OP = 'UPDATE' AND OLD.gateway_status = 'Success') THEN RETURN NULL; END IF;
  SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = NEW.demand_id;
  IF d.fee_head NOT IN ('Caution_Deposit', 'Electricity_Deposit') THEN RETURN NULL; END IF;
  PERFORM set_config('hostel.caution_receipt', 'on', true);
  INSERT INTO hostel.caution_entry (student_id, entry_type, deposit_kind, amount, reason, receipt_id, demand_id, created_by)
  VALUES (d.student_id, 'Collected', CASE WHEN d.fee_head = 'Electricity_Deposit' THEN 'Electricity' ELSE 'Hostel' END, NEW.amount,
          CASE WHEN d.fee_head = 'Electricity_Deposit' THEN 'Electricity caution deposit' ELSE 'Caution deposit' END || ' paid, receipt ' || NEW.receipt_no || ' (' || NEW.payment_mode || ')',
          NEW.receipt_id, d.demand_id, coalesce(NEW.created_by, 'system'))
  ON CONFLICT DO NOTHING;
  PERFORM set_config('hostel.caution_receipt', '', true);
  RETURN NULL;
END $$;

-- with the hostel fee plan: the two deposits once (on joining, while none is held or asked), the meter charge every year
CREATE OR REPLACE FUNCTION hostel.fn_caution_demand() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; f hostel.room_type_fee%ROWTYPE; v_due date := current_date + hostel.fn_policy_days('instalment_1_due_days', 7);
BEGIN
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  SELECT * INTO f FROM hostel.room_type_fee WHERE fee_id = NEW.fee_id;
  -- a renewal never raises the deposits: they were paid on joining (or held from before the system)
  IF r.renewal_of IS NULL AND f.caution_deposit > 0 AND hostel.fn_caution_balance(r.student_id, 'Hostel') = 0
     AND NOT EXISTS (SELECT 1 FROM hostel.fee_demand WHERE student_id = r.student_id AND fee_head = 'Caution_Deposit' AND status IN ('Pending', 'Part_Paid', 'Overdue')) THEN
    INSERT INTO hostel.fee_demand (student_id, fee_plan_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (r.student_id, NEW.fee_plan_id, 'Caution_Deposit', 1, f.caution_deposit, v_due, 'caution_deposit', NEW.fee_plan_id, NEW.created_by);
  END IF;
  IF r.renewal_of IS NULL AND f.elec_caution_deposit > 0 AND hostel.fn_caution_balance(r.student_id, 'Electricity') = 0
     AND NOT EXISTS (SELECT 1 FROM hostel.fee_demand WHERE student_id = r.student_id AND fee_head = 'Electricity_Deposit' AND status IN ('Pending', 'Part_Paid', 'Overdue')) THEN
    INSERT INTO hostel.fee_demand (student_id, fee_plan_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (r.student_id, NEW.fee_plan_id, 'Electricity_Deposit', 1, f.elec_caution_deposit, v_due, 'caution_deposit', NEW.fee_plan_id, NEW.created_by);
  END IF;
  IF f.meter_charge > 0 THEN
    INSERT INTO hostel.fee_demand (student_id, fee_plan_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
    VALUES (r.student_id, NEW.fee_plan_id, 'Meter_Charge', 1, f.meter_charge, v_due, 'fee_plan', NEW.fee_plan_id, NEW.created_by);
  END IF;
  RETURN NULL;
END $$;

-- unpaid dues paid from a deposit: an electricity bill from the electricity deposit first, anything else from the caution deposit
CREATE OR REPLACE FUNCTION hostel.fn_caution_pay_due(p_student varchar, p_demand bigint, p_by varchar) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE d hostel.fee_demand%ROWTYPE; v_kind varchar; v_amt numeric; v_rec bigint; v_no text; v_entry bigint;
BEGIN
  SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = p_demand FOR UPDATE;
  IF d.student_id IS DISTINCT FROM p_student THEN RAISE EXCEPTION 'Demand % is not this student''s', p_demand USING ERRCODE = 'check_violation'; END IF;
  IF d.fee_head IN ('Caution_Deposit', 'Electricity_Deposit') THEN RAISE EXCEPTION 'A deposit cannot pay a deposit' USING ERRCODE = 'check_violation'; END IF;
  IF d.status NOT IN ('Pending', 'Part_Paid', 'Overdue') THEN RAISE EXCEPTION 'Demand % is %', p_demand, d.status USING ERRCODE = 'check_violation'; END IF;
  v_kind := CASE WHEN d.fee_head IN ('Electricity', 'Meter_Charge') AND hostel.fn_caution_balance(p_student, 'Electricity') > 0 THEN 'Electricity' ELSE 'Hostel' END;
  v_amt := least(d.amount_due - d.amount_paid, hostel.fn_caution_balance(p_student, v_kind));
  IF v_amt <= 0 THEN RAISE EXCEPTION 'No deposit is held for this student' USING ERRCODE = 'check_violation'; END IF;
  INSERT INTO hostel.fee_receipt (demand_id, amount, payment_mode, gateway_status, is_refundable, created_by)
  VALUES (p_demand, v_amt, 'Caution_Deposit', 'Success', false, p_by) RETURNING receipt_id, receipt_no INTO v_rec, v_no;
  INSERT INTO hostel.caution_entry (student_id, entry_type, deposit_kind, category, amount, reason, status, demand_id, receipt_id, proposed_by, decided_by, decided_at, created_by)
  VALUES (p_student, 'Deduction', v_kind, 'Unpaid_Dues', v_amt,
          format('Unpaid %s due %s paid from the %s (receipt %s)', replace(d.fee_head::text, '_', ' '), to_char(d.due_date, 'DD Mon YYYY'),
                 CASE v_kind WHEN 'Electricity' THEN 'electricity caution deposit' ELSE 'caution deposit' END, v_no),
          'Approved', p_demand, v_rec, p_by, p_by, now(), p_by)
  RETURNING entry_id INTO v_entry;
  RETURN v_entry;
END $$;

-- the registration fee only on joining
CREATE OR REPLACE FUNCTION hostel.fn_registration_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_gender ref.gender; v_hostel_gender hostel.hostel_gender; y hostel.academic_year%ROWTYPE; v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
        prev hostel.hostel_registration%ROWTYPE; v_open boolean;
BEGIN
  SELECT gender INTO v_gender FROM ref.student_master WHERE student_id = NEW.student_id;
  SELECT hostel_gender INTO v_hostel_gender FROM hostel.hostel_profile WHERE facility_id = NEW.facility_id;
  IF NOT ((v_gender = 'Male' AND v_hostel_gender = 'Boys') OR (v_gender = 'Female' AND v_hostel_gender = 'Girls')) THEN
    RAISE EXCEPTION 'Student % (%) cannot register for a % hostel', NEW.student_id, v_gender, v_hostel_gender USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO y FROM hostel.academic_year WHERE academic_year = NEW.academic_year;
    IF NEW.renewal_of IS NOT NULL THEN
      SELECT * INTO prev FROM hostel.hostel_registration WHERE registration_id = NEW.renewal_of;
      IF prev.student_id IS DISTINCT FROM NEW.student_id OR prev.status <> 'Checked_In' THEN
        RAISE EXCEPTION 'Only a resident can renew their own registration' USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.retain_subspace_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = NEW.student_id AND subspace_id = NEW.retain_subspace_id AND status = 'Active') THEN
        RAISE EXCEPTION 'A student can keep only the bed they live in' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    v_open := (v_today BETWEEN y.registration_opens AND coalesce(y.registration_closes, 'infinity'::date))
           OR (NEW.renewal_of IS NOT NULL AND v_today BETWEEN y.renewal_opens AND coalesce(y.renewal_closes, 'infinity'::date));
    IF NEW.created_by = NEW.student_id AND NOT coalesce(v_open, false) THEN
      RAISE EXCEPTION '%', CASE
        WHEN NEW.renewal_of IS NOT NULL AND y.renewal_opens IS NOT NULL THEN format('Renewal for %s is open from %s to %s', NEW.academic_year, to_char(y.renewal_opens, 'DD Mon YYYY'), to_char(y.renewal_closes, 'DD Mon YYYY'))
        WHEN y.registration_opens IS NULL THEN format('Hostel registration for %s is not open yet', NEW.academic_year)
        ELSE format('Hostel registration for %s is open from %s to %s', NEW.academic_year, to_char(y.registration_opens, 'DD Mon YYYY'), to_char(y.registration_closes, 'DD Mon YYYY')) END
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.reg_demand_id IS NULL THEN
    -- 118: the registration fee is paid once, on joining; a renewal is not charged it (a waived ₹0 line keeps the steps in order)
    INSERT INTO hostel.fee_demand (student_id, fee_head, amount_due, due_date, status, reference_type, created_by)
    SELECT NEW.student_id, 'Registration', CASE WHEN NEW.renewal_of IS NULL THEN rtf.registration_fee ELSE 0 END,
           current_date + hostel.fn_policy_days('registration_fee_due_days', 7),
           (CASE WHEN NEW.renewal_of IS NULL THEN 'Pending' ELSE 'Waived' END)::hostel.demand_status, 'hostel_registration', NEW.created_by
    FROM hostel.room_type_fee rtf WHERE rtf.facility_id = NEW.facility_id AND rtf.room_type_id = NEW.room_type_id AND rtf.academic_year = NEW.academic_year
    RETURNING demand_id INTO NEW.reg_demand_id;
    IF NEW.reg_demand_id IS NULL THEN
      RAISE EXCEPTION 'No fee is set for this hostel and room type in %', NEW.academic_year USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.renewal_of IS NOT NULL AND NEW.status = 'Applied' THEN NEW.status := 'Fee_Paid'; END IF;
  END IF;
  RETURN NEW;
END $$;

COMMIT;
