-- =====================================================================
-- 034  portal — accounts: budget transactions, vendor invoices, three-way match, advances,
--      payments, debit / credit notes, journal entries. Sources: inventory model Module G ; hostel I24, I34–I40
-- =====================================================================

CREATE TYPE portal.budget_txn_type   AS ENUM ('Commitment','Commitment_Release','Utilisation','Reversal','Reallocation');
CREATE TYPE portal.budget_ref_type   AS ENUM ('PR','PO','Invoice','Issue_Note','Adjustment','Hostel_Fee');
CREATE TYPE portal.three_way_match   AS ENUM ('Matched','Qty_Mismatch','Price_Mismatch','Not_Matched');
CREATE TYPE portal.invoice_status    AS ENUM ('Received','Under_Verification','Approved','Partially_Paid','Paid','On_Hold','Rejected');
CREATE TYPE portal.advance_status    AS ENUM ('Paid','Partially_Adjusted','Fully_Adjusted','Refunded');
CREATE TYPE portal.payment_type      AS ENUM ('Advance','Against_Invoice','Retention_Release','Refund');
CREATE TYPE portal.payment_mode      AS ENUM ('NEFT','RTGS','Cheque','UPI','Cash','DD');
CREATE TYPE portal.payment_status    AS ENUM ('Draft','Approved','Paid','Failed','Cancelled');
CREATE TYPE portal.note_type         AS ENUM ('Debit_Note','Credit_Note');
CREATE TYPE portal.note_reason       AS ENUM ('Rejection','Short_Supply','Price_Difference','Penalty','Rate_Revision');
CREATE TYPE portal.note_status       AS ENUM ('Raised','Accepted_By_Vendor','Adjusted','Closed');
CREATE TYPE portal.journal_source    AS ENUM ('GRN','Invoice','Payment','Issue_Note','Adjustment','Capitalisation','Debit_Note','Credit_Note','Hostel_Fee','Hostel_Damage','Meter_Recharge');
CREATE TYPE portal.journal_status    AS ENUM ('Draft','Posted','Reversed');

CREATE TABLE portal.budget_txn (                             -- I24 NEW: commitment or use of a budget
  budget_txn_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  budget_code    varchar(30) NOT NULL REFERENCES portal.budget_head,
  txn_type       portal.budget_txn_type NOT NULL,
  reference_type portal.budget_ref_type NOT NULL,
  reference_id   varchar(40) NOT NULL,
  amount         numeric(16,2) NOT NULL,                     -- + / –
  txn_date       date NOT NULL DEFAULT current_date,
  posted_by      varchar(20) REFERENCES ref.staff_master
);
CREATE INDEX ix_budget_txn_head ON portal.budget_txn (budget_code, txn_date);

CREATE TABLE portal.vendor_invoice (                         -- I34 NEW: vendor invoice matched to order and receipt
  invoice_id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_no             varchar(60) NOT NULL,               -- vendor's number
  invoice_date           date NOT NULL,
  vendor_id              varchar(20) NOT NULL REFERENCES portal.vendor,
  po_id                  integer REFERENCES portal.purchase_order,
  grn_id                 varchar(20) REFERENCES portal.grn,
  received_date          date,
  basic_amount           numeric(16,2) NOT NULL,
  discount_amount        numeric(16,2) NOT NULL DEFAULT 0,
  cgst_amount            numeric(16,2) NOT NULL DEFAULT 0,
  sgst_amount            numeric(16,2) NOT NULL DEFAULT 0,
  igst_amount            numeric(16,2) NOT NULL DEFAULT 0,
  freight_amount         numeric(16,2) NOT NULL DEFAULT 0,
  other_charges          numeric(16,2) NOT NULL DEFAULT 0,
  invoice_total          numeric(16,2) GENERATED ALWAYS AS (basic_amount - discount_amount + cgst_amount + sgst_amount + igst_amount + freight_amount + other_charges) STORED,
  tds_amount             numeric(16,2) NOT NULL DEFAULT 0,
  retention_amount       numeric(16,2) NOT NULL DEFAULT 0,
  advance_adjusted       numeric(16,2) NOT NULL DEFAULT 0,
  net_payable            numeric(16,2) GENERATED ALWAYS AS (basic_amount - discount_amount + cgst_amount + sgst_amount + igst_amount + freight_amount + other_charges - tds_amount - retention_amount - advance_adjusted) STORED,
  due_date               date,
  three_way_match_status portal.three_way_match,
  verified_by            varchar(20) REFERENCES ref.staff_master,
  approved_by            varchar(20) REFERENCES ref.staff_master,
  doc_id                 uuid,                               -- FK shared.document (added in 040)
  status                 portal.invoice_status NOT NULL DEFAULT 'Received',
  UNIQUE (vendor_id, invoice_no)
);
CREATE TABLE portal.vendor_invoice_line (                    -- I35 NEW
  invoice_line_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id      bigint NOT NULL REFERENCES portal.vendor_invoice ON DELETE CASCADE,
  po_line_id      bigint REFERENCES portal.po_line (po_line_id),
  grn_id          varchar(20) REFERENCES portal.grn,
  sku             varchar(30) NOT NULL REFERENCES portal.material,
  qty_invoiced    numeric(14,3) NOT NULL,
  qty_accepted    numeric(14,3),                             -- from GRN
  unit_price      numeric(14,2) NOT NULL,
  po_unit_price   numeric(14,2),
  price_variance  numeric(14,2) GENERATED ALWAYS AS (unit_price - coalesce(po_unit_price, unit_price)) STORED,
  tax_pct         numeric(5,2) NOT NULL DEFAULT 0,
  line_total      numeric(16,2) GENERATED ALWAYS AS (round(qty_invoiced * unit_price * (1 + tax_pct/100), 2)) STORED,
  gl_account_id   varchar(20) REFERENCES portal.gl_account,
  budget_code     varchar(30) REFERENCES portal.budget_head
);

CREATE TABLE portal.po_payment (                             -- I36 EXTENDED: payment to a vendor (portal: one per order; now a voucher)
  payment_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_no       varchar(30) UNIQUE,                       -- voucher number
  po_id            integer REFERENCES portal.purchase_order,
  vendor_id        varchar(20) NOT NULL REFERENCES portal.vendor,
  invoice_no       varchar(60),                              -- portal columns kept for the simple one-row-per-order case
  invoice_date     date,
  invoice_amount   numeric(16,2),
  payment_date     date,
  payment_type     portal.payment_type NOT NULL DEFAULT 'Against_Invoice',
  mode             portal.payment_mode,
  bank_account_id  varchar(20),                              -- institute bank account (gl_account of type Asset)
  transaction_ref  varchar(60),                              -- UTR / cheque no.
  gross_amount     numeric(16,2) NOT NULL,
  tds_deducted     numeric(16,2) NOT NULL DEFAULT 0,
  penalty_deducted numeric(16,2) NOT NULL DEFAULT 0,
  net_paid         numeric(16,2) GENERATED ALWAYS AS (gross_amount - tds_deducted - penalty_deducted) STORED,
  prepared_by      varchar(20) REFERENCES ref.staff_master,
  approved_by      varchar(20) REFERENCES ref.staff_master,
  status           portal.payment_status NOT NULL DEFAULT 'Draft'
);
CREATE TABLE portal.advance_payment (                        -- 8.6
  advance_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id              integer NOT NULL REFERENCES portal.purchase_order,
  vendor_id          varchar(20) NOT NULL REFERENCES portal.vendor,
  advance_amount     numeric(16,2) NOT NULL,
  advance_date       date NOT NULL,
  payment_id         bigint REFERENCES portal.po_payment,
  adjusted_amount    numeric(16,2) NOT NULL DEFAULT 0,
  balance_amount     numeric(16,2) GENERATED ALWAYS AS (advance_amount - adjusted_amount) STORED,
  bank_guarantee_ref varchar(60),
  status             portal.advance_status NOT NULL DEFAULT 'Paid'
);
CREATE TABLE portal.payment_allocation (                     -- 8.8 payment <-> invoice
  allocation_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id       bigint NOT NULL REFERENCES portal.po_payment,
  invoice_id       bigint NOT NULL REFERENCES portal.vendor_invoice,
  advance_id       bigint REFERENCES portal.advance_payment,
  amount_allocated numeric(16,2) NOT NULL
);
CREATE TABLE portal.debit_note (                             -- I37 NEW: debit or credit note with a vendor
  note_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  note_type    portal.note_type NOT NULL,
  note_no      varchar(30) NOT NULL UNIQUE,
  note_date    date NOT NULL DEFAULT current_date,
  vendor_id    varchar(20) NOT NULL REFERENCES portal.vendor,
  invoice_id   bigint REFERENCES portal.vendor_invoice,
  rtv_id       bigint REFERENCES portal.return_to_vendor,
  reason       portal.note_reason NOT NULL,
  basic_amount numeric(16,2) NOT NULL,
  tax_amount   numeric(16,2) NOT NULL DEFAULT 0,
  total_amount numeric(16,2) GENERATED ALWAYS AS (basic_amount + tax_amount) STORED,
  status       portal.note_status NOT NULL DEFAULT 'Raised'
);
ALTER TABLE portal.return_to_vendor ADD CONSTRAINT fk_rtv_debit_note FOREIGN KEY (debit_note_id) REFERENCES portal.debit_note;

CREATE TABLE portal.journal_entry (                          -- I39 NEW: accounting entry produced by a step of the flow
  journal_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_date date NOT NULL DEFAULT current_date,
  source_type  portal.journal_source NOT NULL,
  source_id    varchar(40) NOT NULL,
  narration    text,
  posted_by    varchar(20) REFERENCES ref.staff_master,
  status       portal.journal_status NOT NULL DEFAULT 'Draft'
);
CREATE TABLE portal.journal_line (                           -- I40 NEW
  journal_line_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id      bigint NOT NULL REFERENCES portal.journal_entry ON DELETE CASCADE,
  gl_account_id   varchar(20) NOT NULL REFERENCES portal.gl_account,
  dept_code       varchar(20) REFERENCES ref.department,     -- cost centre
  budget_code     varchar(30) REFERENCES portal.budget_head,
  debit_amount    numeric(16,2) NOT NULL DEFAULT 0,
  credit_amount   numeric(16,2) NOT NULL DEFAULT 0,
  CHECK (debit_amount >= 0 AND credit_amount >= 0 AND (debit_amount = 0 OR credit_amount = 0))
);

CREATE TABLE portal.vendor_performance (                     -- 5.10 feeds vendor.overall_rating
  perf_id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_id              varchar(20) NOT NULL REFERENCES portal.vendor,
  po_id                  integer REFERENCES portal.purchase_order,
  on_time_delivery       boolean,
  delay_days             integer,
  quality_score          numeric(3,1),
  rejection_pct          numeric(5,2),
  invoice_accuracy       boolean,
  service_response_score numeric(3,1),
  composite_score        numeric(4,2),
  recorded_by            varchar(20) REFERENCES ref.staff_master,
  recorded_date          date NOT NULL DEFAULT current_date
);

-- order total is calculated, never stored (portal rule)
CREATE VIEW portal.v_po_total AS
SELECT po_id,
       sum(round(qty * unit_price * (1 - discount_pct/100), 2))                                        AS sub_total,
       sum(round(qty * unit_price * (1 - discount_pct/100) * (cgst_pct + sgst_pct + igst_pct)/100, 2)) AS tax_amount,
       sum(round(qty * unit_price * (1 - discount_pct/100) * (1 + (cgst_pct + sgst_pct + igst_pct)/100), 2)) AS grand_total
FROM portal.po_line GROUP BY po_id;
