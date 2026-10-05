-- =====================================================================
-- 051  hostel — Workflow A: Registration, allotment, fees and check-in
--      Applied > Registration fee paid > Room allotted > Room accepted > Fees paid > Checked in
--      Tables A1 Hostel_Registration, A2 Room_Offer, A3 Hostel_Allocation (EXTENDED infra 4.5),
--      A4 Room_Handover, A5 Room_Handover_Line, A6 Fee_Plan, A7 Fee_Demand, A8 Fee_Receipt
-- =====================================================================

CREATE TYPE hostel.registration_status AS ENUM ('Applied','Fee_Paid','Waitlisted','Allotted','Accepted','Confirmed','Checked_In','Cancelled','Vacated');
CREATE TYPE hostel.student_decision    AS ENUM ('Pending','Accepted','Declined','Expired');
CREATE TYPE hostel.occupant_type       AS ENUM ('Student','Staff');
CREATE TYPE hostel.allocation_status   AS ENUM ('Active','Vacated','Transferred');
CREATE TYPE hostel.handover_type       AS ENUM ('Check_In','Check_Out');
CREATE TYPE hostel.item_condition      AS ENUM ('Good','Fair','Damaged','Missing');
CREATE TYPE hostel.plan_type           AS ENUM ('Single','Two_Instalments');
CREATE TYPE hostel.plan_status         AS ENUM ('Open','Fully_Paid','Cancelled');
CREATE TYPE hostel.fee_head            AS ENUM ('Registration','Hostel','Mess','Electricity','Damage','Fine','Convention_Centre');
CREATE TYPE hostel.demand_status       AS ENUM ('Pending','Part_Paid','Paid','Overdue','Waived');
CREATE TYPE hostel.payment_mode        AS ENUM ('UPI','Card','Net_Banking','Cash','DD');
CREATE TYPE hostel.gateway_status      AS ENUM ('Success','Failed','Pending');

-- ---------- A1 Hostel_Registration: student per academic year ----------
CREATE TABLE hostel.hostel_registration (
  registration_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_no varchar(20) NOT NULL UNIQUE,              -- printed number, HR-2026-00412
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  academic_year   varchar(9)  NOT NULL REFERENCES hostel.academic_year,
  facility_id     varchar(30) NOT NULL REFERENCES hostel.hostel_profile,   -- hostel building chosen
  room_type_id    smallint    NOT NULL REFERENCES hostel.room_type,         -- room type chosen in that building
  applied_on      timestamptz NOT NULL DEFAULT now(),
  reg_demand_id   bigint,                                    -- the registration fee demand (FK fee_demand, added below)
  rules_accepted  boolean NOT NULL DEFAULT false,            -- student accepted the hostel rules, including the non-refundable fee
  waitlist_no     integer,                                   -- position if no bed of the chosen type is free
  status          hostel.registration_status NOT NULL DEFAULT 'Applied',
  remarks         text,                                      -- notes by the Room Allotment section
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  UNIQUE (student_id, academic_year),                        -- rule: one registration per student per academic year
  CHECK (rules_accepted)                                     -- cannot be saved without accepting the rules
);
CREATE INDEX ix_registration_facility_status ON hostel.hostel_registration (facility_id, academic_year, status);

-- ---------- A2 Room_Offer: room offered to a student (a student may get several) ----------
CREATE TABLE hostel.room_offer (
  offer_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_id  bigint NOT NULL REFERENCES hostel.hostel_registration,
  subspace_id      varchar(30) NOT NULL REFERENCES infra.subspace,   -- bed offered; room, floor and building are read from the bed
  offer_no         smallint NOT NULL,                        -- 1 for the first offer, 2 for the next ...
  offered_on       timestamptz NOT NULL DEFAULT now(),
  hold_until       timestamptz NOT NULL,                     -- offered_on + hold period in policy_setting (offer_hold_hours)
  offered_by       varchar(20) REFERENCES ref.staff_master,  -- empty when the system allots automatically
  student_decision hostel.student_decision NOT NULL DEFAULT 'Pending',
  decision_on      timestamptz,
  decline_reason   text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  UNIQUE (registration_id, offer_no),
  CHECK (student_decision <> 'Declined' OR decline_reason IS NOT NULL),   -- required if declined
  CHECK (hold_until > offered_on)
);
-- rule: a registration has only one Pending offer; a bed has only one Pending offer
CREATE UNIQUE INDEX ux_room_offer_pending_reg ON hostel.room_offer (registration_id) WHERE student_decision = 'Pending';
CREATE UNIQUE INDEX ux_room_offer_pending_bed ON hostel.room_offer (subspace_id)     WHERE student_decision = 'Pending';

-- ---------- A3 Hostel_Allocation (EXTENDED infra 4.5): occupant in a bed for a period ----------
CREATE TABLE hostel.hostel_allocation (
  hostel_alloc_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occupant_type   hostel.occupant_type NOT NULL DEFAULT 'Student',   -- Added: faculty and staff rooms use the same table
  student_id      varchar(20) REFERENCES ref.student_master, -- occupant when Occupant_Type is Student
  staff_id        varchar(20) REFERENCES ref.staff_master,   -- occupant when Occupant_Type is Staff (Added)
  subspace_id     varchar(30) NOT NULL REFERENCES infra.subspace,   -- bed; room and building are read from it, not stored again
  offer_id        bigint REFERENCES hostel.room_offer,       -- the accepted offer (Added)
  academic_year   varchar(9) NOT NULL REFERENCES hostel.academic_year,
  allocation_date date NOT NULL DEFAULT current_date,        -- check-in date
  vacate_date     date,                                      -- empty while the occupant is staying
  key_no          varchar(20) NOT NULL,                      -- key issued (Added)
  checked_in_by   varchar(20) NOT NULL REFERENCES ref.staff_master,   -- office staff who did the check-in (Added)
  approved_by     varchar(20) REFERENCES ref.staff_master,   -- Warden
  status          hostel.allocation_status NOT NULL DEFAULT 'Active',
  remarks         text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK ((occupant_type = 'Student' AND student_id IS NOT NULL AND staff_id IS NULL)
      OR (occupant_type = 'Staff'   AND staff_id   IS NOT NULL AND student_id IS NULL)),
  CHECK (vacate_date IS NULL OR vacate_date >= allocation_date),
  CHECK (status <> 'Active' OR vacate_date IS NULL)
);
-- rules: a bed has only one Active allocation; a student has only one Active stay; one allocation per accepted offer
CREATE UNIQUE INDEX ux_allocation_active_bed     ON hostel.hostel_allocation (subspace_id) WHERE status = 'Active';
CREATE UNIQUE INDEX ux_allocation_active_student ON hostel.hostel_allocation (student_id)  WHERE status = 'Active' AND student_id IS NOT NULL;
CREATE UNIQUE INDEX ux_allocation_offer          ON hostel.hostel_allocation (offer_id)    WHERE offer_id IS NOT NULL;
ALTER TABLE hostel.vacate_request      ADD CONSTRAINT fk_vacate_alloc FOREIGN KEY (hostel_alloc_id) REFERENCES hostel.hostel_allocation;
ALTER TABLE portal.material_issue      ADD CONSTRAINT fk_issue_alloc  FOREIGN KEY (hostel_alloc_id) REFERENCES hostel.hostel_allocation;

-- ---------- A4 Room_Handover: check-in or check-out inspection of a bed ----------
CREATE TABLE hostel.room_handover (
  handover_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hostel_alloc_id       bigint NOT NULL REFERENCES hostel.hostel_allocation,
  vacate_id             bigint REFERENCES hostel.vacate_request,   -- the vacating request that led to this inspection (check-out)
  handover_type         hostel.handover_type NOT NULL,
  handover_on           timestamptz NOT NULL DEFAULT now(),
  meter_reading         numeric(12,2) NOT NULL,              -- room meter reading at that moment
  key_returned          boolean,                             -- at check-out
  done_by               varchar(20) NOT NULL REFERENCES ref.staff_master,   -- Floor Warden or Office Staff
  occupant_acknowledged boolean NOT NULL DEFAULT false,      -- occupant confirmed the list on screen
  total_damage_amount   numeric(12,2) NOT NULL DEFAULT 0,    -- Derived: sum of the lines, maintained by trigger; never typed
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  UNIQUE (hostel_alloc_id, handover_type),                   -- 1 : 2 — one at check-in, one at check-out
  CHECK (handover_type <> 'Check_Out' OR (key_returned IS NOT NULL AND vacate_id IS NOT NULL))
);

-- ---------- A5 Room_Handover_Line: item checked during a handover ----------
CREATE TABLE hostel.room_handover_line (
  handover_id   bigint NOT NULL REFERENCES hostel.room_handover ON DELETE CASCADE,
  line_no       smallint NOT NULL,
  asset_id      varchar(40) NOT NULL REFERENCES infra.asset_master,   -- cot, mattress, table, chair, cupboard, fan, light
  condition     hostel.item_condition NOT NULL,
  damage_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (damage_amount >= 0),   -- charged at check-out if damaged or missing
  remarks       text,
  PRIMARY KEY (handover_id, line_no),
  CHECK (damage_amount = 0 OR condition IN ('Damaged','Missing'))
);

-- ---------- A6 Fee_Plan: registration that has an accepted room ----------
CREATE TABLE hostel.fee_plan (
  fee_plan_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_id bigint NOT NULL UNIQUE REFERENCES hostel.hostel_registration,   -- one plan per registration
  plan_type       hostel.plan_type NOT NULL,                 -- hostel fee only; mess fee is always one payment
  fee_id          bigint NOT NULL REFERENCES hostel.room_type_fee,   -- rate applied
  created_on      timestamptz NOT NULL DEFAULT now(),
  status          hostel.plan_status NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);

-- ---------- A7 Fee_Demand: amount a student has to pay ----------
CREATE TABLE hostel.fee_demand (
  demand_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id    varchar(20) NOT NULL REFERENCES ref.student_master,
  fee_plan_id   bigint REFERENCES hostel.fee_plan,           -- empty for registration fee, damages and fines
  fee_head      hostel.fee_head NOT NULL,
  instalment_no smallint NOT NULL DEFAULT 1 CHECK (instalment_no IN (1,2)),   -- 1 or 2 for Hostel; 1 for everything else
  amount_due    numeric(12,2) NOT NULL CHECK (amount_due >= 0),
  due_date      date NOT NULL,
  amount_paid   numeric(12,2) NOT NULL DEFAULT 0,            -- Derived: sum of successful receipts, maintained by trigger
  status        hostel.demand_status NOT NULL DEFAULT 'Pending',
  reference_type varchar(30),                                -- what raised it: registration / handover / meter_recharge / punishment / clearance
  reference_id  bigint,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (fee_head = 'Hostel' OR instalment_no = 1)
);
CREATE INDEX ix_fee_demand_student_status ON hostel.fee_demand (student_id, status);
CREATE UNIQUE INDEX ux_fee_demand_plan_head_inst ON hostel.fee_demand (fee_plan_id, fee_head, instalment_no) WHERE fee_plan_id IS NOT NULL;
ALTER TABLE hostel.hostel_registration ADD CONSTRAINT fk_registration_reg_demand FOREIGN KEY (reg_demand_id) REFERENCES hostel.fee_demand;
ALTER TABLE hostel.mess_subscription   ADD CONSTRAINT fk_mess_sub_demand FOREIGN KEY (mess_demand_id) REFERENCES hostel.fee_demand;
ALTER TABLE hostel.no_dues_clearance   ADD CONSTRAINT fk_clearance_demand FOREIGN KEY (demand_id) REFERENCES hostel.fee_demand;

-- ---------- A8 Fee_Receipt: payment made by a student (immutable; reversals are new rows) ----------
CREATE TABLE hostel.fee_receipt (
  receipt_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  receipt_no     varchar(20) NOT NULL UNIQUE,                -- printed receipt number
  demand_id      bigint NOT NULL REFERENCES hostel.fee_demand,
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on        timestamptz NOT NULL DEFAULT now(),
  payment_mode   hostel.payment_mode NOT NULL,
  gateway_ref    varchar(80),                                -- reference from the payment gateway (required if online)
  gateway_status hostel.gateway_status NOT NULL DEFAULT 'Pending',
  is_refundable  boolean NOT NULL DEFAULT true,              -- No for the registration fee
  collected_by   varchar(20) REFERENCES ref.staff_master,    -- accounts staff (required if cash)
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20),
  CHECK (payment_mode NOT IN ('UPI','Card','Net_Banking') OR gateway_ref IS NOT NULL),
  CHECK (payment_mode <> 'Cash' OR collected_by IS NOT NULL)
);
CREATE UNIQUE INDEX ux_fee_receipt_gateway_ref ON hostel.fee_receipt (gateway_ref) WHERE gateway_ref IS NOT NULL;   -- idempotent webhooks
