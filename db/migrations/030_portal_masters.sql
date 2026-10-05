-- =====================================================================
-- 030  portal — masters. Sources:
--   KLU Stock and Purchase Portal, "Every table of the portal, normalised" (53 tables, schema portal, PostgreSQL 18)
--   Material Master normalisation (TallyPrime, 48 attributes -> 14 tables)
--   Inventory, Stores, Procurement & Accounts data model (Module A Master Data, Module G Accounts masters)
-- Merge rules:
--   portal.material  = portal.material + Item Master + Tally material (31 columns)
--   portal.location  = portal.location (store) + Store Master + Tally godown (tree)
--   portal.vendor    = portal.vendor + Vendor Master (one shared vendor table for maintenance and purchase)
--   portal.category / sub_category keep the portal's two-level product classification; stock_group keeps Tally's tree
-- =====================================================================

-- ---------- enums ----------
CREATE TYPE portal.item_nature       AS ENUM ('Consumable','Capital_Asset','Spare_Part','Service');
CREATE TYPE portal.valuation_method  AS ENUM ('FIFO','Weighted_Average','Standard','Average_Cost','Average_Price');
CREATE TYPE portal.taxability        AS ENUM ('Taxable','Exempt','Nil_Rated');
CREATE TYPE portal.material_status   AS ENUM ('Active','Discontinued','Blocked');
CREATE TYPE portal.ledger_group      AS ENUM ('Purchase_Accounts','Sales_Accounts','Expense','Asset','Liability','Income','Equity');
CREATE TYPE portal.store_type        AS ENUM ('Central','Department_SubStore','Hostel_SubStore','Sports_SubStore','Maintenance_SubStore','Lab_Store','Godown');
CREATE TYPE portal.store_status      AS ENUM ('Active','Closed');
CREATE TYPE portal.storage_condition AS ENUM ('Normal','Cold','Hazardous','Secure');
CREATE TYPE portal.bin_status        AS ENUM ('Active','Blocked');
CREATE TYPE portal.vendor_type       AS ENUM ('Manufacturer','Distributor','Dealer','Service_Provider','Transporter');
CREATE TYPE portal.vendor_status     AS ENUM ('Active','Inactive','Blacklisted');
CREATE TYPE portal.transport_mode    AS ENUM ('Road','Rail','Air','Courier');
CREATE TYPE portal.tax_type          AS ENUM ('GST','TDS','Cess');
CREATE TYPE portal.gl_account_type   AS ENUM ('Asset','Liability','Expense','Income','Equity');
CREATE TYPE portal.budget_category   AS ENUM ('Capital','Revenue_Consumables','Maintenance','Sports','Hostel','Lab','IT');
CREATE TYPE portal.budget_status     AS ENUM ('Active','Frozen','Closed');
CREATE TYPE portal.serial_status     AS ENUM ('In_Store','Issued','Installed','Under_Repair','Scrapped');
CREATE TYPE portal.replenish_from    AS ENUM ('Central_Store','Purchase');
CREATE TYPE portal.scoring_method    AS ENUM ('Lowest_Best','Highest_Best','Manual_1_to_5');
CREATE TYPE portal.matrix_doc_type   AS ENUM ('PR','PO','Payment','Indent','GRN','Invoice','Adjustment','Stock_Entry','Deployment');

-- ---------- Section 2: People and access (portal sign-in) ----------
CREATE TABLE portal.role (
  role_code  varchar(30)  PRIMARY KEY,                       -- hod, indentor, storekeeper, approver, authority, admin, purchase ...
  name       varchar(80)  NOT NULL,
  module     varchar(20)  NOT NULL DEFAULT 'portal'          -- portal | hostel | infra — one role table serves every module
);
COMMENT ON TABLE portal.role IS 'The roles of the portal plus hostel roles (Chief Warden, Floor Warden, Security ...); hostel.staff_space_assignment.hostel_role references it';

CREATE TABLE portal.app_user (
  user_id    integer      PRIMARY KEY,                       -- portal numeric id
  staff_id   varchar(20)  REFERENCES ref.staff_master,       -- link to ERP employee when the user is an employee
  full_name  varchar(160) NOT NULL,
  email      varchar(120) UNIQUE,
  title      varchar(80),                                    -- Head of Department, Stores General Manager
  home_dept  varchar(20)  REFERENCES ref.department,
  idp_subject varchar(120) UNIQUE,                           -- Keycloak subject (OIDC sub)
  active     boolean      NOT NULL DEFAULT true
);
CREATE TABLE portal.user_role (
  user_id    integer     NOT NULL REFERENCES portal.app_user,
  role_code  varchar(30) NOT NULL REFERENCES portal.role,
  scope_dept varchar(20) NOT NULL REFERENCES ref.department, -- ALL for the whole university
  granted_on date        NOT NULL DEFAULT current_date,
  PRIMARY KEY (user_id, role_code, scope_dept)
);

-- ---------- Section 3 + Material master: product catalogue ----------
CREATE TABLE portal.category (
  category_code        varchar(10) PRIMARY KEY,              -- EE, EL, CH, LC, CV, ST, FR, IT ...
  name                 varchar(80) NOT NULL,                 -- Electrical, Electronics, Chemicals, Hostel Linen
  parent_category_code varchar(10) REFERENCES portal.category,
  item_nature          portal.item_nature,
  is_capitalised       boolean NOT NULL DEFAULT false,       -- Yes -> creates an asset record on installation
  default_gl_account_id varchar(20)                           -- FK gl_account (added below)
);
CREATE TABLE portal.sub_category (
  sub_category_id integer     PRIMARY KEY,
  category_code   varchar(10) NOT NULL REFERENCES portal.category,
  name            varchar(80) NOT NULL,                      -- Air conditioners, Solvents, Reagents
  UNIQUE (category_code, name)
);
CREATE TABLE portal.stock_group (                            -- Tally "Stock group (Under)": a tree
  group_code        varchar(10) PRIMARY KEY,
  name              varchar(80) NOT NULL,
  parent_group_code varchar(10) REFERENCES portal.stock_group
);
CREATE TABLE portal.unit_of_measure (
  uom                varchar(10) PRIMARY KEY,                -- Nos, Box, Btl, Ream, Kg, Litre, Metre, Set, Coil
  formal_name        varchar(40) NOT NULL,
  uqc                varchar(20),                            -- GST Unit Quantity Code: NOS-NUMBERS, BTL-BOTTLES
  decimal_places     smallint NOT NULL DEFAULT 0,
  conversion_to_base numeric(12,4),                          -- e.g. 1 Box = 12 Nos
  base_uom           varchar(10) REFERENCES portal.unit_of_measure
);
CREATE TABLE portal.hsn_sac (
  hsn_sac_code varchar(10) PRIMARY KEY,
  description  varchar(160),
  taxability   portal.taxability NOT NULL DEFAULT 'Taxable',
  gst_rate     numeric(5,2) NOT NULL                         -- 12.00, 18.00
);
CREATE TABLE portal.gl_account (                             -- 8.3 Chart of Accounts (I38)
  gl_account_id     varchar(20) PRIMARY KEY,
  account_code      varchar(20) NOT NULL UNIQUE,
  account_name      varchar(120) NOT NULL,                   -- Inventory – Consumables, Sundry Creditors, GST Input, Bank
  account_type      portal.gl_account_type NOT NULL,
  parent_account_id varchar(20) REFERENCES portal.gl_account,
  status            shared.active_status NOT NULL DEFAULT 'Active'
);
ALTER TABLE portal.category ADD CONSTRAINT fk_category_gl FOREIGN KEY (default_gl_account_id) REFERENCES portal.gl_account;
CREATE TABLE portal.ledger (                                 -- Tally ledgers for default purchase / sales allocation
  ledger_code   varchar(20) PRIMARY KEY,                     -- PUR-STN, PUR-GEN, SAL-GEN
  name          varchar(80) NOT NULL,
  ledger_group  portal.ledger_group NOT NULL,
  gl_account_id varchar(20) REFERENCES portal.gl_account
);

CREATE TABLE portal.vendor (                                 -- 2.6 Vendor Master, one shared table (I16)
  vendor_id          varchar(20) PRIMARY KEY,                -- V001
  name               varchar(160) NOT NULL,                  -- legal name
  vendor_type        portal.vendor_type,
  city               varchar(80),
  address            text,
  contact_person     varchar(120),
  phone              varchar(20),
  email              varchar(120),
  gstin              varchar(15),
  pan_no             varchar(10),
  bank_account_no    varchar(30),                            -- for payment; encrypt at the application layer
  ifsc_code          varchar(11),
  payment_terms_days smallint,
  msme_registered    boolean NOT NULL DEFAULT false,
  blacklist_flag     boolean NOT NULL DEFAULT false,         -- barred from procurement
  on_time_pct        numeric(5,2),
  quality_score      numeric(3,1),
  lead_days          smallint,
  overall_rating     numeric(3,2),                           -- computed from vendor_performance (1–5)
  service_type       varchar(80),                            -- maintenance model: AMC / repair service offered
  status             portal.vendor_status NOT NULL DEFAULT 'Active'
);
CREATE TABLE portal.vendor_category (
  vendor_id     varchar(20) NOT NULL REFERENCES portal.vendor,
  category_code varchar(10) NOT NULL REFERENCES portal.category,
  PRIMARY KEY (vendor_id, category_code)
);
CREATE TABLE portal.vendor_tag (
  vendor_id varchar(20) NOT NULL REFERENCES portal.vendor,
  tag       varchar(40) NOT NULL,
  PRIMARY KEY (vendor_id, tag)
);
ALTER TABLE infra.asset_master ADD CONSTRAINT fk_asset_vendor FOREIGN KEY (vendor_id) REFERENCES portal.vendor;
ALTER TABLE infra.work_order   ADD CONSTRAINT fk_wo_vendor    FOREIGN KEY (vendor_id) REFERENCES portal.vendor;
ALTER TABLE infra.amc_contract ADD CONSTRAINT fk_amc_vendor   FOREIGN KEY (vendor_id) REFERENCES portal.vendor;

CREATE TABLE portal.material (                               -- the product master (sku); Item Master + Tally material
  sku                     varchar(30) PRIMARY KEY,           -- KLU-EE-4004 ; Tally ERP material code MAT-000001 kept in erp_material_code
  erp_material_code       varchar(20) UNIQUE,
  name                    varchar(160) NOT NULL,
  part_no                 varchar(60),
  description             text,
  notes                   text,
  category_code           varchar(10) REFERENCES portal.category,
  sub_category_id         integer REFERENCES portal.sub_category,
  stock_group_code        varchar(10) REFERENCES portal.stock_group,
  base_unit               varchar(10) NOT NULL REFERENCES portal.unit_of_measure,
  alt_unit                varchar(10) REFERENCES portal.unit_of_measure,
  conversion_factor       numeric(12,4),                     -- alt units per base unit
  hsn_sac_code            varchar(10) REFERENCES portal.hsn_sac,
  gst_applicable          boolean NOT NULL DEFAULT true,
  item_nature             portal.item_nature NOT NULL DEFAULT 'Consumable',
  purchase_ledger_code    varchar(20) REFERENCES portal.ledger,
  sales_ledger_code       varchar(20) REFERENCES portal.ledger,
  cost_tracking           boolean NOT NULL DEFAULT false,
  costing_method          portal.valuation_method NOT NULL DEFAULT 'Weighted_Average',
  market_valuation_method portal.valuation_method,
  maintain_batches        boolean NOT NULL DEFAULT false,
  track_mfg_date          boolean NOT NULL DEFAULT false,
  use_expiry              boolean NOT NULL DEFAULT false,
  shelf_life_days         integer,
  list_price              numeric(14,2),
  standard_cost           numeric(14,2),
  reorder_level           numeric(14,3),
  min_order_qty           numeric(14,3),
  reorder_qty             numeric(14,3),
  consumption_period_days integer,
  reorder_criteria        varchar(10),                       -- Higher / Lower
  lead_time_days          integer,
  brand                   varchar(80),
  model_no                varchar(80),
  barcode_qr              varchar(80),
  preferred_supplier_code varchar(20) REFERENCES portal.vendor,
  custodian_dept_code     varchar(20) REFERENCES ref.department,
  warranty_months         integer,
  requires_installation   boolean NOT NULL DEFAULT false,    -- Yes -> installation work order (deployment) after GRN
  requires_inspection     boolean NOT NULL DEFAULT false,    -- Yes -> quality inspection at receipt
  is_serialised           boolean NOT NULL DEFAULT false,    -- track each unit by serial number
  substitute_sku          varchar(30) REFERENCES portal.material,
  status                  portal.material_status NOT NULL DEFAULT 'Active'
);
COMMENT ON TABLE portal.material IS 'Product master; every stock, indent, order and asset line points here';
ALTER TABLE infra.asset_master    ADD CONSTRAINT fk_asset_sku   FOREIGN KEY (sku) REFERENCES portal.material;
ALTER TABLE infra.work_order_part ADD CONSTRAINT fk_wopart_sku  FOREIGN KEY (sku) REFERENCES portal.material;

CREATE TABLE portal.material_alias (
  sku   varchar(30) NOT NULL REFERENCES portal.material ON DELETE CASCADE,
  alias varchar(80) NOT NULL,                                -- ac, split ac, daikin, caustic soda
  PRIMARY KEY (sku, alias)
);
CREATE TABLE portal.material_standard_rate (
  sku             varchar(30) NOT NULL REFERENCES portal.material ON DELETE CASCADE,
  applicable_from date NOT NULL,
  buying_rate     numeric(14,2),
  selling_rate    numeric(14,2),
  PRIMARY KEY (sku, applicable_from)
);
CREATE TABLE portal.bom_component (                          -- bill of materials for kits
  parent_sku    varchar(30) NOT NULL REFERENCES portal.material ON DELETE CASCADE,
  component_sku varchar(30) NOT NULL REFERENCES portal.material,
  qty           numeric(14,3) NOT NULL,
  PRIMARY KEY (parent_sku, component_sku)
);
CREATE TABLE portal.batch (
  batch_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku         varchar(30) NOT NULL REFERENCES portal.material,
  batch_no    varchar(40) NOT NULL,
  mfg_date    date,
  expiry_date date,
  UNIQUE (sku, batch_no)
);

-- ---------- Stores (location = store / godown tree), bins, stock ----------
CREATE TABLE portal.location (
  location_code         varchar(10) PRIMARY KEY,             -- CS, ES, HYD, BAG, LAB, HST
  name                  varchar(120) NOT NULL,               -- Central Stores, Hostel Store
  campus_id             varchar(20) REFERENCES infra.campus,
  store_type            portal.store_type NOT NULL DEFAULT 'Central',
  parent_location_code  varchar(10) REFERENCES portal.location,   -- sub-store -> central store
  dept_code             varchar(20) REFERENCES ref.department,     -- owning department (null for central)
  facility_id           varchar(30) REFERENCES infra.facility,
  space_id              varchar(30) REFERENCES infra.space,        -- room used as store (Space_Category = Store)
  store_keeper_id       varchar(20) REFERENCES ref.staff_master,
  can_purchase_directly boolean NOT NULL DEFAULT false,
  max_stock_value       numeric(14,2),
  distance_km           numeric(8,2),
  status                portal.store_status NOT NULL DEFAULT 'Active'
);
COMMENT ON TABLE portal.location IS 'Stores and sub-stores (portal location + Store Master + Tally godown); hostel.hostel_profile.sub_store_code points here';

CREATE TABLE portal.bin (
  bin_code          varchar(20) PRIMARY KEY,                 -- CS-B4-2
  location_code     varchar(10) NOT NULL REFERENCES portal.location,
  rack_no           varchar(10),
  shelf_no          varchar(10),
  capacity          numeric(12,2),
  storage_condition portal.storage_condition NOT NULL DEFAULT 'Normal',
  status            portal.bin_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE portal.stock (                                  -- running balance per product per shelf (never edited by hand)
  sku               varchar(30) NOT NULL REFERENCES portal.material,
  bin_code          varchar(20) NOT NULL REFERENCES portal.bin,
  batch_id          bigint REFERENCES portal.batch,
  qty               numeric(14,3) NOT NULL DEFAULT 0,        -- on hand
  qty_reserved      numeric(14,3) NOT NULL DEFAULT 0,        -- set aside for approved indents
  qty_available     numeric(14,3) GENERATED ALWAYS AS (qty - qty_reserved) STORED,
  qty_on_order      numeric(14,3) NOT NULL DEFAULT 0,
  avg_unit_cost     numeric(14,2),
  stock_value       numeric(16,2) GENERATED ALWAYS AS (qty * coalesce(avg_unit_cost, 0)) STORED,
  last_receipt_date date,
  last_issue_date   date,
  counted_on        date,
  PRIMARY KEY (sku, bin_code, batch_id)
);
COMMENT ON TABLE portal.stock IS 'Stock Balance; recomputed only from portal.stock_movement rows (rule 1 of the inventory model)';

CREATE TABLE portal.opening_stock (                          -- Tally opening stock per batch per godown
  batch_id      bigint      NOT NULL REFERENCES portal.batch,
  location_code varchar(10) NOT NULL REFERENCES portal.location,
  opening_qty   numeric(14,3) NOT NULL,
  opening_rate  numeric(14,2),
  PRIMARY KEY (batch_id, location_code)
);

CREATE TABLE portal.serialised_stock (
  serial_stock_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku             varchar(30) NOT NULL REFERENCES portal.material,
  serial_no       varchar(80) NOT NULL,
  location_code   varchar(10) REFERENCES portal.location,    -- null once installed
  grn_id          varchar(20),                               -- FK grn (added in 033)
  asset_id        varchar(40) REFERENCES infra.asset_master, -- linked asset after installation
  status          portal.serial_status NOT NULL DEFAULT 'In_Store',
  UNIQUE (sku, serial_no)
);

CREATE TABLE portal.vendor_item (                            -- 2.7 Vendor–Item mapping
  vendor_item_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_id         varchar(20) NOT NULL REFERENCES portal.vendor,
  sku               varchar(30) NOT NULL REFERENCES portal.material,
  vendor_item_code  varchar(60),
  last_quoted_price numeric(14,2),
  last_purchase_date date,
  min_order_qty     numeric(14,3),
  lead_time_days    integer,
  is_preferred      boolean NOT NULL DEFAULT false,
  UNIQUE (vendor_id, sku)
);

CREATE TABLE portal.transporter (
  transporter_id   varchar(20) PRIMARY KEY,
  transporter_name varchar(120) NOT NULL,
  vendor_id        varchar(20) REFERENCES portal.vendor,
  contact          varchar(120),
  transport_mode   portal.transport_mode,
  status           shared.active_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE portal.tax_master (
  tax_id         varchar(20) PRIMARY KEY,
  tax_name       varchar(60) NOT NULL,                       -- GST 18%, TDS 194C
  tax_type       portal.tax_type NOT NULL,
  rate_pct       numeric(5,2) NOT NULL,
  cgst_pct       numeric(5,2), sgst_pct numeric(5,2), igst_pct numeric(5,2),
  effective_from date NOT NULL,
  effective_to   date,
  gl_account_id  varchar(20) REFERENCES portal.gl_account
);

CREATE TABLE portal.budget_head (                            -- I5 budget per department per financial year
  budget_code      varchar(30) PRIMARY KEY,                  -- ECE/2026-27
  dept_code        varchar(20) NOT NULL REFERENCES ref.department,
  fy               varchar(9)  NOT NULL,                     -- 2026-27
  budget_category  portal.budget_category,
  head_name        varchar(120),
  gl_account_id    varchar(20) REFERENCES portal.gl_account,
  allocated        numeric(16,2) NOT NULL,                   -- sanctioned amount
  committed_amount numeric(16,2) NOT NULL DEFAULT 0,         -- open PO value (maintained from budget_txn)
  utilised_amount  numeric(16,2) NOT NULL DEFAULT 0,         -- invoiced / paid
  balance_amount   numeric(16,2) GENERATED ALWAYS AS (allocated - committed_amount - utilised_amount) STORED,
  status           portal.budget_status NOT NULL DEFAULT 'Active',
  UNIQUE (dept_code, fy, budget_category)
);

CREATE TABLE portal.reorder_rule (
  reorder_rule_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_code   varchar(10) NOT NULL REFERENCES portal.location,
  sku             varchar(30) NOT NULL REFERENCES portal.material,
  min_level       numeric(14,3) NOT NULL,
  max_level       numeric(14,3),
  reorder_qty     numeric(14,3) NOT NULL,
  replenish_from  portal.replenish_from NOT NULL,
  auto_generate   boolean NOT NULL DEFAULT false,
  status          shared.active_status NOT NULL DEFAULT 'Active',
  UNIQUE (location_code, sku)
);

CREATE TABLE portal.vendor_evaluation_criteria (             -- 5.7
  criteria_set_id varchar(20) NOT NULL,                      -- Standard, Capital_Equipment, Consumables
  criteria_id     varchar(20) NOT NULL,
  criteria_name   varchar(60) NOT NULL,                      -- Price, Spec_Compliance, Delivery_Time, Warranty ...
  weightage_pct   numeric(5,2) NOT NULL,
  scoring_method  portal.scoring_method NOT NULL,
  is_mandatory    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (criteria_set_id, criteria_id)
);

CREATE TABLE portal.approval_authority_matrix (              -- 5.15 required levels by document value
  matrix_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_type      portal.matrix_doc_type NOT NULL,
  value_from         numeric(16,2) NOT NULL,
  value_to           numeric(16,2),
  level_1_role       varchar(30) REFERENCES portal.role,
  level_2_role       varchar(30) REFERENCES portal.role,
  level_3_role       varchar(30) REFERENCES portal.role,
  requires_committee boolean NOT NULL DEFAULT false
);

CREATE TABLE portal.po_counter (                             -- last order number per financial year
  fy       varchar(9) PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);
