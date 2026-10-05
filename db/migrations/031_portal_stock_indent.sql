-- =====================================================================
-- 031  portal — stock movement, stores register, indent & issue, new product request
--      Sources: portal sections 4, 5, 7, 9 ; inventory model Modules B and C
-- =====================================================================

CREATE TYPE portal.movement_type   AS ENUM ('Opening_Balance','Receipt','Issue','Transfer_Out','Transfer_In','Return_In','Return_To_Vendor','Adjustment_Plus','Adjustment_Minus','Scrap','Deployment','Physical_Count');
CREATE TYPE portal.transfer_type   AS ENUM ('Replenishment','Indent_Fulfilment','Rebalancing','Emergency');
CREATE TYPE portal.transfer_status AS ENUM ('Requested','Approved','Dispatched','Received','Partially_Received','Cancelled');
CREATE TYPE portal.return_reason   AS ENUM ('Surplus','Defective','Wrong_Item','Project_Closed','Replacement');
CREATE TYPE portal.return_condition AS ENUM ('Good','Repairable','Scrap');
CREATE TYPE portal.return_status   AS ENUM ('Raised','Accepted','Rejected');
CREATE TYPE portal.adjustment_type AS ENUM ('Physical_Count_Variance','Damage','Expiry','Theft','Write_Off','Correction');
CREATE TYPE portal.approval_status AS ENUM ('Pending','Approved','Rejected');
CREATE TYPE portal.count_type      AS ENUM ('Annual','Quarterly','Cycle','Surprise');
CREATE TYPE portal.count_status    AS ENUM ('Planned','In_Progress','Completed','Reconciled');
CREATE TYPE portal.receipt_status  AS ENUM ('Draft','Verified','Rejected');
CREATE TYPE portal.audit_status    AS ENUM ('Clear','Flagged','Cleared_By_Review');
CREATE TYPE portal.qty_basis       AS ENUM ('as_written','added_up','needs_a_person');
CREATE TYPE portal.indent_priority AS ENUM ('Normal','Urgent','Emergency');
CREATE TYPE portal.indent_status   AS ENUM ('Draft','Submitted','HOD_Approved','Stores_Verified','Partially_Issued','Issued','Sent_To_Purchase','Closed','Rejected');
CREATE TYPE portal.fulfilment_source AS ENUM ('Sub_Store','Central_Store_Transfer','Purchase','Not_Required');
CREATE TYPE portal.indent_line_status AS ENUM ('Pending','Available','Transfer_Requested','Purchase_Requested','Issued','Closed');
CREATE TYPE portal.issue_method    AS ENUM ('PIN','OTP','Signature');
CREATE TYPE portal.issue_status    AS ENUM ('Awaiting_Collection','Issued','Acknowledged','Partially_Returned','Closed');
CREATE TYPE portal.scrap_status    AS ENUM ('Pending','Received_At_Store','Scrapped');
CREATE TYPE portal.new_request_status AS ENUM ('Submitted','Recommended','Price_Checked','Registered','Rejected');

-- ---------- Section 7: every rise and fall of stock ----------
CREATE TABLE portal.stock_movement (
  movement_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moved_at       timestamptz NOT NULL DEFAULT now(),
  sku            varchar(30) NOT NULL REFERENCES portal.material,
  bin_code       varchar(20) NOT NULL REFERENCES portal.bin,
  batch_id       bigint REFERENCES portal.batch,
  qty            numeric(14,3) NOT NULL,                     -- + inward / – outward
  unit_cost      numeric(14,2),
  movement_type  portal.movement_type NOT NULL,
  actor_id       integer REFERENCES portal.app_user,
  -- exactly one source paper per row (filled in by later migrations as the tables are created)
  grn_id         varchar(20), issue_id varchar(20), receipt_id varchar(20), stock_entry_id varchar(20),
  deployment_id  varchar(20), srn_id varchar(20), transfer_id bigint, return_id bigint, adjustment_id bigint, rtv_id bigint, count_id bigint,
  balance_after  numeric(14,3),
  remarks        text
);
COMMENT ON TABLE portal.stock_movement IS 'Stock Transaction Ledger: each row names the one paper that caused it; portal.stock is derived from it';
CREATE INDEX ix_stock_movement_sku_bin ON portal.stock_movement (sku, bin_code, moved_at);

-- ---------- Section 4: Indent form ----------
CREATE TABLE portal.indent_step (
  step smallint PRIMARY KEY,                                 -- 0..7
  name varchar(80) NOT NULL                                  -- Indenter, HOD, Central Stores verification, ... Purchase, Department acknowledgement
);

CREATE TABLE portal.indent (                                 -- I1 EXTENDED by hostel
  indent_id          varchar(20) PRIMARY KEY,                -- IND-2026-0404
  dept_code          varchar(20) NOT NULL REFERENCES ref.department,
  raised_by          integer NOT NULL REFERENCES portal.app_user,
  raised_on          date NOT NULL DEFAULT current_date,
  need_by            date,
  purpose            text,
  priority           portal.indent_priority NOT NULL DEFAULT 'Normal',
  budget_code        varchar(30) REFERENCES portal.budget_head,
  workflow_step      smallint NOT NULL DEFAULT 0 REFERENCES portal.indent_step,
  target_space_id    varchar(30) REFERENCES infra.space,     -- room / lab / ground where items will be used
  work_order_id      bigint REFERENCES infra.work_order,     -- maintenance work order if for repair
  preferred_location varchar(10) REFERENCES portal.location, -- sub-store to fulfil from
  hod_approval_by    varchar(20) REFERENCES ref.staff_master,
  hod_approval_date  date,
  status             portal.indent_status NOT NULL DEFAULT 'Draft',
  -- EXTENDED by hostel (I1): the hostel that raised it and the ticket it serves
  facility_id        varchar(30) REFERENCES infra.facility,
  ticket_id          bigint REFERENCES infra.maintenance_ticket
);
CREATE TABLE portal.indent_line (
  indent_id             varchar(20) NOT NULL REFERENCES portal.indent ON DELETE CASCADE,
  sku                   varchar(30) REFERENCES portal.material,   -- null when the item is not yet in the catalogue
  item_description      varchar(200),
  specification         text,
  uom                   varchar(10) REFERENCES portal.unit_of_measure,
  qty                   numeric(14,3) NOT NULL,              -- requested
  qty_approved          numeric(14,3),
  unit_price_at_indent  numeric(14,2),
  qty_available_substore numeric(14,3),                      -- snapshot at check
  qty_available_central numeric(14,3),
  fulfilment_source     portal.fulfilment_source,
  qty_issued            numeric(14,3) NOT NULL DEFAULT 0,
  qty_to_purchase       numeric(14,3) NOT NULL DEFAULT 0,    -- shortfall -> purchase requisition line
  pr_line_id            bigint,                              -- FK pr_line (added in 032)
  line_status           portal.indent_line_status NOT NULL DEFAULT 'Pending',
  line_no               smallint NOT NULL DEFAULT 1,
  PRIMARY KEY (indent_id, line_no)
);
CREATE TABLE portal.indent_event (
  indent_id   varchar(20) NOT NULL REFERENCES portal.indent ON DELETE CASCADE,
  event_no    smallint NOT NULL,
  actor_id    integer REFERENCES portal.app_user,
  role_code   varchar(30) REFERENCES portal.role,
  action      varchar(120) NOT NULL,                         -- Indenter submitted, HOD completed
  note        text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (indent_id, event_no)
);
CREATE TABLE portal.stock_check (
  indent_id  varchar(20) PRIMARY KEY REFERENCES portal.indent,
  checked_by integer REFERENCES portal.app_user,
  checked_on timestamptz NOT NULL DEFAULT now(),
  note       text
);
CREATE TABLE portal.stock_check_line (
  indent_id          varchar(20) NOT NULL REFERENCES portal.stock_check ON DELETE CASCADE,
  sku                varchar(30) NOT NULL REFERENCES portal.material,
  on_hand_at_check   numeric(14,3) NOT NULL,
  available_at_check numeric(14,3) NOT NULL,
  issue_qty          numeric(14,3) NOT NULL,
  remark             varchar(160),
  PRIMARY KEY (indent_id, sku)
);
CREATE TABLE portal.stock_reservation (
  indent_id varchar(20) NOT NULL REFERENCES portal.indent,
  sku       varchar(30) NOT NULL REFERENCES portal.material,
  bin_code  varchar(20) NOT NULL REFERENCES portal.bin,
  qty       numeric(14,3) NOT NULL,
  PRIMARY KEY (indent_id, sku, bin_code)
);
CREATE TABLE portal.scrap_return (                           -- old item handed back when a replacement is issued
  srn_id      varchar(20) PRIMARY KEY,                       -- SRN-2026-0001
  indent_id   varchar(20) REFERENCES portal.indent,
  sku         varchar(30) REFERENCES portal.material,
  old_serial  varchar(80),
  asset_id    varchar(40) REFERENCES infra.asset_master,
  received_by integer REFERENCES portal.app_user,
  received_on date,
  status      portal.scrap_status NOT NULL DEFAULT 'Pending'
);

-- ---------- Section 7: issue to department ----------
CREATE TABLE portal.material_issue (                         -- I9 EXTENDED by hostel
  issue_id              varchar(20) PRIMARY KEY,             -- ISS-2026-0602
  indent_id             varchar(20) NOT NULL REFERENCES portal.indent,
  location_code         varchar(10) REFERENCES portal.location,   -- issuing store
  dept_code             varchar(20) REFERENCES ref.department,
  issued_on             date NOT NULL DEFAULT current_date,
  issued_by             integer REFERENCES portal.app_user,
  collected_by          integer REFERENCES portal.app_user,
  delivered_to_space_id varchar(30) REFERENCES infra.space,  -- room / lab where delivered
  method                portal.issue_method,
  acknowledged_by       varchar(20) REFERENCES ref.staff_master,
  acknowledged_on       date,
  status                portal.issue_status NOT NULL DEFAULT 'Awaiting_Collection',
  -- EXTENDED by hostel (I9): issue against a hostel room / ticket
  hostel_alloc_id       bigint,                              -- FK hostel.hostel_allocation (added in 051)
  ticket_id             bigint REFERENCES infra.maintenance_ticket
);
CREATE TABLE portal.material_issue_line (
  issue_id   varchar(20) NOT NULL REFERENCES portal.material_issue ON DELETE CASCADE,
  sku        varchar(30) NOT NULL REFERENCES portal.material,
  bin_code   varchar(20) NOT NULL REFERENCES portal.bin,
  batch_id   bigint REFERENCES portal.batch,
  serial_no  varchar(80),
  qty        numeric(14,3) NOT NULL,
  unit_cost  numeric(14,2),
  total_cost numeric(16,2) GENERATED ALWAYS AS (qty * coalesce(unit_cost, 0)) STORED,
  asset_id   varchar(40) REFERENCES infra.asset_master,      -- asset created if a capital item is placed directly
  PRIMARY KEY (issue_id, sku, bin_code)
);

CREATE TABLE portal.dept_consumption (                       -- 4.5 department-level register
  consumption_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dept_code      varchar(20) NOT NULL REFERENCES ref.department,
  space_id       varchar(30) REFERENCES infra.space,
  sku            varchar(30) NOT NULL REFERENCES portal.material,
  issue_id       varchar(20) REFERENCES portal.material_issue,
  qty_received   numeric(14,3) NOT NULL DEFAULT 0,
  qty_consumed   numeric(14,3) NOT NULL DEFAULT 0,
  qty_returned   numeric(14,3) NOT NULL DEFAULT 0,
  qty_in_hand    numeric(14,3) GENERATED ALWAYS AS (qty_received - qty_consumed - qty_returned) STORED,
  custodian_id   varchar(20) REFERENCES ref.staff_master,
  period         varchar(20)                                 -- month / semester
);

-- ---------- Section 7: receipt from outside the order route, stock entry with proof ----------
CREATE TABLE portal.receipt (                                -- donation / sample / outside receipt
  receipt_id  varchar(20) PRIMARY KEY,                       -- RCPT-0001
  sku         varchar(30) NOT NULL REFERENCES portal.material,
  qty         numeric(14,3) NOT NULL,
  unit_price  numeric(14,2),
  bin_code    varchar(20) NOT NULL REFERENCES portal.bin,
  reference   varchar(160),                                  -- Donation letter DL/26/14
  owner_id    integer REFERENCES portal.app_user,
  verified_by integer REFERENCES portal.app_user,
  received_on date NOT NULL DEFAULT current_date,
  status      portal.receipt_status NOT NULL DEFAULT 'Draft'
);
CREATE TABLE portal.stock_entry (                            -- stock brought in with proof, checked automatically
  entry_id          varchar(20) PRIMARY KEY,                 -- STE-2026-0001
  entry_on          date NOT NULL DEFAULT current_date,
  sku               varchar(30) NOT NULL REFERENCES portal.material,
  bin_code          varchar(20) NOT NULL REFERENCES portal.bin,
  qty               numeric(14,3) NOT NULL,
  unit_price        numeric(14,2),
  actor_id          integer REFERENCES portal.app_user,
  matched_po_id     integer,                                 -- FK purchase_order (added in 032)
  matched_indent_id varchar(20) REFERENCES portal.indent,
  audit_status      portal.audit_status NOT NULL DEFAULT 'Clear'
);
CREATE TABLE portal.stock_entry_finding (
  entry_id   varchar(20) NOT NULL REFERENCES portal.stock_entry ON DELETE CASCADE,
  finding_no smallint NOT NULL,
  finding    varchar(200) NOT NULL,                          -- Invoice date is after the entry date
  PRIMARY KEY (entry_id, finding_no)
);

-- ---------- Module B: transfers, returns, adjustments, counts ----------
CREATE TABLE portal.stock_transfer (
  transfer_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_no   varchar(20) NOT NULL UNIQUE,
  from_location varchar(10) NOT NULL REFERENCES portal.location,
  to_location   varchar(10) NOT NULL REFERENCES portal.location,
  transfer_type portal.transfer_type NOT NULL,
  indent_id     varchar(20) REFERENCES portal.indent,
  requested_by  varchar(20) REFERENCES ref.staff_master,
  approved_by   varchar(20) REFERENCES ref.staff_master,
  request_date  date NOT NULL DEFAULT current_date,
  dispatch_date date,
  receipt_date  date,
  status        portal.transfer_status NOT NULL DEFAULT 'Requested',
  CHECK (from_location <> to_location)
);
CREATE TABLE portal.stock_transfer_line (
  transfer_line_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_id      bigint NOT NULL REFERENCES portal.stock_transfer ON DELETE CASCADE,
  sku              varchar(30) NOT NULL REFERENCES portal.material,
  batch_id         bigint REFERENCES portal.batch,
  qty_requested    numeric(14,3) NOT NULL,
  qty_dispatched   numeric(14,3),
  qty_received     numeric(14,3),
  discrepancy_qty  numeric(14,3) GENERATED ALWAYS AS (coalesce(qty_dispatched,0) - coalesce(qty_received,0)) STORED,
  remarks          text
);
CREATE TABLE portal.stock_return (                           -- department -> store
  return_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  return_no     varchar(20) NOT NULL UNIQUE,
  from_dept     varchar(20) NOT NULL REFERENCES ref.department,
  from_space_id varchar(30) REFERENCES infra.space,
  to_location   varchar(10) NOT NULL REFERENCES portal.location,
  issue_id      varchar(20) REFERENCES portal.material_issue,
  return_reason portal.return_reason NOT NULL,
  returned_by   varchar(20) REFERENCES ref.staff_master,
  received_by   varchar(20) REFERENCES ref.staff_master,
  return_date   date NOT NULL DEFAULT current_date,
  condition     portal.return_condition NOT NULL,
  status        portal.return_status NOT NULL DEFAULT 'Raised'
);
CREATE TABLE portal.stock_adjustment (
  adjustment_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_code   varchar(10) NOT NULL REFERENCES portal.location,
  sku             varchar(30) NOT NULL REFERENCES portal.material,
  bin_code        varchar(20) REFERENCES portal.bin,
  adjustment_type portal.adjustment_type NOT NULL,
  qty_adjusted    numeric(14,3) NOT NULL,                    -- + / –
  value_adjusted  numeric(16,2),
  reason          text NOT NULL,
  requested_by    varchar(20) REFERENCES ref.staff_master,
  approved_by     varchar(20) REFERENCES ref.staff_master,
  adjustment_date date NOT NULL DEFAULT current_date,
  status          portal.approval_status NOT NULL DEFAULT 'Pending'
);
CREATE TABLE portal.physical_count (
  count_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_code varchar(10) NOT NULL REFERENCES portal.location,
  count_type    portal.count_type NOT NULL,
  count_date    date NOT NULL,
  counted_by    varchar(20) REFERENCES ref.staff_master,
  verified_by   varchar(20) REFERENCES ref.staff_master,
  status        portal.count_status NOT NULL DEFAULT 'Planned'
);
CREATE TABLE portal.physical_count_line (
  count_line_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  count_id       bigint NOT NULL REFERENCES portal.physical_count ON DELETE CASCADE,
  sku            varchar(30) NOT NULL REFERENCES portal.material,
  bin_code       varchar(20) NOT NULL REFERENCES portal.bin,
  system_qty     numeric(14,3) NOT NULL,
  counted_qty    numeric(14,3) NOT NULL,
  variance_qty   numeric(14,3) GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  variance_value numeric(16,2),
  adjustment_id  bigint REFERENCES portal.stock_adjustment
);

-- ---------- Section 9: the stores workbook kept word for word ----------
CREATE TABLE portal.stock_sheet (
  sheet_id    integer PRIMARY KEY,
  sheet_name  varchar(80) NOT NULL,                          -- Electrical, AC-Compressor Stock
  source_file varchar(120) NOT NULL,                         -- FINAL STOCK FILE.xlsx
  sheet_order smallint NOT NULL,
  counted_on  date
);
CREATE TABLE portal.stock_sheet_line (
  sheet_id      integer NOT NULL REFERENCES portal.stock_sheet ON DELETE CASCADE,
  line_no       integer NOT NULL,
  sl_no         varchar(10),
  material_name varchar(160) NOT NULL,
  make          varchar(80),
  unit          varchar(20),
  qty_text      varchar(40),                                 -- "02 + 01" exactly as written
  qty_value     numeric(14,3),
  qty_basis     portal.qty_basis NOT NULL DEFAULT 'as_written',
  remarks       text,
  sku           varchar(30) REFERENCES portal.material,      -- filled once matched to a product
  PRIMARY KEY (sheet_id, line_no)
);

-- ---------- Section 5: new product request ----------
CREATE TABLE portal.new_request (
  request_id      varchar(20) PRIMARY KEY,                   -- NPR-2026-0001
  dept_code       varchar(20) NOT NULL REFERENCES ref.department,
  raised_by       integer NOT NULL REFERENCES portal.app_user,
  raised_on       date NOT NULL DEFAULT current_date,
  product         varchar(160) NOT NULL,
  brand           varchar(80),
  specification   text,
  qty             numeric(14,3) NOT NULL,
  uom             varchar(10) REFERENCES portal.unit_of_measure,
  estimated_price numeric(14,2),
  category_code   varchar(10) REFERENCES portal.category,
  indent_id       varchar(20) REFERENCES portal.indent,
  step            smallint NOT NULL DEFAULT 1,
  registered_sku  varchar(30) REFERENCES portal.material,    -- the product once registered
  status          portal.new_request_status NOT NULL DEFAULT 'Submitted'
);
CREATE TABLE portal.new_request_event (
  request_id  varchar(20) NOT NULL REFERENCES portal.new_request ON DELETE CASCADE,
  event_no    smallint NOT NULL,
  actor_id    integer REFERENCES portal.app_user,
  role_code   varchar(30) REFERENCES portal.role,
  action      varchar(120) NOT NULL,
  note        text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, event_no)
);
