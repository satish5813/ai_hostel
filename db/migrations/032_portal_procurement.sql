-- =====================================================================
-- 032  portal — procurement: purchase requisition, RFQ, bids, evaluation & ranking, purchase order
--      Sources: portal section 6 ; inventory model Module D ; hostel I14–I24
-- =====================================================================

CREATE TYPE portal.pr_type          AS ENUM ('Indent_Shortfall','Reorder','Capital_Project','Emergency','AMC_Service');
CREATE TYPE portal.pr_status        AS ENUM ('Draft','Submitted','Approved','RFQ_Issued','PO_Created','Rejected','Cancelled');
CREATE TYPE portal.pr_line_status   AS ENUM ('Open','RFQ','Ordered','Received','Closed');
CREATE TYPE portal.rfq_mode         AS ENUM ('Open_Tender','Limited_Tender','Single_Quote','GeM_Portal','Rate_Contract');
CREATE TYPE portal.rfq_status       AS ENUM ('Draft','Issued','Closed','Evaluated','Awarded','Cancelled');
CREATE TYPE portal.rfq_response     AS ENUM ('Invited','Quoted','Declined','No_Response');
CREATE TYPE portal.spec_compliance  AS ENUM ('Fully','Partially','Not_Compliant');
CREATE TYPE portal.bid_status       AS ENUM ('Received','Under_Evaluation','Ranked','Selected','Rejected');
CREATE TYPE portal.po_type          AS ENUM ('Standard','Rate_Contract','Blanket','Emergency','Service');
CREATE TYPE portal.po_stage         AS ENUM ('Draft','Approved','Sent','Acknowledged','Dispatched','In_Transit','Arrived_At_Gate','Partially_Received','Fully_Received','Invoiced','Closed','Cancelled','Short_Closed');
CREATE TYPE portal.po_change_type   AS ENUM ('Qty','Price','Delivery_Date','Item_Spec','Terms','Cancellation');
CREATE TYPE portal.po_line_status   AS ENUM ('Open','Partially_Received','Received','Closed');
CREATE TYPE portal.condition_status AS ENUM ('Open','Met','Breached','Waived');
CREATE TYPE portal.alert_severity   AS ENUM ('Info','Warning','Critical');
CREATE TYPE portal.alert_status     AS ENUM ('Open','Acknowledged','Closed');
CREATE TYPE portal.approval_action  AS ENUM ('Approved','Rejected','Returned','Delegated');

-- ---------- 5.1 Purchase requisition ----------
CREATE TABLE portal.purchase_requisition (
  pr_id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pr_no              varchar(20) NOT NULL UNIQUE,
  pr_type            portal.pr_type NOT NULL,
  raised_by_location varchar(10) REFERENCES portal.location,
  dept_code          varchar(20) NOT NULL REFERENCES ref.department,
  indent_id          varchar(20) REFERENCES portal.indent,
  budget_code        varchar(30) REFERENCES portal.budget_head,
  estimated_value    numeric(16,2),
  budget_available   numeric(16,2),                          -- snapshot at PR time
  justification      text,
  raised_date        date NOT NULL DEFAULT current_date,
  required_by_date   date,
  stores_head_approval varchar(20) REFERENCES ref.staff_master,
  finance_approval   varchar(20) REFERENCES ref.staff_master,
  principal_approval varchar(20) REFERENCES ref.staff_master,
  status             portal.pr_status NOT NULL DEFAULT 'Draft'
);
CREATE TABLE portal.pr_line (
  pr_line_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pr_id                bigint NOT NULL REFERENCES portal.purchase_requisition ON DELETE CASCADE,
  indent_id            varchar(20),
  indent_line_no       smallint,
  sku                  varchar(30) REFERENCES portal.material,
  specification        text,
  uom                  varchar(10) REFERENCES portal.unit_of_measure,
  qty_required         numeric(14,3) NOT NULL,
  estimated_unit_price numeric(14,2),
  estimated_total      numeric(16,2) GENERATED ALWAYS AS (qty_required * coalesce(estimated_unit_price,0)) STORED,
  delivery_location    varchar(10) REFERENCES portal.location,
  install_space_id     varchar(30) REFERENCES infra.space,
  po_line_id           bigint,                               -- FK po_line (added below)
  line_status          portal.pr_line_status NOT NULL DEFAULT 'Open',
  FOREIGN KEY (indent_id, indent_line_no) REFERENCES portal.indent_line (indent_id, line_no)
);
ALTER TABLE portal.indent_line ADD CONSTRAINT fk_indent_line_pr FOREIGN KEY (pr_line_id) REFERENCES portal.pr_line;

-- ---------- Section 6: quotation request, bids ----------
CREATE TABLE portal.rfq (                                    -- I14: one quotation request for one product
  rfq_id              varchar(20) PRIMARY KEY,               -- RFQ-2026-087
  pr_id               bigint REFERENCES portal.purchase_requisition,
  indent_id           varchar(20) REFERENCES portal.indent,
  sku                 varchar(30) NOT NULL REFERENCES portal.material,
  qty                 numeric(14,3) NOT NULL,
  floated_on          date NOT NULL DEFAULT current_date,
  due_date            date,
  rfq_mode            portal.rfq_mode NOT NULL DEFAULT 'Limited_Tender',
  min_quotes_required smallint NOT NULL DEFAULT 3,
  criteria_set_id     varchar(20),
  issued_by           integer REFERENCES portal.app_user,
  status              portal.rfq_status NOT NULL DEFAULT 'Draft'
);
CREATE TABLE portal.rfq_vendor (                             -- vendors invited
  rfq_id          varchar(20) NOT NULL REFERENCES portal.rfq ON DELETE CASCADE,
  vendor_id       varchar(20) NOT NULL REFERENCES portal.vendor,
  sent_date       date,
  response_status portal.rfq_response NOT NULL DEFAULT 'Invited',
  PRIMARY KEY (rfq_id, vendor_id)
);
CREATE TABLE portal.rfq_bid (                                -- I15: one vendor's bid on one request (quotation)
  rfq_id               varchar(20) NOT NULL REFERENCES portal.rfq ON DELETE CASCADE,
  vendor_id            varchar(20) NOT NULL REFERENCES portal.vendor,
  quotation_no         varchar(40),
  quotation_date       date,
  validity_date        date,
  offered_brand_model  varchar(120),
  spec_compliance      portal.spec_compliance,
  quoted_qty           numeric(14,3),
  unit_price           numeric(14,2) NOT NULL,
  discount_pct         numeric(5,2) NOT NULL DEFAULT 0,
  tax_pct              numeric(5,2) NOT NULL DEFAULT 0,
  lead_days            smallint,
  warranty_months      smallint,
  payment_terms        varchar(120),
  freight_included     boolean NOT NULL DEFAULT false,
  installation_included boolean NOT NULL DEFAULT false,
  attachment_doc_id    uuid,                                 -- FK shared.document (added in 040)
  status               portal.bid_status NOT NULL DEFAULT 'Received',
  PRIMARY KEY (rfq_id, vendor_id)
);
CREATE TABLE portal.vendor_evaluation (                      -- 5.8 score per criterion per bid
  evaluation_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rfq_id          varchar(20) NOT NULL,
  vendor_id       varchar(20) NOT NULL,
  criteria_set_id varchar(20) NOT NULL,
  criteria_id     varchar(20) NOT NULL,
  raw_value       varchar(60),
  score           numeric(5,2),                              -- normalised 0–10
  weighted_score  numeric(7,3),
  evaluated_by    varchar(20) REFERENCES ref.staff_master,
  evaluation_date date,
  remarks         text,
  FOREIGN KEY (rfq_id, vendor_id) REFERENCES portal.rfq_bid,
  FOREIGN KEY (criteria_set_id, criteria_id) REFERENCES portal.vendor_evaluation_criteria,
  UNIQUE (rfq_id, vendor_id, criteria_set_id, criteria_id)
);
CREATE TABLE portal.vendor_ranking (                         -- I17 NEW: vendor bid after scoring
  ranking_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rfq_id                varchar(20) NOT NULL,
  vendor_id             varchar(20) NOT NULL,
  total_weighted_score  numeric(8,3),
  rank                  smallint,                            -- 1 = best (L1 / T1)
  technically_qualified boolean NOT NULL DEFAULT false,
  is_selected           boolean NOT NULL DEFAULT false,
  selection_reason      text,                                -- mandatory when a vendor other than rank 1 is selected
  committee_approval_by varchar(20) REFERENCES ref.staff_master,
  approval_date         date,
  FOREIGN KEY (rfq_id, vendor_id) REFERENCES portal.rfq_bid,
  UNIQUE (rfq_id, vendor_id),
  CHECK (NOT is_selected OR rank = 1 OR selection_reason IS NOT NULL)
);

-- ---------- Section 6: purchase order ----------
CREATE TABLE portal.purchase_order (                         -- I18
  po_id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  office_no             varchar(40) NOT NULL UNIQUE,         -- KLEF-0410/PO-9681/2026-27
  po_date               date NOT NULL DEFAULT current_date,
  fy                    varchar(9) NOT NULL REFERENCES portal.po_counter,
  vendor_id             varchar(20) NOT NULL REFERENCES portal.vendor,
  indent_id             varchar(20) REFERENCES portal.indent,
  request_id            varchar(20) REFERENCES portal.new_request,
  rfq_id                varchar(20) REFERENCES portal.rfq,
  pr_id                 bigint REFERENCES portal.purchase_requisition,
  po_type               portal.po_type NOT NULL DEFAULT 'Standard',
  delivery_location     varchar(10) REFERENCES portal.location,
  delivery_address      text,
  expected_delivery_date date,
  advance_pct           numeric(5,2),
  prepared_by           integer REFERENCES portal.app_user,
  approved_by           varchar(20) REFERENCES ref.staff_master,
  approval_date         date,
  vendor_acknowledged_date date,
  stage                 portal.po_stage NOT NULL DEFAULT 'Draft',
  deleted_by            integer REFERENCES portal.app_user,
  -- EXTENDED by hostel: budget charged and hostel that benefits
  budget_code           varchar(30) REFERENCES portal.budget_head,
  facility_id           varchar(30) REFERENCES infra.facility
);
COMMENT ON TABLE portal.purchase_order IS 'Order header; the total is never stored — see portal.v_po_total';
CREATE TABLE portal.po_line (                                -- I19
  po_id         integer NOT NULL REFERENCES portal.purchase_order ON DELETE CASCADE,
  line_no       smallint NOT NULL,
  sku           varchar(30) NOT NULL REFERENCES portal.material,
  description   varchar(200),
  brand_model   varchar(120),
  qty           numeric(14,3) NOT NULL,
  uom           varchar(10) REFERENCES portal.unit_of_measure,
  unit_price    numeric(14,2) NOT NULL,
  discount_pct  numeric(5,2) NOT NULL DEFAULT 0,
  cgst_pct      numeric(5,2) NOT NULL DEFAULT 0,
  sgst_pct      numeric(5,2) NOT NULL DEFAULT 0,
  igst_pct      numeric(5,2) NOT NULL DEFAULT 0,
  qty_received  numeric(14,3) NOT NULL DEFAULT 0,            -- cumulative via GRN
  qty_rejected  numeric(14,3) NOT NULL DEFAULT 0,
  qty_pending   numeric(14,3) GENERATED ALWAYS AS (qty - qty_received) STORED,
  install_space_id varchar(30) REFERENCES infra.space,
  line_status   portal.po_line_status NOT NULL DEFAULT 'Open',
  PRIMARY KEY (po_id, line_no)
);
-- surrogate id for lines so other tables can point at one line
ALTER TABLE portal.po_line ADD COLUMN po_line_id bigint GENERATED ALWAYS AS IDENTITY UNIQUE;
ALTER TABLE portal.pr_line ADD CONSTRAINT fk_pr_line_po FOREIGN KEY (po_line_id) REFERENCES portal.po_line (po_line_id);
ALTER TABLE portal.stock_entry ADD CONSTRAINT fk_stock_entry_po FOREIGN KEY (matched_po_id) REFERENCES portal.purchase_order;

CREATE TABLE portal.po_terms (                               -- I20 printed terms, one row per order
  po_id             integer PRIMARY KEY REFERENCES portal.purchase_order ON DELETE CASCADE,
  taxes             varchar(60),                             -- GST Included
  delivery_schedule varchar(120),                            -- IMMEDIATE
  warranty          varchar(120),                            -- 2 YEARS WARRANTY
  warranty_months   smallint,
  jurisdiction      varchar(60),
  payment_terms     varchar(160),                            -- Advance %, credit days
  penalty_clause    text,
  terms_conditions  text
);
CREATE TABLE portal.po_event (                               -- I21 approval or action on an order
  po_id       integer NOT NULL REFERENCES portal.purchase_order ON DELETE CASCADE,
  event_no    smallint NOT NULL,
  actor_id    integer REFERENCES portal.app_user,
  role_code   varchar(30) REFERENCES portal.role,
  action      varchar(120) NOT NULL,                         -- Order prepared, Order approved
  note        text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (po_id, event_no)
);
CREATE TABLE portal.po_amendment (                           -- 5.13
  amendment_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id          integer NOT NULL REFERENCES portal.purchase_order,
  amendment_no   smallint NOT NULL,
  amendment_date date NOT NULL DEFAULT current_date,
  change_type    portal.po_change_type NOT NULL,
  old_value      text,
  new_value      text,
  reason         text,
  approved_by    varchar(20) REFERENCES ref.staff_master,
  UNIQUE (po_id, amendment_no)
);
CREATE TABLE portal.po_condition (                           -- I22 NEW: a printed condition that must be watched
  condition_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id          integer NOT NULL REFERENCES portal.purchase_order ON DELETE CASCADE,
  condition_text varchar(300) NOT NULL,                      -- "Deliver within 15 days", "Install before 1 Aug"
  due_date       date,
  watched_by     varchar(20) REFERENCES ref.staff_master,
  status         portal.condition_status NOT NULL DEFAULT 'Open',
  met_on         date
);
CREATE TABLE portal.po_alert (                               -- I23 NEW: alert on a purchase order
  alert_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id        integer NOT NULL REFERENCES portal.purchase_order,
  condition_id bigint REFERENCES portal.po_condition,
  alert_type   varchar(40) NOT NULL,                         -- Delivery_Overdue, Condition_Due, Payment_Due, Short_Supply
  severity     portal.alert_severity NOT NULL DEFAULT 'Warning',
  raised_at    timestamptz NOT NULL DEFAULT now(),
  assigned_to  varchar(20) REFERENCES ref.staff_master,
  acknowledged_at timestamptz,
  status       portal.alert_status NOT NULL DEFAULT 'Open'
);

CREATE TABLE portal.approval_log (                           -- 5.14 generic approval workflow log for portal documents
  approval_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_type portal.matrix_doc_type NOT NULL,
  document_id   varchar(40) NOT NULL,
  level         smallint NOT NULL,
  approver_role varchar(30) REFERENCES portal.role,
  approver_id   varchar(20) REFERENCES ref.staff_master,
  action        portal.approval_action NOT NULL,
  action_date   timestamptz NOT NULL DEFAULT now(),
  comments      text
);
CREATE INDEX ix_approval_log_doc ON portal.approval_log (document_type, document_id);
