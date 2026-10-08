-- =====================================================================
-- 020  infra — Educational Institute Infrastructure, Allocation & Maintenance data model (Sept 2026)
--      Module A hierarchy: Campus > Facility > Zone (floor) > Space (room) > SubSpace (bed) ; Space > Asset
--      Module C allocation (class, lab, activity, sports; hostel allocation lives in hostel schema, EXTENDED)
--      Module D maintenance (tickets, PM, work orders, teams, AMC, inspections, utilities)
--      Note: Vendor_Master is one shared table -> portal.vendor ; Spare-parts inventory -> portal.material / portal.stock
-- =====================================================================

CREATE TYPE infra.facility_type     AS ENUM ('Academic','Hostel','Sports_Complex','Open_Ground','Admin','Library','Canteen','Convention_Centre','Store','Medical','Other');
CREATE TYPE infra.facility_status   AS ENUM ('Active','Under_Maintenance','Closed');
CREATE TYPE infra.zone_type         AS ENUM ('Floor','Wing','Outdoor_Zone');
CREATE TYPE infra.space_category    AS ENUM ('Classroom','Laboratory','Seminar_Hall','Auditorium','Hostel_Room','Office','Indoor_Court','Outdoor_Field','Gym','Swimming_Pool','Store','Toilet_Block','Common_Area','Mess_Hall','Library_Room','Activity_Centre','Play_Room','Convention_Hall','Gate','Corridor');
CREATE TYPE infra.space_status      AS ENUM ('Available','Occupied','Under_Maintenance','Decommissioned');
CREATE TYPE infra.subspace_type     AS ENUM ('Bed','Workstation','Seat','Lane','Court_Section');
CREATE TYPE infra.subspace_status   AS ENUM ('Vacant','Held','Occupied','Damaged');   -- Held added by the hostel module (room offer pending)
CREATE TYPE infra.asset_category    AS ENUM ('Furniture','Electrical','IT','Lab_Equipment','Sports_Equipment','Plumbing','Civil','Meter','Other');
CREATE TYPE infra.asset_condition   AS ENUM ('Good','Fair','Poor','Scrap');
CREATE TYPE infra.day_of_week       AS ENUM ('Mon','Tue','Wed','Thu','Fri','Sat','Sun');
CREATE TYPE infra.slot_type         AS ENUM ('Lecture','Lab','Break','Sports');
CREATE TYPE infra.alloc_status      AS ENUM ('Active','Cancelled');
CREATE TYPE infra.activity_type     AS ENUM ('Sports_Practice','Tournament','Seminar','Cultural','Club','Exam','External_Rental');
CREATE TYPE infra.requester_type    AS ENUM ('Student','Staff','Dept','External');
CREATE TYPE infra.booking_status    AS ENUM ('Requested','Approved','Rejected','Completed','Cancelled');
CREATE TYPE infra.membership_status AS ENUM ('Active','Expired');
CREATE TYPE infra.avail_source      AS ENUM ('Class','Lab','Booking','Maintenance');
CREATE TYPE infra.raiser_type       AS ENUM ('Student','Staff','Inspection','System');
CREATE TYPE infra.priority          AS ENUM ('Low','Medium','High','Critical');
CREATE TYPE infra.ticket_status     AS ENUM ('Open','Assigned','In_Progress','Resolved','Closed','Reopened');
CREATE TYPE infra.pm_frequency      AS ENUM ('Daily','Weekly','Monthly','Quarterly','Yearly');
CREATE TYPE infra.pm_status         AS ENUM ('Active','Suspended');
CREATE TYPE infra.wo_status         AS ENUM ('Planned','In_Progress','Completed','Cancelled');
CREATE TYPE infra.amc_status        AS ENUM ('Active','Expired','Terminated');
CREATE TYPE infra.inspection_type   AS ENUM ('Safety','Fire','Hygiene','Electrical','Ground_Condition');
CREATE TYPE infra.utility_type      AS ENUM ('Electricity','Water','Gas','Internet');

-- ---------- 2.1 Campus ----------
CREATE TABLE infra.campus (
  campus_id    varchar(20)  PRIMARY KEY,                     -- unique campus code (KLVZA, KLHYD)
  campus_name  varchar(100) NOT NULL,                        -- Main / North campus
  address      text,
  total_area   numeric(12,2),                                -- acres / sq m
  status       shared.active_status NOT NULL DEFAULT 'Active'
);
ALTER TABLE ref.staff_master ADD CONSTRAINT fk_staff_campus FOREIGN KEY (campus_code) REFERENCES infra.campus;

-- ---------- 2.2 Facility (top-level zones: buildings, grounds) ----------
CREATE TABLE infra.facility (
  facility_id    varchar(30)  PRIMARY KEY,                   -- unique facility code
  campus_id      varchar(20)  NOT NULL REFERENCES infra.campus,
  facility_name  varchar(120) NOT NULL,                      -- Academic Block A, Boys Hostel, Sports Complex
  facility_type  infra.facility_type NOT NULL,
  area_sqm       numeric(12,2),
  no_of_floors   smallint     NOT NULL DEFAULT 0,            -- 0 for open grounds
  year_built     smallint,
  incharge_id    varchar(20)  REFERENCES ref.staff_master,   -- staff responsible
  status         infra.facility_status NOT NULL DEFAULT 'Active'
);
COMMENT ON TABLE infra.facility IS '2.2 Facility Master; hostel buildings get a one-to-one hostel.hostel_profile row';

-- ---------- 2.3 Zone / Floor ----------
CREATE TABLE infra.zone (
  zone_id      varchar(30)  PRIMARY KEY,
  facility_id  varchar(30)  NOT NULL REFERENCES infra.facility,
  zone_name    varchar(80)  NOT NULL,                        -- Floor 1, East Wing, Field Zone A
  zone_type    infra.zone_type NOT NULL,
  sequence_no  smallint                                      -- floor number / ordering
);

-- ---------- 2.4 Space (rooms, labs, courts, grounds — all bookable units) ----------
CREATE TABLE infra.space (
  space_id       varchar(30)  PRIMARY KEY,
  zone_id        varchar(30)  NOT NULL REFERENCES infra.zone,
  space_code     varchar(30)  NOT NULL,                      -- A-101, LAB-CS-2, CRICKET-G1
  space_name     varchar(120) NOT NULL,
  space_category infra.space_category NOT NULL,
  capacity       integer,                                    -- seats / beds / players
  area_sqm       numeric(10,2),
  has_ac         boolean NOT NULL DEFAULT false,
  has_projector  boolean NOT NULL DEFAULT false,
  is_bookable    boolean NOT NULL DEFAULT false,
  booking_rate   numeric(12,2),                              -- per hour / day if charged
  status         infra.space_status NOT NULL DEFAULT 'Available',
  UNIQUE (zone_id, space_code)
);
COMMENT ON TABLE infra.space IS '2.4 Space Master; hostel rooms get a one-to-one hostel.room_profile row';
ALTER TABLE ref.sport ADD CONSTRAINT fk_sport_space FOREIGN KEY (default_space_id) REFERENCES infra.space;

-- ---------- 2.5 SubSpace (beds, workstations, lanes) ----------
CREATE TABLE infra.subspace (
  subspace_id    varchar(30)  PRIMARY KEY,
  space_id       varchar(30)  NOT NULL REFERENCES infra.space,
  subspace_code  varchar(30)  NOT NULL,                      -- Bed-2, WS-15, Lane-3
  subspace_type  infra.subspace_type NOT NULL,
  status         infra.subspace_status NOT NULL DEFAULT 'Vacant',   -- Held while a room offer awaits the student
  UNIQUE (space_id, subspace_code)
);
CREATE INDEX ix_subspace_space_status ON infra.subspace (space_id, status);

-- ---------- 2.6 Asset Master (equipment inside spaces) ----------
CREATE TABLE infra.asset_master (
  asset_id          varchar(40)  PRIMARY KEY,                -- unique tag / barcode (KLU-AST-2026-0001)
  space_id          varchar(30)  REFERENCES infra.space,     -- current location
  asset_name        varchar(120) NOT NULL,                   -- Cot, Mattress, Projector, Fan
  asset_category    infra.asset_category NOT NULL,
  make_model        varchar(120),
  serial_no         varchar(80),
  purchase_date     date,
  cost              numeric(14,2),
  warranty_expiry   date,
  vendor_id         varchar(20),                             -- FK portal.vendor (added in 030_portal)
  condition         infra.asset_condition NOT NULL DEFAULT 'Good',
  last_service_date date,
  sku               varchar(30),                             -- FK portal.material (added in 030_portal)
  status            shared.active_status NOT NULL DEFAULT 'Active'
);
CREATE INDEX ix_asset_space ON infra.asset_master (space_id);

-- ---------- Module C — Allocation ----------
CREATE TABLE infra.timetable_slot (
  slot_id      varchar(20) PRIMARY KEY,
  day_of_week  infra.day_of_week NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  slot_type    infra.slot_type NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE infra.class_allocation (
  class_alloc_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  academic_year  varchar(9)  NOT NULL,                       -- 2026-27
  semester       varchar(10) NOT NULL,                       -- Odd / Even
  section_id     varchar(30) NOT NULL REFERENCES ref.section,
  subject_id     varchar(30) NOT NULL REFERENCES ref.subject,
  faculty_id     varchar(20) NOT NULL REFERENCES ref.staff_master,
  space_id       varchar(30) NOT NULL REFERENCES infra.space,   -- Space_Category = Classroom
  slot_id        varchar(20) NOT NULL REFERENCES infra.timetable_slot,
  effective_from date NOT NULL,
  effective_to   date,
  status         infra.alloc_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE infra.lab_allocation (
  lab_alloc_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id         varchar(30) NOT NULL REFERENCES infra.space,   -- Space_Category = Laboratory
  subject_id       varchar(30) NOT NULL REFERENCES ref.subject,
  batch_id         varchar(30) NOT NULL REFERENCES ref.batch,
  faculty_id       varchar(20) NOT NULL REFERENCES ref.staff_master,
  lab_assistant_id varchar(20) REFERENCES ref.staff_master,
  slot_id          varchar(20) NOT NULL REFERENCES infra.timetable_slot,
  academic_year    varchar(9)  NOT NULL,
  max_students     integer,
  status           infra.alloc_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE infra.lab_workstation_map (
  ws_map_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lab_alloc_id  bigint      NOT NULL REFERENCES infra.lab_allocation,
  subspace_id   varchar(30) NOT NULL REFERENCES infra.subspace,
  student_id    varchar(20) NOT NULL REFERENCES ref.student_master,
  assigned_date date NOT NULL DEFAULT current_date
);

-- 4.5 Hostel Room Allocation is defined in hostel schema (EXTENDED, A3 Hostel_Allocation)

CREATE TABLE infra.activity_booking (
  booking_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id              varchar(30) NOT NULL REFERENCES infra.space,
  activity_type         infra.activity_type NOT NULL,
  activity_name         varchar(160) NOT NULL,
  requested_by          varchar(40) NOT NULL,                -- student_id / staff_id / dept_code / club name
  requester_type        infra.requester_type NOT NULL,
  booking_date          date NOT NULL,
  start_time            time NOT NULL,
  end_time              time NOT NULL,
  expected_participants integer,
  approved_by           varchar(20) REFERENCES ref.staff_master,
  booking_charges       numeric(12,2),
  status                infra.booking_status NOT NULL DEFAULT 'Requested',
  CHECK (end_time > start_time)
);

CREATE TABLE infra.sports_membership (
  sport_member_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master,
  sport_id         varchar(30) NOT NULL REFERENCES ref.sport,
  coach_id         varchar(20) REFERENCES ref.staff_master,
  team_name        varchar(80),
  membership_start date NOT NULL,
  membership_end   date,
  status           infra.membership_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE infra.space_availability_log (
  avail_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id     varchar(30) NOT NULL REFERENCES infra.space,
  date         date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  source_type  infra.avail_source NOT NULL,
  source_id    bigint NOT NULL,                              -- allocation / booking / work-order id
  CHECK (end_time > start_time),
  -- rule 2: a new allocation is rejected if it overlaps an existing entry for the same space
  EXCLUDE USING gist (space_id WITH =, date WITH =, tsrange(('2000-01-01'::date + start_time), ('2000-01-01'::date + end_time)) WITH &&)
);
COMMENT ON TABLE infra.space_availability_log IS '4.8 prevents double booking; exclusion constraint enforces no time overlap per space per day';

-- ---------- Module D — Maintenance ----------
CREATE TABLE infra.maintenance_category (
  category_id       varchar(20)  PRIMARY KEY,
  category_name     varchar(80)  NOT NULL,                   -- Electrical, Plumbing, Civil, HVAC, IT, Housekeeping ...
  default_sla_hours integer,
  default_team_id   varchar(20)                              -- FK maintenance_team (added below)
);

CREATE TABLE infra.maintenance_team (
  team_id       varchar(20)  PRIMARY KEY,
  team_name     varchar(80)  NOT NULL,
  category_id   varchar(20)  REFERENCES infra.maintenance_category,
  supervisor_id varchar(20)  REFERENCES ref.staff_master,
  contact       varchar(60)
);
ALTER TABLE infra.maintenance_category ADD CONSTRAINT fk_cat_team FOREIGN KEY (default_team_id) REFERENCES infra.maintenance_team;

CREATE TABLE infra.technician (
  technician_id varchar(20) PRIMARY KEY,
  staff_id      varchar(20) REFERENCES ref.staff_master,
  team_id       varchar(20) REFERENCES infra.maintenance_team,
  skill_set     varchar(160),
  shift         varchar(20)
);

CREATE TABLE infra.maintenance_ticket (
  ticket_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  raised_by        varchar(40) NOT NULL,                     -- student_id or staff_id
  raiser_type      infra.raiser_type NOT NULL,
  facility_id      varchar(30) NOT NULL REFERENCES infra.facility,
  space_id         varchar(30) REFERENCES infra.space,
  asset_id         varchar(40) REFERENCES infra.asset_master,
  category_id      varchar(20) NOT NULL REFERENCES infra.maintenance_category,
  description      text NOT NULL,
  priority         infra.priority NOT NULL DEFAULT 'Medium',
  raised_date      timestamptz NOT NULL DEFAULT now(),
  assigned_to      varchar(20) REFERENCES infra.technician,
  assigned_date    timestamptz,
  resolved_date    timestamptz,
  resolution_notes text,
  cost_incurred    numeric(12,2),
  feedback_rating  smallint CHECK (feedback_rating BETWEEN 1 AND 5),
  status           infra.ticket_status NOT NULL DEFAULT 'Open',
  -- EXTENDED by hostel Workflow H (H1): Floor Warden verification, closure report, 24-hour deadline, auto-close
  verified_by      varchar(20) REFERENCES ref.staff_master,  -- Floor Warden who verified the complaint
  verified_at      timestamptz,
  deadline_at      timestamptz,                              -- raised_date + 24 h for hostel tickets
  closure_report   text,
  auto_closed      boolean NOT NULL DEFAULT false,
  follow_up_of     bigint REFERENCES infra.maintenance_ticket
);
COMMENT ON TABLE infra.maintenance_ticket IS '5.2 Maintenance Request / Complaint Ticket (EXTENDED by hostel H1; H2 Ticket_Event, H3–H7 await the missing spec pages)';
CREATE INDEX ix_ticket_facility_status ON infra.maintenance_ticket (facility_id, status);

CREATE TABLE infra.pm_schedule (
  pm_schedule_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id         varchar(40) REFERENCES infra.asset_master,
  space_id         varchar(30) REFERENCES infra.space,
  category_id      varchar(20) NOT NULL REFERENCES infra.maintenance_category,
  frequency        infra.pm_frequency NOT NULL,
  task_checklist   text,
  last_done_date   date,
  next_due_date    date,
  assigned_team_id varchar(20) REFERENCES infra.maintenance_team,
  status           infra.pm_status NOT NULL DEFAULT 'Active',
  CHECK (asset_id IS NOT NULL OR space_id IS NOT NULL)
);

CREATE TABLE infra.work_order (
  work_order_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id      bigint REFERENCES infra.maintenance_ticket,
  pm_schedule_id bigint REFERENCES infra.pm_schedule,
  technician_id  varchar(20) REFERENCES infra.technician,
  vendor_id      varchar(20),                                -- FK portal.vendor (added in 030_portal)
  scheduled_date date,
  actual_start   timestamptz,
  actual_end     timestamptz,
  labour_hours   numeric(8,2),
  total_cost     numeric(12,2),
  downtime_hours numeric(8,2),
  status         infra.wo_status NOT NULL DEFAULT 'Planned',
  CHECK (ticket_id IS NOT NULL OR pm_schedule_id IS NOT NULL)
);

CREATE TABLE infra.work_order_part (
  wo_part_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_order_id bigint NOT NULL REFERENCES infra.work_order,
  sku           varchar(30) NOT NULL,                        -- FK portal.material (replaces Spare_Parts inventory)
  quantity_used numeric(14,3) NOT NULL,
  unit_cost     numeric(12,2)
);

CREATE TABLE infra.amc_contract (
  amc_id          varchar(30) PRIMARY KEY,
  vendor_id       varchar(20) NOT NULL,                      -- FK portal.vendor
  asset_category  infra.asset_category,
  asset_id        varchar(40) REFERENCES infra.asset_master,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  annual_cost     numeric(12,2),
  visits_per_year smallint,
  status          infra.amc_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE infra.inspection_log (
  inspection_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  facility_id          varchar(30) NOT NULL REFERENCES infra.facility,
  space_id             varchar(30) REFERENCES infra.space,
  inspection_type      infra.inspection_type NOT NULL,
  inspector_id         varchar(40) NOT NULL,                 -- staff_id or external inspector reference
  inspection_date      date NOT NULL,
  findings             text,
  score                numeric(5,2),
  action_required      boolean NOT NULL DEFAULT false,
  ticket_id            bigint REFERENCES infra.maintenance_ticket,   -- generated ticket when action required
  next_inspection_date date
);

CREATE TABLE infra.utility_consumption (
  utility_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  facility_id    varchar(30) NOT NULL REFERENCES infra.facility,
  utility_type   infra.utility_type NOT NULL,
  meter_no       varchar(40),
  reading_date   date NOT NULL,
  units_consumed numeric(14,3),
  cost           numeric(12,2)
);
COMMENT ON TABLE infra.utility_consumption IS '5.9 building-level utility bills; per-room student meters are hostel.room_meter (Workflow C)';
