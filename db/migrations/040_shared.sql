-- =====================================================================
-- 040  shared — cross-module tables
--      SH1 Approval_Rule, SH2 Approval_Step (replace Outpass_Approval; serve outing, sick leave, vacating,
--      discipline and convention booking), SH3 Report_Visibility, SH4 Notification,
--      portal policy_setting, document, audit_log (hash-chained), L1 Import_Batch
-- =====================================================================

CREATE TYPE shared.request_type     AS ENUM ('Outpass','Sick_Leave','Vacate','Discipline','Convention_Booking','Hostel_Registration','Indent');
CREATE TYPE shared.decision         AS ENUM ('Pending','Recommended','Approved','Rejected','Skipped','Expired');
CREATE TYPE shared.visibility_scope AS ENUM ('Own','Floor','Hostel','All');
CREATE TYPE shared.recipient_type   AS ENUM ('Student','Parent','Staff');
CREATE TYPE shared.channel          AS ENUM ('SMS','WhatsApp','Email','Push','In_App');
CREATE TYPE shared.delivery_status  AS ENUM ('Queued','Sent','Delivered','Failed','Read');
CREATE TYPE shared.import_source    AS ENUM ('ERP_Student','ERP_Staff','ERP_Department','Academic_Attendance','Academic_Marks','Academic_Term','Infra_Space','Portal_Material');
CREATE TYPE shared.import_status    AS ENUM ('Received','Processing','Completed','Failed','Partially_Completed');
CREATE TYPE shared.document_kind    AS ENUM ('Invoice','Delivery_Challan','Donation_Letter','Quotation','Test_Report','Medical_Note','Photo','Handover_Sheet','QR_Label','Receipt','Consent_Form','Other');

-- ---------- rules held as data ----------
CREATE TABLE shared.policy_setting (
  setting_key  varchar(60)  PRIMARY KEY,                     -- finance_limit, store_posting_limit, offer_hold_hours, movement_retention_days
  module       varchar(20)  NOT NULL DEFAULT 'hostel',
  amount       numeric(16,2),                                -- numeric value (₹ limit, hours, days)
  value_text   varchar(200),                                 -- non-numeric value
  meaning      varchar(300) NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   varchar(20) REFERENCES ref.staff_master
);
COMMENT ON TABLE shared.policy_setting IS 'The portal''s and the hostel''s rules held as data, one value per cell';

-- ---------- proof files ----------
CREATE TABLE shared.document (
  doc_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           shared.document_kind NOT NULL,
  file_name      varchar(200) NOT NULL,
  object_key     varchar(300) NOT NULL,                      -- object storage key (MinIO / S3); never stored inline
  mime_type      varchar(80),
  size_bytes     bigint,
  sha256         char(64),
  attached_to    varchar(40),                                -- table name the file belongs to
  attached_id    varchar(40),                                -- that row's key
  uploaded_by    varchar(20) REFERENCES ref.staff_master,
  uploaded_by_student varchar(20) REFERENCES ref.student_master,
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_document_attached ON shared.document (attached_to, attached_id);
ALTER TABLE portal.rfq_bid                ADD CONSTRAINT fk_bid_doc      FOREIGN KEY (attachment_doc_id) REFERENCES shared.document;
ALTER TABLE portal.quality_inspection     ADD CONSTRAINT fk_qi_doc       FOREIGN KEY (report_doc_id)     REFERENCES shared.document;
ALTER TABLE portal.commissioning_handover ADD CONSTRAINT fk_comm_doc     FOREIGN KEY (test_report_doc_id) REFERENCES shared.document;
ALTER TABLE portal.vendor_invoice         ADD CONSTRAINT fk_invoice_doc  FOREIGN KEY (doc_id)            REFERENCES shared.document;

-- ---------- L1 Import_Batch: file or feed received from the ERP / academic system ----------
CREATE TABLE shared.import_batch (
  batch_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source       shared.import_source NOT NULL,
  file_name    varchar(200),
  received_at  timestamptz NOT NULL DEFAULT now(),
  rows_total   integer, rows_ok integer, rows_failed integer,
  status       shared.import_status NOT NULL DEFAULT 'Received',
  processed_by varchar(20) REFERENCES ref.staff_master,
  error_report text
);
ALTER TABLE ref.student_master ADD CONSTRAINT fk_student_import FOREIGN KEY (import_batch_id) REFERENCES shared.import_batch;
ALTER TABLE ref.staff_master   ADD CONSTRAINT fk_staff_import   FOREIGN KEY (import_batch_id) REFERENCES shared.import_batch;

-- ---------- SH1 Approval_Rule: level of approval for one kind of request ----------
CREATE TABLE shared.approval_rule (
  rule_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_type    shared.request_type NOT NULL,
  level           smallint NOT NULL,                         -- 0 = parent recommendation, 1 = Floor Warden, 2 = Chief Warden, 3 = Dean
  approver_role   varchar(30) NOT NULL REFERENCES portal.role,
  condition_key   varchar(40),                               -- e.g. outing_category ; null = always
  condition_value varchar(40),                               -- e.g. Day_Or_More
  is_mandatory    boolean NOT NULL DEFAULT true,
  sla_hours       integer,
  status          shared.active_status NOT NULL DEFAULT 'Active',
  UNIQUE (request_type, level, condition_key, condition_value)
);
COMMENT ON TABLE shared.approval_rule IS 'SH1 — which role must act at each level of each request type; approvers are found through hostel.staff_space_assignment, never stored on the student';

-- ---------- SH2 Approval_Step: decision taken at one level on one request ----------
CREATE TABLE shared.approval_step (
  step_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_type       shared.request_type NOT NULL,
  request_id         bigint NOT NULL,                        -- outpass_id / sick_leave_id / vacate_id ...
  level              smallint NOT NULL,
  rule_id            bigint REFERENCES shared.approval_rule,
  approver_role      varchar(30) NOT NULL REFERENCES portal.role,
  acted_by           varchar(20) REFERENCES ref.staff_master,     -- staff who decided
  acted_by_contact   bigint,                                 -- parent / guardian contact (FK hostel.student_contact, added in 050)
  decision           shared.decision NOT NULL DEFAULT 'Pending',
  decided_on         timestamptz,
  remarks            text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_type, request_id, level),
  CHECK (decision = 'Pending' OR decided_on IS NOT NULL)
);
CREATE INDEX ix_approval_step_pending ON shared.approval_step (approver_role, decision) WHERE decision = 'Pending';

-- ---------- SH3 Report_Visibility ----------
CREATE TABLE shared.report_visibility (
  report_code varchar(40) NOT NULL,                          -- occupancy, fee_overdue, meter_usage, movement_log ...
  role_code   varchar(30) NOT NULL REFERENCES portal.role,
  scope       shared.visibility_scope NOT NULL,              -- Own / Floor / Hostel / All
  status      shared.active_status NOT NULL DEFAULT 'Active',
  PRIMARY KEY (report_code, role_code)
);

-- ---------- SH4 Notification: message sent to a student, parent or staff member ----------
CREATE TABLE shared.notification (
  notification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_type  shared.recipient_type NOT NULL,
  student_id      varchar(20) REFERENCES ref.student_master,
  contact_id      bigint,                                    -- FK hostel.student_contact (parent), added in 050
  staff_id        varchar(20) REFERENCES ref.staff_master,
  channel         shared.channel NOT NULL,
  template_code   varchar(40),                               -- OUTPASS_ISSUED, FEE_OVERDUE, METER_LOW ...
  subject         varchar(200),
  body            text NOT NULL,
  related_type    varchar(40),                               -- outpass / fee_demand / hostel_alert ...
  related_id      varchar(40),
  queued_at       timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  delivery_status shared.delivery_status NOT NULL DEFAULT 'Queued',
  provider_ref    varchar(80),
  error_text      text
);
CREATE INDEX ix_notification_queue ON shared.notification (delivery_status, queued_at) WHERE delivery_status = 'Queued';

-- ---------- audit_log: every sign-in, approval, refusal and data change; rows can never be changed ----------
CREATE TABLE shared.audit_log (
  audit_id    bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  kind        varchar(40) NOT NULL,                          -- sign in, approve indent, update row ...
  outcome     varchar(60) NOT NULL,                          -- allowed / refused: above limit
  actor       varchar(40),                                   -- staff_id / student_id / user_id
  role_code   varchar(30),                                   -- role held at that moment
  table_name  varchar(80),
  row_key     varchar(80),
  detail      jsonb,                                         -- before / after for data changes
  prev_hash   char(64),
  hash        char(64),
  PRIMARY KEY (audit_id, occurred_at)
) PARTITION BY RANGE (occurred_at);
COMMENT ON TABLE shared.audit_log IS 'Kept in monthly slices; rows can be added but never changed (hash chain)';
CREATE TABLE shared.audit_log_default PARTITION OF shared.audit_log DEFAULT;

CREATE OR REPLACE FUNCTION shared.fn_audit_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last_hash char(64);
BEGIN
  SELECT hash INTO last_hash FROM shared.audit_log ORDER BY audit_id DESC LIMIT 1;
  NEW.prev_hash := coalesce(last_hash, repeat('0', 64));
  NEW.hash := encode(digest(NEW.prev_hash || NEW.kind || NEW.outcome || coalesce(NEW.actor,'') || coalesce(NEW.table_name,'') || coalesce(NEW.row_key,'') || coalesce(NEW.detail::text,'') || NEW.occurred_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_chain BEFORE INSERT ON shared.audit_log FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_chain();

CREATE OR REPLACE FUNCTION shared.fn_block_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows can be added but not changed or deleted', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
END $$;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON shared.audit_log FOR EACH ROW EXECUTE FUNCTION shared.fn_block_change();

-- Generic row-change audit trigger: attach to any table with
--   CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON <table> FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row();
CREATE OR REPLACE FUNCTION shared.fn_audit_row() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_actor text := current_setting('app.actor', true);
        v_role  text := current_setting('app.role', true);
        v_key   text;
BEGIN
  v_key := coalesce((CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END) ->> TG_ARGV[0], '?');
  INSERT INTO shared.audit_log (kind, outcome, actor, role_code, table_name, row_key, detail)
  VALUES (lower(TG_OP) || ' row', 'allowed', v_actor, v_role, TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, v_key,
          jsonb_build_object('old', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
                             'new', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END));
  RETURN NULL;
END $$;
