-- =====================================================================
-- 116  Caution deposit, 5 Oct 2026.
--   A refundable deposit each resident pays once, kept until they leave. The money is collected like any fee (the
--   payment gateway, cash or bank transfer into the university's account); the system keeps each student's deposit
--   account in hostel.caution_entry, every line with its reason:
--     Opening     a deposit already held before this system (entered by Accounts)
--     Collected   paid against the Caution_Deposit fee demand (written by the receipt, never by hand)
--     Deduction   damage, a lost key, missing items, a fine ...: proposed by a warden or Accounts with the reason,
--                 approved by the Chief Warden of the hostel (or the Director, Hostels), never by the one who proposed it;
--                 unpaid dues are taken by Accounts directly, and the dues are paid by that same entry
--     Refund      the balance returned when the student leaves, with the bank transfer reference
--   A deduction or refund can never take the balance below zero. Nothing is deleted; a mistake is put right by a new line.
-- =====================================================================
ALTER TYPE hostel.fee_head ADD VALUE IF NOT EXISTS 'Caution_Deposit';
ALTER TYPE hostel.payment_mode ADD VALUE IF NOT EXISTS 'Caution_Deposit';
COMMIT;
BEGIN;

ALTER TABLE hostel.room_type_fee ADD COLUMN IF NOT EXISTS caution_deposit numeric(12,2) NOT NULL DEFAULT 10000 CHECK (caution_deposit >= 0);
COMMENT ON COLUMN hostel.room_type_fee.caution_deposit IS 'Refundable caution deposit for this room type, paid once on taking a room; 0 = none';

CREATE TABLE hostel.caution_entry (
  entry_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_no         varchar(20) UNIQUE,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master,
  facility_id      varchar(30) REFERENCES hostel.hostel_profile,
  entry_type       varchar(10) NOT NULL CHECK (entry_type IN ('Opening', 'Collected', 'Deduction', 'Refund')),
  category         varchar(14) CHECK (category IN ('Damage', 'Missing_Item', 'Key_Lost', 'Cleaning', 'Fine', 'Unpaid_Dues', 'Other')),
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  reason           text NOT NULL CHECK (length(btrim(reason)) >= 5),
  status           varchar(9) NOT NULL DEFAULT 'Done' CHECK (status IN ('Proposed', 'Approved', 'Rejected', 'Done')),
  receipt_id       bigint REFERENCES hostel.fee_receipt,
  demand_id        bigint REFERENCES hostel.fee_demand,
  handover_id      bigint REFERENCES hostel.room_handover,
  refund_mode      varchar(8) CHECK (refund_mode IN ('NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque')),
  refund_ref       varchar(60),
  refund_account   varchar(60),
  proposed_by      varchar(20),
  proposed_at      timestamptz NOT NULL DEFAULT now(),
  decided_by       varchar(20),
  decided_at       timestamptz,
  decision_remarks text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20),
  CHECK ((entry_type = 'Deduction') = (category IS NOT NULL)),
  CHECK (entry_type = 'Deduction' OR status = 'Done'),
  CHECK (entry_type <> 'Deduction' OR status <> 'Done'),
  CHECK (entry_type <> 'Collected' OR receipt_id IS NOT NULL),
  CHECK (entry_type <> 'Refund' OR (refund_mode IS NOT NULL AND length(btrim(coalesce(refund_ref, ''))) >= 4)),
  CHECK (category IS DISTINCT FROM 'Unpaid_Dues' OR demand_id IS NOT NULL),
  CHECK (status NOT IN ('Approved', 'Rejected') OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)),
  CHECK (status <> 'Rejected' OR length(btrim(coalesce(decision_remarks, ''))) >= 3)
);
CREATE INDEX ix_caution_entry_student ON hostel.caution_entry (student_id, entry_id);
CREATE INDEX ix_caution_entry_proposed ON hostel.caution_entry (facility_id) WHERE status = 'Proposed';
CREATE UNIQUE INDEX ux_caution_entry_receipt ON hostel.caution_entry (receipt_id) WHERE receipt_id IS NOT NULL;
COMMENT ON TABLE hostel.caution_entry IS 'Each student''s caution deposit account, line by line with the reason: held, collected, deducted (approved), refunded';
CREATE TRIGGER trg_audit_caution_entry AFTER INSERT OR UPDATE OR DELETE ON hostel.caution_entry FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('entry_id');

-- the balance: what is held now; deductions waiting for approval are shown apart and not yet taken
CREATE OR REPLACE VIEW hostel.v_caution_balance AS
SELECT student_id,
       coalesce(sum(amount) FILTER (WHERE entry_type IN ('Opening', 'Collected')), 0)::numeric(12,2) AS paid_in,
       coalesce(sum(amount) FILTER (WHERE entry_type = 'Deduction' AND status = 'Approved'), 0)::numeric(12,2) AS deducted,
       coalesce(sum(amount) FILTER (WHERE entry_type = 'Refund'), 0)::numeric(12,2) AS refunded,
       coalesce(sum(amount) FILTER (WHERE entry_type = 'Deduction' AND status = 'Proposed'), 0)::numeric(12,2) AS proposed,
       (coalesce(sum(amount) FILTER (WHERE entry_type IN ('Opening', 'Collected')), 0)
        - coalesce(sum(amount) FILTER (WHERE entry_type = 'Deduction' AND status = 'Approved'), 0)
        - coalesce(sum(amount) FILTER (WHERE entry_type = 'Refund'), 0))::numeric(12,2) AS balance,
       max(created_at) AS last_entry_at
FROM hostel.caution_entry GROUP BY student_id;
COMMENT ON VIEW hostel.v_caution_balance IS 'Caution deposit held per student: paid in - approved deductions - refunds';

CREATE OR REPLACE FUNCTION hostel.fn_caution_balance(p_student varchar) RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT balance FROM hostel.v_caution_balance WHERE student_id = p_student), 0)
$$;

CREATE OR REPLACE FUNCTION hostel.fn_caution_entry_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_bal numeric; v_ok boolean; v_fac varchar; v_staff_role boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Caution deposit lines cannot be deleted; add a line to put a mistake right' USING ERRCODE = 'integrity_constraint_violation'; END IF;
  -- one student at a time, so two deductions or refunds cannot both pass the balance check
  PERFORM pg_advisory_xact_lock(hashtext('caution:' || NEW.student_id));
  IF TG_OP = 'INSERT' THEN
    NEW.entry_no := 'CD-' || to_char(now(), 'YYYY') || '-' || lpad(NEW.entry_id::text, 5, '0');
    NEW.facility_id := coalesce(NEW.facility_id, (SELECT facility_id FROM hostel.fn_student_stay(NEW.student_id)),
                               (SELECT b.facility_id FROM hostel.hostel_allocation a JOIN hostel.v_bed b ON b.subspace_id = a.subspace_id
                                 WHERE a.student_id = NEW.student_id ORDER BY a.allocation_date DESC LIMIT 1));
    NEW.proposed_by := coalesce(NEW.proposed_by, NEW.created_by);
    IF NEW.entry_type = 'Collected' AND current_setting('hostel.caution_receipt', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'A collected deposit is written by its fee receipt' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.entry_type = 'Deduction' AND NEW.status NOT IN ('Proposed', 'Approved') THEN NEW.status := 'Proposed'; END IF;
    IF NEW.entry_type = 'Deduction' AND NEW.status = 'Approved' AND NEW.category <> 'Unpaid_Dues' THEN
      RAISE EXCEPTION 'A deduction is proposed first and approved by the Chief Warden' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.entry_type = 'Deduction' AND length(btrim(NEW.reason)) < 10 THEN
      RAISE EXCEPTION 'Say what the deduction is for (at least 10 letters)' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.entry_type = 'Refund' THEN
      IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = NEW.student_id AND status = 'Active')
         AND NOT EXISTS (SELECT 1 FROM hostel.vacate_request WHERE student_id = NEW.student_id AND status IN ('Approved', 'Checked_Out')) THEN
        RAISE EXCEPTION 'The deposit is refunded when the student leaves: vacating is not approved yet' USING ERRCODE = 'check_violation';
      END IF;
      IF EXISTS (SELECT 1 FROM hostel.caution_entry WHERE student_id = NEW.student_id AND status = 'Proposed') THEN
        RAISE EXCEPTION 'A deduction is waiting for the Chief Warden: decide it before refunding' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  ELSE
    IF (to_jsonb(NEW) - 'status' - 'decided_by' - 'decided_at' - 'decision_remarks') <> (to_jsonb(OLD) - 'status' - 'decided_by' - 'decided_at' - 'decision_remarks') THEN
      RAISE EXCEPTION 'Caution deposit line % cannot be changed; add a line to put a mistake right', OLD.entry_no USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    IF OLD.status <> 'Proposed' OR NEW.status NOT IN ('Approved', 'Rejected') THEN
      RAISE EXCEPTION 'This deduction was already %', lower(OLD.status) USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.decided_by IS NOT DISTINCT FROM OLD.proposed_by THEN
      RAISE EXCEPTION 'The one who proposed a deduction cannot approve it' USING ERRCODE = 'check_violation';
    END IF;
    v_ok := hostel.fn_staff_has_role(NEW.decided_by, 'Chief_Warden', OLD.facility_id)
         OR EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = NEW.decided_by AND ur.role_code IN ('Director_Hostels', 'admin'));
    IF NOT v_ok THEN RAISE EXCEPTION 'Only the Chief Warden of the hostel decides a deduction' USING ERRCODE = 'check_violation'; END IF;
    NEW.decided_at := coalesce(NEW.decided_at, now());
  END IF;
  -- what is taken out can never be more than what is held
  IF (NEW.entry_type = 'Refund') OR (NEW.entry_type = 'Deduction' AND NEW.status = 'Approved') THEN
    v_bal := hostel.fn_caution_balance(NEW.student_id);
    IF NEW.amount > v_bal THEN
      RAISE EXCEPTION 'Only ₹% of caution deposit is held for this student; ₹% cannot be taken', v_bal, NEW.amount USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_caution_entry_before BEFORE INSERT OR UPDATE OR DELETE ON hostel.caution_entry FOR EACH ROW EXECUTE FUNCTION hostel.fn_caution_entry_before();

CREATE OR REPLACE FUNCTION hostel.fn_caution_entry_after() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entry_type = 'Deduction' AND NEW.status = 'Approved' AND (TG_OP = 'INSERT' OR OLD.status = 'Proposed') THEN
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', NEW.student_id, 'In_App', 'CAUTION', 'Caution deposit deduction',
            format('₹%s was taken from your caution deposit: %s. Balance ₹%s.', NEW.amount, NEW.reason, hostel.fn_caution_balance(NEW.student_id)), 'caution_entry', NEW.entry_id::text);
  ELSIF NEW.entry_type = 'Refund' AND TG_OP = 'INSERT' THEN
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', NEW.student_id, 'In_App', 'CAUTION', 'Caution deposit refunded',
            format('₹%s of your caution deposit was sent by %s, reference %s.', NEW.amount, NEW.refund_mode, NEW.refund_ref), 'caution_entry', NEW.entry_id::text);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_caution_entry_after AFTER INSERT OR UPDATE OF status ON hostel.caution_entry FOR EACH ROW EXECUTE FUNCTION hostel.fn_caution_entry_after();

-- a successful receipt against the Caution_Deposit demand is the "Collected" line
CREATE OR REPLACE FUNCTION hostel.fn_caution_from_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d hostel.fee_demand%ROWTYPE;
BEGIN
  IF NEW.gateway_status <> 'Success' OR (TG_OP = 'UPDATE' AND OLD.gateway_status = 'Success') THEN RETURN NULL; END IF;
  SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = NEW.demand_id;
  IF d.fee_head <> 'Caution_Deposit' THEN RETURN NULL; END IF;
  PERFORM set_config('hostel.caution_receipt', 'on', true);
  INSERT INTO hostel.caution_entry (student_id, entry_type, amount, reason, receipt_id, demand_id, created_by)
  VALUES (d.student_id, 'Collected', NEW.amount, 'Caution deposit paid, receipt ' || NEW.receipt_no || ' (' || NEW.payment_mode || ')', NEW.receipt_id, d.demand_id, coalesce(NEW.created_by, 'system'))
  ON CONFLICT DO NOTHING;
  PERFORM set_config('hostel.caution_receipt', '', true);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_receipt_caution AFTER INSERT OR UPDATE OF gateway_status ON hostel.fee_receipt FOR EACH ROW EXECUTE FUNCTION hostel.fn_caution_from_receipt();

-- taking a room raises the deposit, once: not again on renewal or a room change while a deposit is held or asked for
CREATE OR REPLACE FUNCTION hostel.fn_caution_demand() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; v_amt numeric;
BEGIN
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  SELECT caution_deposit INTO v_amt FROM hostel.room_type_fee WHERE fee_id = NEW.fee_id;
  IF coalesce(v_amt, 0) <= 0 OR hostel.fn_caution_balance(r.student_id) > 0
     OR EXISTS (SELECT 1 FROM hostel.fee_demand WHERE student_id = r.student_id AND fee_head = 'Caution_Deposit' AND status IN ('Pending', 'Part_Paid', 'Overdue')) THEN
    RETURN NULL;
  END IF;
  INSERT INTO hostel.fee_demand (student_id, fee_head, instalment_no, amount_due, due_date, reference_type, reference_id, created_by)
  VALUES (r.student_id, 'Caution_Deposit', 1, v_amt, current_date + hostel.fn_policy_days('instalment_1_due_days', 7), 'caution_deposit', NEW.fee_plan_id, NEW.created_by);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_fee_plan_caution AFTER INSERT ON hostel.fee_plan FOR EACH ROW EXECUTE FUNCTION hostel.fn_caution_demand();

-- Accounts pays a student's unpaid demand from the deposit: one approved Unpaid_Dues line and a receipt on the demand
CREATE OR REPLACE FUNCTION hostel.fn_caution_pay_due(p_student varchar, p_demand bigint, p_by varchar) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE d hostel.fee_demand%ROWTYPE; v_amt numeric; v_rec bigint; v_no text; v_entry bigint;
BEGIN
  SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = p_demand FOR UPDATE;
  IF d.student_id IS DISTINCT FROM p_student THEN RAISE EXCEPTION 'Demand % is not this student''s', p_demand USING ERRCODE = 'check_violation'; END IF;
  IF d.fee_head = 'Caution_Deposit' THEN RAISE EXCEPTION 'The deposit cannot pay itself' USING ERRCODE = 'check_violation'; END IF;
  IF d.status NOT IN ('Pending', 'Part_Paid', 'Overdue') THEN RAISE EXCEPTION 'Demand % is %', p_demand, d.status USING ERRCODE = 'check_violation'; END IF;
  v_amt := least(d.amount_due - d.amount_paid, hostel.fn_caution_balance(p_student));
  IF v_amt <= 0 THEN RAISE EXCEPTION 'No caution deposit is held for this student' USING ERRCODE = 'check_violation'; END IF;
  INSERT INTO hostel.fee_receipt (demand_id, amount, payment_mode, gateway_status, is_refundable, created_by)
  VALUES (p_demand, v_amt, 'Caution_Deposit', 'Success', false, p_by) RETURNING receipt_id, receipt_no INTO v_rec, v_no;
  INSERT INTO hostel.caution_entry (student_id, entry_type, category, amount, reason, status, demand_id, receipt_id, proposed_by, decided_by, decided_at, created_by)
  VALUES (p_student, 'Deduction', 'Unpaid_Dues', v_amt,
          format('Unpaid %s due %s paid from the deposit (receipt %s)', replace(d.fee_head::text, '_', ' '), to_char(d.due_date, 'DD Mon YYYY'), v_no),
          'Approved', p_demand, v_rec, p_by, p_by, now(), p_by)
  RETURNING entry_id INTO v_entry;
  RETURN v_entry;
END $$;
COMMENT ON FUNCTION hostel.fn_caution_pay_due(varchar, bigint, varchar) IS 'Accounts: pay an unpaid demand from the student''s caution deposit (as much as is held)';

COMMIT;
