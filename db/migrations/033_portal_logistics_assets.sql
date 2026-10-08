-- =====================================================================
-- 033  portal — logistics, goods receipt, quality, return to vendor, deployment/installation,
--      commissioning, asset capitalisation & transfer, equipment cover, AMC renewals, service tickets
--      Sources: portal sections 7 and 8 ; inventory model Modules E and F ; hostel I25–I33
-- =====================================================================

CREATE TYPE portal.freight_paid_by     AS ENUM ('Vendor','Institute');
CREATE TYPE portal.shipment_status     AS ENUM ('Dispatched','In_Transit','At_Gate','Received','Damaged_In_Transit','Returned');
CREATE TYPE portal.tracking_source     AS ENUM ('Vendor','Transporter_API','Store_Staff');
CREATE TYPE portal.gate_status         AS ENUM ('Entered','Sent_To_Store','Exited');
CREATE TYPE portal.grn_status          AS ENUM ('Draft','Under_Inspection','Accepted','Partially_Accepted','Rejected','Posted');
CREATE TYPE portal.inspection_kind     AS ENUM ('Visual','Functional','Sample_Test','Full_Test','Third_Party');
CREATE TYPE portal.inspection_result   AS ENUM ('Accepted','Partially_Accepted','Rejected');
CREATE TYPE portal.pass_fail           AS ENUM ('Pass','Fail');
CREATE TYPE portal.rtv_reason          AS ENUM ('Damaged','Spec_Mismatch','Excess','Expired','Defective_In_Warranty');
CREATE TYPE portal.rtv_action          AS ENUM ('Replace','Credit_Note','Refund','Repair');
CREATE TYPE portal.rtv_status          AS ENUM ('Raised','Vendor_Notified','Returned','Replaced','Credited','Closed');
CREATE TYPE portal.installed_by_type   AS ENUM ('Vendor','Internal_Maintenance_Team','Third_Party');
CREATE TYPE portal.deployment_status   AS ENUM ('Requested','Approved','Planned','Site_Not_Ready','In_Progress','Installed','Commissioned','Handed_Over','Failed');
CREATE TYPE portal.test_result         AS ENUM ('Pass','Fail','Conditional');
CREATE TYPE portal.asset_tag_status    AS ENUM ('In_Store','Installed','Under_Repair','Transferred','Scrapped','Disposed');
CREATE TYPE portal.depreciation_method AS ENUM ('SLM','WDV');
CREATE TYPE portal.capitalisation_status AS ENUM ('Capitalised','Transferred','Disposed');
CREATE TYPE portal.amc_renewal_status  AS ENUM ('Proposed','Pending_Finance','Approved','Rejected','Renewed');
CREATE TYPE portal.service_ticket_status AS ENUM ('Open','Vendor_Called','Repaired','Replaced','Closed');

-- ---------- 6.1–6.4 Shipment, tracking, gate entry ----------
CREATE TABLE portal.shipment (
  shipment_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id                 integer NOT NULL REFERENCES portal.purchase_order,
  vendor_id             varchar(20) NOT NULL REFERENCES portal.vendor,
  transporter_id        varchar(20) REFERENCES portal.transporter,
  dispatch_date         date,
  lr_docket_no          varchar(60),                         -- lorry receipt / AWB / tracking number
  vehicle_no            varchar(20),
  driver_name_contact   varchar(120),
  e_way_bill_no         varchar(30),
  no_of_packages        integer,
  gross_weight_kg       numeric(10,2),
  freight_charges       numeric(12,2),
  freight_paid_by       portal.freight_paid_by,
  insurance_ref         varchar(60),
  expected_arrival_date date,
  actual_arrival_date   date,
  status                portal.shipment_status NOT NULL DEFAULT 'Dispatched'
);
CREATE TABLE portal.shipment_tracking (
  tracking_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id  bigint NOT NULL REFERENCES portal.shipment ON DELETE CASCADE,
  event_time   timestamptz NOT NULL DEFAULT now(),
  location     varchar(120),
  event_status varchar(60),                                  -- Picked up / In transit / Out for delivery / Delivered
  updated_by   portal.tracking_source NOT NULL
);
CREATE TABLE portal.gate_entry (                             -- security register for incoming goods
  gate_entry_id     varchar(20) PRIMARY KEY,                 -- GE-1187
  shipment_id       bigint REFERENCES portal.shipment,
  entry_datetime    timestamptz NOT NULL DEFAULT now(),
  vehicle_no        varchar(20),
  invoice_challan_no varchar(60),
  no_of_packages    integer,
  security_staff_id varchar(20) REFERENCES ref.staff_master,
  status            portal.gate_status NOT NULL DEFAULT 'Entered'
);

-- ---------- 6.5 Goods received against an order line (portal grn, one row per order line) ----------
CREATE TABLE portal.grn (                                    -- I25
  grn_id              varchar(20) PRIMARY KEY,               -- GRN-2026-0219
  po_id               integer NOT NULL,
  line_no             smallint NOT NULL,
  shipment_id         bigint REFERENCES portal.shipment,
  gate_entry_id       varchar(20) REFERENCES portal.gate_entry,
  vendor_invoice_no   varchar(60),
  vendor_invoice_date date,
  received_on         date NOT NULL DEFAULT current_date,
  receiving_location  varchar(10) REFERENCES portal.location,
  received_by         integer REFERENCES portal.app_user,
  bin_code            varchar(20) REFERENCES portal.bin,     -- put-away shelf
  batch_id            bigint REFERENCES portal.batch,
  serial_nos          text,                                  -- comma list when serialised; also rows in serialised_stock
  qty_delivered       numeric(14,3),                         -- as per challan
  qty_received        numeric(14,3) NOT NULL,                -- physically counted
  accepted_qty        numeric(14,3) NOT NULL DEFAULT 0,      -- passed inspection
  qty_rejected        numeric(14,3) NOT NULL DEFAULT 0,
  qty_short           numeric(14,3) GENERATED ALWAYS AS (coalesce(qty_delivered,0) - qty_received) STORED,
  unit_price          numeric(14,2),                         -- from the order line
  accepted_value      numeric(16,2) GENERATED ALWAYS AS (accepted_qty * coalesce(unit_price,0)) STORED,
  inspection_required boolean NOT NULL DEFAULT false,
  warranty_start      date,
  warranty_end        date,
  status              portal.grn_status NOT NULL DEFAULT 'Draft',
  FOREIGN KEY (po_id, line_no) REFERENCES portal.po_line (po_id, line_no)
);
ALTER TABLE portal.serialised_stock ADD CONSTRAINT fk_serial_grn FOREIGN KEY (grn_id) REFERENCES portal.grn;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_grn     FOREIGN KEY (grn_id)     REFERENCES portal.grn;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_issue   FOREIGN KEY (issue_id)   REFERENCES portal.material_issue;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_receipt FOREIGN KEY (receipt_id) REFERENCES portal.receipt;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_entry   FOREIGN KEY (stock_entry_id) REFERENCES portal.stock_entry;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_srn     FOREIGN KEY (srn_id)     REFERENCES portal.scrap_return;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_transfer FOREIGN KEY (transfer_id) REFERENCES portal.stock_transfer;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_return  FOREIGN KEY (return_id)  REFERENCES portal.stock_return;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_adj     FOREIGN KEY (adjustment_id) REFERENCES portal.stock_adjustment;
ALTER TABLE portal.stock_movement   ADD CONSTRAINT fk_mv_count   FOREIGN KEY (count_id)   REFERENCES portal.physical_count;

-- ---------- 6.7–6.8 Quality inspection ----------
CREATE TABLE portal.quality_inspection (                     -- I26 NEW: inspection of a receipt
  inspection_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grn_id            varchar(20) NOT NULL UNIQUE REFERENCES portal.grn,
  inspection_date   date NOT NULL DEFAULT current_date,
  inspected_by      varchar(20) REFERENCES ref.staff_master,
  inspection_type   portal.inspection_kind NOT NULL,
  checklist_ref     varchar(80),
  overall_result    portal.inspection_result,
  remarks           text,
  report_doc_id     uuid                                     -- FK shared.document (added in 040)
);
CREATE TABLE portal.quality_inspection_line (
  inspection_line_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspection_id      bigint NOT NULL REFERENCES portal.quality_inspection ON DELETE CASCADE,
  parameter          varchar(120) NOT NULL,
  expected_value     varchar(120),
  observed_value     varchar(120),
  result             portal.pass_fail NOT NULL,
  qty_accepted       numeric(14,3),
  qty_rejected       numeric(14,3),
  rejection_reason   varchar(160)
);

-- ---------- 6.9 Return to vendor ----------
CREATE TABLE portal.return_to_vendor (                       -- I27 NEW: rejected quantity sent back
  rtv_id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rtv_no             varchar(20) NOT NULL UNIQUE,
  grn_id             varchar(20) NOT NULL REFERENCES portal.grn,
  vendor_id          varchar(20) NOT NULL REFERENCES portal.vendor,
  sku                varchar(30) NOT NULL REFERENCES portal.material,
  qty_returned       numeric(14,3) NOT NULL,
  return_reason      portal.rtv_reason NOT NULL,
  return_action      portal.rtv_action NOT NULL,
  return_date        date,
  transporter_id     varchar(20) REFERENCES portal.transporter,
  debit_note_id      bigint,                                 -- FK debit_note (added in 034)
  replacement_grn_id varchar(20) REFERENCES portal.grn,
  status             portal.rtv_status NOT NULL DEFAULT 'Raised'
);
ALTER TABLE portal.stock_movement ADD CONSTRAINT fk_mv_rtv FOREIGN KEY (rtv_id) REFERENCES portal.return_to_vendor;

-- ---------- Section 8 + 7.1: deployment = stock sent out for installation (installation work order) ----------
CREATE TABLE portal.deployment (                             -- I28 EXTENDED
  deployment_id          varchar(20) PRIMARY KEY,            -- DEP-2026-0001
  dept_code              varchar(20) NOT NULL REFERENCES ref.department,
  po_id                  integer REFERENCES portal.purchase_order,
  grn_id                 varchar(20) REFERENCES portal.grn,
  sku                    varchar(30) NOT NULL REFERENCES portal.material,
  from_bin               varchar(20) REFERENCES portal.bin,
  qty                    numeric(14,3) NOT NULL DEFAULT 1,
  serial_no              varchar(80),
  custodian              varchar(120),                       -- Lab in-charge, CSE
  custodian_staff_id     varchar(20) REFERENCES ref.staff_master,
  facility_id            varchar(30) REFERENCES infra.facility,
  space_id               varchar(30) REFERENCES infra.space,      -- designated room / lab / court
  subspace_id            varchar(30) REFERENCES infra.subspace,   -- bed / workstation (optional)
  installed_by_type      portal.installed_by_type,
  vendor_id              varchar(20) REFERENCES portal.vendor,
  technician_id          varchar(20) REFERENCES infra.technician,
  scheduled_date         date,
  site_readiness_checked boolean NOT NULL DEFAULT false,
  pre_install_checklist  text,
  actual_start           timestamptz,
  actual_end             timestamptz,
  installation_cost      numeric(12,2),
  status                 portal.deployment_status NOT NULL DEFAULT 'Requested',
  -- EXTENDED by hostel (I28): installation against a hostel ticket / room
  ticket_id              bigint REFERENCES infra.maintenance_ticket
);
COMMENT ON TABLE portal.deployment IS 'Stock sent out for installation = Installation Work Order (7.1); items with requires_installation cannot be Installed without a space_id';
ALTER TABLE portal.stock_movement ADD CONSTRAINT fk_mv_deployment FOREIGN KEY (deployment_id) REFERENCES portal.deployment;
CREATE TABLE portal.deployment_event (                       -- I29
  deployment_id varchar(20) NOT NULL REFERENCES portal.deployment ON DELETE CASCADE,
  event_no      smallint NOT NULL,
  actor_id      integer REFERENCES portal.app_user,
  action        varchar(120) NOT NULL,                       -- Requested, Approved by Stores General Manager, Installed
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deployment_id, event_no)
);
CREATE TABLE portal.commissioning_handover (                 -- 7.2
  commission_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deployment_id        varchar(20) NOT NULL UNIQUE REFERENCES portal.deployment,
  commissioning_date   date,
  tested_by            varchar(20) REFERENCES ref.staff_master,
  test_result          portal.test_result,
  test_report_doc_id   uuid,
  handed_over_to       varchar(20) REFERENCES ref.staff_master,   -- custodian (HOD / warden / coach)
  handover_date        date,
  training_provided    boolean NOT NULL DEFAULT false,
  user_manual_received boolean NOT NULL DEFAULT false,
  warranty_card_ref    varchar(80),
  amc_id               varchar(30) REFERENCES infra.amc_contract,
  remarks              text
);

-- ---------- Tagged items (portal asset) and fixed-asset register ----------
CREATE TABLE portal.asset (                                  -- I30 EXTENDED: tagged item tracked one by one
  asset_tag     varchar(40) PRIMARY KEY,                     -- KLU-AST-2026-0001 (same value as infra.asset_master.asset_id once capitalised)
  sku           varchar(30) NOT NULL REFERENCES portal.material,
  serial_no     varchar(80),
  dept_code     varchar(20) REFERENCES ref.department,
  deployment_id varchar(20) REFERENCES portal.deployment,
  grn_id        varchar(20) REFERENCES portal.grn,
  receipt_id    varchar(20) REFERENCES portal.receipt,
  asset_id      varchar(40) REFERENCES infra.asset_master,   -- link to the infrastructure asset record
  status        portal.asset_tag_status NOT NULL DEFAULT 'In_Store',
  -- EXTENDED by hostel (I30): room the item is placed in, for room handover checklists
  space_id      varchar(30) REFERENCES infra.space
);
CREATE TABLE portal.asset_capitalisation (                   -- I32 NEW: asset entered in the fixed-asset register
  capitalisation_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id            varchar(40) NOT NULL UNIQUE REFERENCES infra.asset_master,
  asset_tag           varchar(40) REFERENCES portal.asset,
  deployment_id       varchar(20) REFERENCES portal.deployment,
  grn_id              varchar(20) REFERENCES portal.grn,
  po_id               integer REFERENCES portal.purchase_order,
  sku                 varchar(30) NOT NULL REFERENCES portal.material,
  serial_no           varchar(80),
  space_id            varchar(30) REFERENCES infra.space,
  capitalisation_date date NOT NULL,
  purchase_cost       numeric(14,2) NOT NULL,
  freight_cost        numeric(12,2) NOT NULL DEFAULT 0,
  installation_cost   numeric(12,2) NOT NULL DEFAULT 0,
  capitalised_value   numeric(16,2) GENERATED ALWAYS AS (purchase_cost + freight_cost + installation_cost) STORED,
  depreciation_method portal.depreciation_method,
  useful_life_years   smallint,
  salvage_value       numeric(14,2),
  asset_gl_account_id varchar(20) REFERENCES portal.gl_account,
  custodian_id        varchar(20) REFERENCES ref.staff_master,
  status              portal.capitalisation_status NOT NULL DEFAULT 'Capitalised'
);
CREATE TABLE portal.asset_transfer (                         -- I33 NEW: move of an asset between rooms or departments
  asset_transfer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id          varchar(40) NOT NULL REFERENCES infra.asset_master,
  from_space_id     varchar(30) REFERENCES infra.space,
  to_space_id       varchar(30) REFERENCES infra.space,
  from_dept         varchar(20) REFERENCES ref.department,
  to_dept           varchar(20) REFERENCES ref.department,
  transfer_date     date NOT NULL DEFAULT current_date,
  reason            text,
  approved_by       varchar(20) REFERENCES ref.staff_master
);

-- ---------- Section 8: cover, AMC renewal, service ticket ----------
CREATE TABLE portal.equipment_cover (                        -- I31: warranty and contract per item per store
  sku             varchar(30) NOT NULL REFERENCES portal.material,
  location_code   varchar(10) NOT NULL REFERENCES portal.location,
  amc_expiry      date,
  warranty_expiry date,
  PRIMARY KEY (sku, location_code)
);
CREATE TABLE portal.amc_renewal (
  renewal_id    varchar(20) PRIMARY KEY,                     -- AMC-0001
  sku           varchar(30) NOT NULL REFERENCES portal.material,
  location_code varchar(10) NOT NULL REFERENCES portal.location,
  amc_id        varchar(30) REFERENCES infra.amc_contract,
  requested_by  integer REFERENCES portal.app_user,
  old_expiry    date,
  new_expiry    date,
  cost          numeric(12,2),
  status        portal.amc_renewal_status NOT NULL DEFAULT 'Proposed'
);
CREATE TABLE portal.amc_renewal_decision (
  renewal_id  varchar(20) NOT NULL REFERENCES portal.amc_renewal ON DELETE CASCADE,
  decision_no smallint NOT NULL,
  actor_id    integer REFERENCES portal.app_user,
  role_code   varchar(30) REFERENCES portal.role,
  action      varchar(120) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (renewal_id, decision_no)
);
CREATE TABLE portal.service_ticket (                         -- fault raised on a tagged asset (stores side)
  ticket_id  varchar(20) PRIMARY KEY,                        -- TKT-2026-0001
  asset_tag  varchar(40) NOT NULL REFERENCES portal.asset,
  issue      varchar(200) NOT NULL,
  priority   infra.priority NOT NULL DEFAULT 'Medium',
  opened_by  integer REFERENCES portal.app_user,
  opened_at  timestamptz NOT NULL DEFAULT now(),
  maintenance_ticket_id bigint REFERENCES infra.maintenance_ticket,   -- the campus maintenance ticket, if raised
  status     portal.service_ticket_status NOT NULL DEFAULT 'Open'
);
