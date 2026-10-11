-- =====================================================================
-- 123  Pay all with a receipt from the university portal, and the student's wallet, 11 Oct 2026.
--   * A student pays every open demand at once on the university payment portal and uploads a photo of the receipt
--     (hostel.payment_proof). The Floor Warden checks it (level 1), the Chief Warden approves it (level 2), through the
--     same approval engine as outings. On approval the receipts are written against the demands (payment_mode
--     Bank_Transfer), the registration's fee check and Chief Warden approval are recorded, and the hostel office can
--     check the student in. Any amount beyond the dues goes to the wallet.
--   * The wallet (hostel.wallet_txn): money the hostel holds for the student. Credits come from an approved receipt
--     that paid more than was due, or a receipt uploaded with no demand ("add money"); debits pay dues from it
--     (payment_mode Wallet). v_wallet gives the balance.
--   Until the document store is connected the receipt photo is kept as a data URL, like the student photo (112).
-- =====================================================================

ALTER TYPE shared.request_type ADD VALUE IF NOT EXISTS 'Payment_Proof';
ALTER TYPE hostel.payment_mode ADD VALUE IF NOT EXISTS 'Bank_Transfer';
ALTER TYPE hostel.payment_mode ADD VALUE IF NOT EXISTS 'Wallet';

INSERT INTO shared.approval_rule (request_type, level, approver_role, step_name, is_final, status)
SELECT 'Payment_Proof', v.l, v.r, v.n, v.f, 'Active' FROM (VALUES
  (1::smallint, 'Floor_Warden', 'Floor Warden checks the receipt', false),
  (2::smallint, 'Chief_Warden', 'Chief Warden approves the payment', true)) v(l, r, n, f)
WHERE NOT EXISTS (SELECT 1 FROM shared.approval_rule x WHERE x.request_type = 'Payment_Proof' AND x.level = v.l);

-- ---------- the receipt the student uploads ----------
CREATE TABLE IF NOT EXISTS hostel.payment_proof (
  proof_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proof_no      varchar(20) UNIQUE,
  student_id    varchar(20) NOT NULL REFERENCES ref.student_master,
  facility_id   varchar(30) REFERENCES infra.facility,                 -- the hostel whose wardens check it
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on       date NOT NULL,
  reference     varchar(80),                                           -- the portal's transaction number
  photo         text NOT NULL,                                          -- data URL of the receipt photograph
  demand_ids    bigint[] NOT NULL DEFAULT '{}',                         -- what it pays; empty = money for the wallet
  status        varchar(10) NOT NULL DEFAULT 'Uploaded' CHECK (status IN ('Uploaded', 'Checked', 'Approved', 'Rejected')),
  remarks       varchar(500),                                           -- why it was rejected
  decided_by    varchar(20) REFERENCES ref.staff_master,
  decided_on    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    varchar(20),
  updated_at    timestamptz,
  updated_by    varchar(20)
);
CREATE INDEX IF NOT EXISTS ix_payment_proof_student ON hostel.payment_proof (student_id, created_at DESC);
COMMENT ON TABLE hostel.payment_proof IS 'A receipt from the university payment portal, uploaded by the student; checked by the Floor Warden and approved by the Chief Warden';

-- ---------- the wallet ----------
CREATE TABLE IF NOT EXISTS hostel.wallet_txn (
  txn_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  kind            varchar(6) NOT NULL CHECK (kind IN ('Credit', 'Debit')),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  reason          varchar(200) NOT NULL,
  reference_type  varchar(30),                                         -- payment_proof, fee_receipt, room_change ...
  reference_id    bigint,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      varchar(20)
);
CREATE INDEX IF NOT EXISTS ix_wallet_txn_student ON hostel.wallet_txn (student_id, created_at DESC);
CREATE OR REPLACE VIEW hostel.v_wallet AS
SELECT student_id, coalesce(sum(CASE WHEN kind = 'Credit' THEN amount ELSE -amount END), 0)::numeric(12,2) AS balance,
       count(*)::int AS txns, max(created_at) AS last_at
FROM hostel.wallet_txn GROUP BY student_id;

-- ---------- a new proof: its number, its hostel, its approval steps ----------
CREATE OR REPLACE FUNCTION hostel.fn_payment_proof_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_fac varchar;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- the hostel: where the student lives, else the hostel of the registration being paid for
    SELECT facility_id INTO v_fac FROM hostel.fn_student_stay(NEW.student_id);
    IF v_fac IS NULL THEN
      SELECT r.facility_id INTO v_fac FROM hostel.hostel_registration r WHERE r.student_id = NEW.student_id AND r.status::text NOT IN ('Cancelled', 'Vacated')
       ORDER BY r.applied_on DESC LIMIT 1;
    END IF;
    UPDATE hostel.payment_proof SET proof_no = hostel.fn_next_doc_no('PP'), facility_id = coalesce(facility_id, v_fac) WHERE proof_id = NEW.proof_id;
    INSERT INTO shared.approval_step (request_type, request_id, level, rule_id, approver_role)
    SELECT 'Payment_Proof', NEW.proof_id, r.level, r.rule_id, r.approver_role FROM shared.approval_rule r
     WHERE r.request_type = 'Payment_Proof' AND r.status = 'Active' ORDER BY r.level;
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', NEW.student_id, 'In_App', 'PAYMENT_PROOF', 'Receipt received',
            format('Your receipt for ₹%s is with the Floor Warden for checking.', to_char(NEW.amount, 'FM9,99,99,990')), 'payment_proof', NEW.proof_id::text);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_payment_proof_after ON hostel.payment_proof;
CREATE TRIGGER trg_payment_proof_after AFTER INSERT ON hostel.payment_proof FOR EACH ROW EXECUTE FUNCTION hostel.fn_payment_proof_after();

-- who may take a step: a Floor Warden of the hostel (any floor: a new student has no floor yet), or the Chief Warden
-- where the hostel has no Floor Warden; then the Chief Warden of the hostel (or the Director, Hostels)
CREATE OR REPLACE FUNCTION hostel.fn_payment_proof_step_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p hostel.payment_proof%ROWTYPE; v_ok boolean; v_dir boolean;
BEGIN
  IF NEW.request_type <> 'Payment_Proof' OR NEW.decision NOT IN ('Approved', 'Rejected') THEN RETURN NEW; END IF;
  SELECT * INTO p FROM hostel.payment_proof WHERE proof_id = NEW.request_id;
  IF p.status NOT IN ('Uploaded', 'Checked') THEN RAISE EXCEPTION 'Receipt % is already %', p.proof_no, lower(p.status) USING ERRCODE = 'check_violation'; END IF;
  v_dir := EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = NEW.acted_by AND ur.role_code = 'Director_Hostels');
  IF p.facility_id IS NULL THEN
    v_ok := true; -- no hostel known yet: any warden may act
  ELSIF NEW.level = 1 THEN
    v_ok := hostel.fn_staff_has_role(NEW.acted_by, 'Floor_Warden', p.facility_id)
         OR ((hostel.fn_staff_has_role(NEW.acted_by, 'Chief_Warden', p.facility_id) OR v_dir)
             AND NOT EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.hostel_role = 'Floor_Warden' AND a.status = 'Active' AND a.facility_id = p.facility_id));
    IF NOT v_ok THEN RAISE EXCEPTION 'Only a Floor Warden of hostel % checks this receipt', p.facility_id USING ERRCODE = 'check_violation'; END IF;
  ELSE
    IF NOT (hostel.fn_staff_has_role(NEW.acted_by, 'Chief_Warden', p.facility_id) OR v_dir) THEN
      RAISE EXCEPTION 'Only the Chief Warden of hostel % approves this payment', p.facility_id USING ERRCODE = 'check_violation'; END IF;
  END IF;
  IF NEW.decision = 'Rejected' AND length(btrim(coalesce(NEW.remarks, ''))) < 3 THEN
    RAISE EXCEPTION 'Say what is wrong with the receipt' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_approval_step_payment_proof ON shared.approval_step;
CREATE TRIGGER trg_approval_step_payment_proof BEFORE UPDATE OF decision ON shared.approval_step FOR EACH ROW
  WHEN (NEW.request_type = 'Payment_Proof') EXECUTE FUNCTION hostel.fn_payment_proof_step_before();

-- after a step: checked, approved (receipts written, the registration moves on, the rest to the wallet) or rejected
CREATE OR REPLACE FUNCTION hostel.fn_payment_proof_step_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p hostel.payment_proof%ROWTYPE; v_left integer; v_rest numeric(12,2); d hostel.fee_demand%ROWTYPE; v_bal numeric(12,2); v_id bigint; v_paid numeric(12,2) := 0;
BEGIN
  IF NEW.decision NOT IN ('Approved', 'Rejected') THEN RETURN NULL; END IF;
  SELECT * INTO p FROM hostel.payment_proof WHERE proof_id = NEW.request_id;
  IF NEW.decision = 'Rejected' THEN
    UPDATE hostel.payment_proof SET status = 'Rejected', remarks = NEW.remarks, decided_by = NEW.acted_by, decided_on = now(), updated_at = now(), updated_by = NEW.acted_by WHERE proof_id = p.proof_id;
    UPDATE shared.approval_step SET decision = 'Skipped', decided_on = now(), remarks = 'Receipt rejected'
     WHERE request_type = 'Payment_Proof' AND request_id = p.proof_id AND decision = 'Pending';
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', p.student_id, 'In_App', 'PAYMENT_PROOF', 'Receipt not accepted',
            format('Your receipt %s was not accepted: %s. Upload it again or contact the hostel office.', p.proof_no, NEW.remarks), 'payment_proof', p.proof_id::text);
    RETURN NULL;
  END IF;
  SELECT count(*) INTO v_left FROM shared.approval_step WHERE request_type = 'Payment_Proof' AND request_id = p.proof_id AND decision = 'Pending';
  IF v_left > 0 THEN
    UPDATE hostel.payment_proof SET status = 'Checked', updated_at = now(), updated_by = NEW.acted_by WHERE proof_id = p.proof_id;
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', p.student_id, 'In_App', 'PAYMENT_PROOF', 'Receipt checked',
            format('The Floor Warden checked your receipt %s. It now waits for the Chief Warden.', p.proof_no), 'payment_proof', p.proof_id::text);
    RETURN NULL;
  END IF;
  -- approved: the money goes to the demands it names, in order, then to the wallet
  v_rest := p.amount;
  FOREACH v_id IN ARRAY p.demand_ids LOOP
    EXIT WHEN v_rest <= 0;
    SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = v_id AND student_id = p.student_id;
    CONTINUE WHEN d.demand_id IS NULL OR d.status IN ('Paid', 'Waived');
    v_bal := least(v_rest, d.amount_due - d.amount_paid);
    CONTINUE WHEN v_bal <= 0;
    INSERT INTO hostel.fee_receipt (demand_id, amount, paid_on, payment_mode, gateway_ref, gateway_status, is_refundable, collected_by, created_by)
    VALUES (d.demand_id, v_bal, p.paid_on::timestamptz, 'Bank_Transfer', p.proof_no || '/' || d.demand_id, 'Success', d.fee_head <> 'Registration', NEW.acted_by, NEW.acted_by);
    v_rest := v_rest - v_bal; v_paid := v_paid + v_bal;
  END LOOP;
  IF v_rest > 0 THEN
    INSERT INTO hostel.wallet_txn (student_id, kind, amount, reason, reference_type, reference_id, created_by)
    VALUES (p.student_id, 'Credit', v_rest, CASE WHEN v_paid > 0 THEN 'Paid beyond the dues on receipt ' || p.proof_no ELSE 'Money added with receipt ' || p.proof_no END, 'payment_proof', p.proof_id, NEW.acted_by);
  END IF;
  UPDATE hostel.payment_proof SET status = 'Approved', decided_by = NEW.acted_by, decided_on = now(), updated_at = now(), updated_by = NEW.acted_by WHERE proof_id = p.proof_id;
  -- the wardens have seen the money: the registration's fee check and the Chief Warden's approval are recorded
  UPDATE hostel.hostel_registration r
     SET fee_check_status = 'Verified', fee_checked_by = NEW.acted_by, fee_checked_on = now(), fee_check_remarks = 'Receipt ' || p.proof_no || ' approved',
         cw_status = 'Approved', cw_by = NEW.acted_by, cw_on = now(), updated_by = NEW.acted_by
   WHERE r.student_id = p.student_id AND r.status = 'Confirmed' AND (r.fee_check_status <> 'Verified' OR r.cw_status <> 'Approved');
  INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
  VALUES ('Student', p.student_id, 'In_App', 'PAYMENT_PROOF', 'Payment approved',
          format('Receipt %s is approved: ₹%s set against your fees%s.', p.proof_no, to_char(v_paid, 'FM9,99,99,990'),
                 CASE WHEN v_rest > 0 THEN format(' and ₹%s added to your wallet', to_char(v_rest, 'FM9,99,99,990')) ELSE '' END), 'payment_proof', p.proof_id::text);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_approval_step_payment_proof_after ON shared.approval_step;
CREATE TRIGGER trg_approval_step_payment_proof_after AFTER UPDATE OF decision ON shared.approval_step FOR EACH ROW
  WHEN (NEW.request_type = 'Payment_Proof') EXECUTE FUNCTION hostel.fn_payment_proof_step_after();

-- ---------- paying dues from the wallet ----------
CREATE OR REPLACE FUNCTION hostel.fn_wallet_pay(p_student varchar, p_demands bigint[], p_by varchar) RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE v_balance numeric(12,2); v_total numeric(12,2) := 0; d hostel.fee_demand%ROWTYPE; v_bal numeric(12,2); v_id bigint; v_txn bigint;
BEGIN
  SELECT coalesce(balance, 0) INTO v_balance FROM hostel.v_wallet WHERE student_id = p_student;
  FOREACH v_id IN ARRAY p_demands LOOP
    SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = v_id AND student_id = p_student;
    CONTINUE WHEN d.demand_id IS NULL OR d.status IN ('Paid', 'Waived');
    v_total := v_total + (d.amount_due - d.amount_paid);
  END LOOP;
  IF v_total <= 0 THEN RAISE EXCEPTION 'Nothing to pay' USING ERRCODE = 'check_violation'; END IF;
  IF coalesce(v_balance, 0) < v_total THEN RAISE EXCEPTION 'The wallet holds ₹% but ₹% is needed', v_balance, v_total USING ERRCODE = 'check_violation'; END IF;
  INSERT INTO hostel.wallet_txn (student_id, kind, amount, reason, reference_type, created_by) VALUES (p_student, 'Debit', v_total, 'Fees paid from the wallet', 'fee_receipt', p_by) RETURNING txn_id INTO v_txn;
  FOREACH v_id IN ARRAY p_demands LOOP
    SELECT * INTO d FROM hostel.fee_demand WHERE demand_id = v_id AND student_id = p_student;
    CONTINUE WHEN d.demand_id IS NULL OR d.status IN ('Paid', 'Waived');
    v_bal := d.amount_due - d.amount_paid;
    INSERT INTO hostel.fee_receipt (demand_id, amount, paid_on, payment_mode, gateway_ref, gateway_status, is_refundable, created_by)
    VALUES (d.demand_id, v_bal, now(), 'Wallet', 'WALLET-' || v_txn || '/' || d.demand_id, 'Success', d.fee_head <> 'Registration', p_by);
  END LOOP;
  RETURN v_total;
END $$;
