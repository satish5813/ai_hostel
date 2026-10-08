-- =====================================================================
-- 050  hostel — Masters MS2, MS4–MS8 and the tables from Workflows G, I, M, N that A–F depend on
--      (Mess_Master G1, Mess_Subscription G2, Room_Standard_Inventory I13, Discipline_Punishment M2,
--       Vacate_Request N1, No_Dues_Clearance N2). Those six are STUBS: their columns come from the
--       index descriptions and must be completed when the missing spec pages arrive.
-- =====================================================================

CREATE TYPE hostel.contact_relation AS ENUM ('Self','Father','Mother','Guardian','Spouse','Brother','Sister','Communication','Other');
CREATE TYPE hostel.hostel_gender    AS ENUM ('Boys','Girls','Staff');
CREATE TYPE hostel.hostel_status    AS ENUM ('Active','Closed');
CREATE TYPE hostel.reserved_for     AS ENUM ('None','Staff','Guest','Medical');
CREATE TYPE hostel.cuisine          AS ENUM ('South_Indian','North_Indian','Veg','Non_Veg','Jain','Special_Diet');
CREATE TYPE hostel.subscription_status AS ENUM ('Active','Suspended','Closed');
CREATE TYPE hostel.vacate_reason    AS ENUM ('Course_Completed','Semester_End','Transfer','Discipline','Medical','Personal','Other');
CREATE TYPE hostel.vacate_status    AS ENUM ('Applied','L1_Approved','L2_Approved','L3_Approved','Approved','Rejected','Checked_Out','Cancelled');
CREATE TYPE hostel.clearance_section AS ENUM ('Hostel_Office','Accounts','Mess','Electricity','Library','Floor_Warden');
CREATE TYPE hostel.clearance_status AS ENUM ('Pending','Cleared','Dues_Pending');
CREATE TYPE hostel.punishment_type  AS ENUM ('Warning','Fine','Outing_Ban','Hostel_Suspension','Expulsion','Community_Service');
CREATE TYPE hostel.punishment_status AS ENUM ('In_Force','Served','Revoked');

-- ---------- MS8 Academic_Year ----------
CREATE TABLE hostel.academic_year (
  academic_year varchar(9)  PRIMARY KEY,                     -- 2026-27
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  is_current    boolean NOT NULL DEFAULT false,
  CHECK (end_date > start_date)
);
CREATE UNIQUE INDEX ux_academic_year_current ON hostel.academic_year (is_current) WHERE is_current;   -- only one year is current

-- ---------- G1 Mess_Master (STUB) ----------
CREATE TABLE hostel.mess_master (
  mess_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mess_name    varchar(80) NOT NULL,
  facility_id  varchar(30) REFERENCES infra.facility,        -- building the mess is in
  space_id     varchar(30) REFERENCES infra.space,           -- dining hall
  incharge_id  varchar(20) REFERENCES ref.staff_master,      -- Mess In-charge
  capacity     integer,
  annual_fee   numeric(12,2) NOT NULL DEFAULT 0,             -- mess fee for the year (always one demand, Workflow A)
  status       shared.active_status NOT NULL DEFAULT 'Active'
);
COMMENT ON TABLE hostel.mess_master IS 'G1 STUB — complete from Workflow G pages';

-- ---------- MS4 Hostel_Profile (one-to-one with Facility where Facility_Type = Hostel) ----------
CREATE TABLE hostel.hostel_profile (
  facility_id     varchar(30) PRIMARY KEY REFERENCES infra.facility,
  hostel_code     varchar(10) NOT NULL UNIQUE,               -- short code used in room numbers and reports
  hostel_gender   hostel.hostel_gender NOT NULL,
  default_mess_id bigint REFERENCES hostel.mess_master,      -- mess that serves this hostel
  sub_store_code  varchar(10) REFERENCES portal.location,    -- hostel sub-store in the Stock and Purchase Portal
  dept_code       varchar(20) NOT NULL REFERENCES ref.department,   -- department code used when this hostel raises an indent
  gate_close_time time NOT NULL DEFAULT '21:30',             -- after this time a student outside is reported
  status          hostel.hostel_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);

-- ---------- MS5 Room_Type ----------
CREATE TABLE hostel.room_type (
  room_type_id  smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type_name     varchar(60) NOT NULL UNIQUE,                 -- 2-sharing AC, 4-sharing non-AC
  sharing_count smallint NOT NULL CHECK (sharing_count BETWEEN 1 AND 8),   -- beds per room
  is_ac         boolean NOT NULL DEFAULT false,
  attached_bath boolean NOT NULL DEFAULT false,
  status        shared.active_status NOT NULL DEFAULT 'Active'
);

-- ---------- MS6 Room_Type_Fee: room type in one building for one academic year ----------
CREATE TABLE hostel.room_type_fee (
  fee_id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_type_id       smallint NOT NULL REFERENCES hostel.room_type,
  facility_id        varchar(30) NOT NULL REFERENCES hostel.hostel_profile,
  academic_year      varchar(9) NOT NULL REFERENCES hostel.academic_year,
  registration_fee   numeric(12,2) NOT NULL,                 -- one-time, non-refundable
  hostel_fee         numeric(12,2) NOT NULL,                 -- fee for the year
  instalment_1_pct   numeric(5,2) NOT NULL DEFAULT 50 CHECK (instalment_1_pct BETWEEN 1 AND 100),   -- share due in the first instalment
  instalment_2_due_date date NOT NULL,
  UNIQUE (room_type_id, facility_id, academic_year)
);

-- ---------- MS7 Room_Profile (one-to-one with Space where Space_Category = Hostel_Room) ----------
CREATE TABLE hostel.room_profile (
  space_id         varchar(30) PRIMARY KEY REFERENCES infra.space,
  room_type_id     smallint NOT NULL REFERENCES hostel.room_type,   -- decides fee and number of beds
  reserved_for     hostel.reserved_for NOT NULL DEFAULT 'None',
  is_accessible    boolean NOT NULL DEFAULT false,           -- suitable for a student with a disability
  nearest_point_id bigint,                                   -- corridor camera / reader nearest to this room (FK hostel.capture_point, added in 054)
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);

-- ---------- MS2 Student_Contact: phone number of a student, parent or guardian ----------
CREATE TABLE hostel.student_contact (
  contact_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id          varchar(20) NOT NULL REFERENCES ref.student_master,
  relation            hostel.contact_relation NOT NULL,
  contact_name        varchar(120) NOT NULL,
  mobile_no           varchar(10) NOT NULL CHECK (mobile_no ~ '^[6-9][0-9]{9}$'),   -- ten-digit number stored without labels
  is_verified         boolean NOT NULL DEFAULT false,        -- set when an OTP sent to the number is confirmed
  verified_on         timestamptz,
  is_outpass_approver boolean NOT NULL DEFAULT false,        -- the one parent or guardian who recommends outpass
  status              shared.active_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  UNIQUE (student_id, relation, mobile_no)
);
COMMENT ON TABLE hostel.student_contact IS 'MS2 — parsed from the ERP "Contact No" column (mobile:father-94406..|mobile:self-..); parent consent and outpass recommendation use the verified approver row';
CREATE UNIQUE INDEX ux_student_contact_outpass_approver ON hostel.student_contact (student_id) WHERE is_outpass_approver AND status = 'Active';
ALTER TABLE shared.approval_step ADD CONSTRAINT fk_step_contact FOREIGN KEY (acted_by_contact) REFERENCES hostel.student_contact;
ALTER TABLE shared.notification  ADD CONSTRAINT fk_notif_contact FOREIGN KEY (contact_id) REFERENCES hostel.student_contact;

-- ---------- G2 Mess_Subscription (STUB): student in a mess for a year ----------
CREATE TABLE hostel.mess_subscription (
  subscription_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  mess_id         bigint NOT NULL REFERENCES hostel.mess_master,
  academic_year   varchar(9) NOT NULL REFERENCES hostel.academic_year,
  cuisine         hostel.cuisine NOT NULL,
  mess_demand_id  bigint,                                    -- FK hostel.fee_demand (added in 051)
  from_date       date NOT NULL DEFAULT current_date,
  to_date         date,
  status          hostel.subscription_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);
CREATE UNIQUE INDEX ux_mess_subscription_active ON hostel.mess_subscription (student_id) WHERE status = 'Active';   -- 1 : 1 active
COMMENT ON TABLE hostel.mess_subscription IS 'G2 STUB — Workflow A writes it when the student chooses cuisine; Workflow F reads it for the room meal';

-- ---------- I13 Room_Standard_Inventory (NEW): item that a room type should contain ----------
CREATE TABLE hostel.room_standard_inventory (
  room_type_id smallint NOT NULL REFERENCES hostel.room_type,
  sku          varchar(30) NOT NULL REFERENCES portal.material,   -- cot, mattress, table, chair, cupboard, fan, light
  qty_per_room smallint NOT NULL DEFAULT 1,
  PRIMARY KEY (room_type_id, sku)
);

-- ---------- M2 Discipline_Punishment (STUB): punishment awarded on a case; Workflow E checks outing bans ----------
CREATE TABLE hostel.discipline_case (
  case_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id   varchar(20) NOT NULL REFERENCES ref.student_master,
  incident_on  timestamptz NOT NULL,
  description  text NOT NULL,
  reported_by  varchar(20) REFERENCES ref.staff_master,
  status       varchar(20) NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);
COMMENT ON TABLE hostel.discipline_case IS 'M1 STUB — complete from Workflow M pages';
CREATE TABLE hostel.discipline_punishment (
  punishment_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id         bigint NOT NULL REFERENCES hostel.discipline_case,
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  punishment_type hostel.punishment_type NOT NULL,
  bars_outings    boolean NOT NULL DEFAULT false,            -- while In_Force the student cannot apply for an outpass
  from_date       date NOT NULL,
  to_date         date,
  fine_amount     numeric(12,2),
  awarded_by      varchar(20) REFERENCES ref.staff_master,
  status          hostel.punishment_status NOT NULL DEFAULT 'In_Force',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);
CREATE INDEX ix_punishment_student_force ON hostel.discipline_punishment (student_id) WHERE status = 'In_Force' AND bars_outings;

-- ---------- N1 Vacate_Request (STUB): request to vacate the hostel; A4 Room_Handover points here at check-out ----------
CREATE TABLE hostel.vacate_request (
  vacate_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master,
  hostel_alloc_id  bigint,                                   -- FK hostel.hostel_allocation (added in 051)
  reason           hostel.vacate_reason NOT NULL,
  reason_detail    text,
  proof_doc_id     uuid REFERENCES shared.document,          -- proof document (v2.1: reason, proof document, four approval levels)
  planned_date     date NOT NULL,
  applied_on       timestamptz NOT NULL DEFAULT now(),
  levels_required  smallint NOT NULL DEFAULT 4,
  status           hostel.vacate_status NOT NULL DEFAULT 'Applied',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);
COMMENT ON TABLE hostel.vacate_request IS 'N1 STUB — approvals in shared.approval_step (request_type = Vacate); complete from Workflow N pages';

-- ---------- N2 No_Dues_Clearance (STUB): section that must clear a leaving occupant ----------
CREATE TABLE hostel.no_dues_clearance (
  clearance_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vacate_id    bigint NOT NULL REFERENCES hostel.vacate_request,
  section      hostel.clearance_section NOT NULL,
  dues_amount  numeric(12,2) NOT NULL DEFAULT 0,
  demand_id    bigint,                                       -- FK hostel.fee_demand for any dues raised (added in 051)
  cleared_by   varchar(20) REFERENCES ref.staff_master,
  cleared_on   timestamptz,
  remarks      text,
  status       hostel.clearance_status NOT NULL DEFAULT 'Pending',
  UNIQUE (vacate_id, section)
);
COMMENT ON TABLE hostel.no_dues_clearance IS 'N2 STUB — Workflow C writes the Electricity section at the final reading';
