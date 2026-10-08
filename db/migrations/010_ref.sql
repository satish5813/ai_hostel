-- =====================================================================
-- 010  ref — ERP mirrors. Source: student_profile export (9,449 rows, 26 columns)
--      and employee_profile export (ERP Module field list), plus Infrastructure model Module B.
--      Rule from the hostel spec: Aadhaar / PAN / bank details are NOT copied into this database.
-- =====================================================================

-- ---------- enums (values taken from the real ERP exports) ----------
CREATE TYPE ref.gender            AS ENUM ('Male','Female','Other');
CREATE TYPE ref.blood_group       AS ENUM ('A+ve','A-ve','B+ve','B-ve','AB+ve','AB-ve','O+ve','O-ve','NA');
CREATE TYPE ref.caste_category    AS ENUM ('OC','BC','Other_BC','General','SC','ST','EWS','NA');
CREATE TYPE ref.admission_type    AS ENUM ('Regular','Distance','Lateral_Entry');
CREATE TYPE ref.student_type      AS ENUM ('UG','PG','PhD','Certificate','Graduate_Diploma','PG_Diploma','PDF','JRF','SRF','Other');
CREATE TYPE ref.offering_mode     AS ENUM ('Regular','Regular_PBL','Part_Time','Full_Time','Online','Distance');
CREATE TYPE ref.student_status    AS ENUM ('Active','Cancelled','Suspended','Alumni');
CREATE TYPE ref.staff_type        AS ENUM ('Faculty','Warden','Lab_Assistant','Maintenance','Sports_Coach','Admin','Security','Housekeeping','Mess','Medical','Counsellor','Other');
CREATE TYPE ref.recruitment_type  AS ENUM ('Permanent','Adhoc','Contract','Outsourced','Visiting');
CREATE TYPE ref.marital_status    AS ENUM ('Single','Married','Divorced','Widowed','NA');
CREATE TYPE ref.address_type      AS ENUM ('Permanent','Present','Communication');
CREATE TYPE ref.relation          AS ENUM ('Self','Father','Mother','Guardian','Spouse','Brother','Sister','Son','Daughter','Communication','Other');
CREATE TYPE ref.subject_type      AS ENUM ('Theory','Lab');
CREATE TYPE ref.indoor_outdoor    AS ENUM ('Indoor','Outdoor');

-- ---------- 3.3 Department, Course, Section, Batch, Subject, Sport ----------
CREATE TABLE ref.department (
  dept_code        varchar(20)  PRIMARY KEY,                 -- ERP department code (CSE, ECE, BT, STORES, ADMIN, ALL)
  dept_name        varchar(120) NOT NULL,                    -- Computer Science & Engg.; "Whole university" for ALL
  hod_staff_id     varchar(20),                              -- FK staff_master, added after staff_master exists
  status           shared.active_status NOT NULL DEFAULT 'Active',
  synced_at        timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE ref.department IS 'Departments of the university; code ALL stands for the whole university (portal convention)';

CREATE TABLE ref.course (
  course_id        varchar(30)  PRIMARY KEY,                 -- programme code, e.g. BTECH-CSE
  dept_code        varchar(20)  NOT NULL REFERENCES ref.department,
  course_name      varchar(120) NOT NULL,                    -- "Btech CSE", "MBA", "PHD-ECE" (ERP column Degree)
  duration_years   numeric(3,1),
  status           shared.active_status NOT NULL DEFAULT 'Active'
);
COMMENT ON TABLE ref.course IS 'Programme / degree master (ERP column Degree)';

CREATE TABLE ref.section (
  section_id       varchar(30)  PRIMARY KEY,
  course_id        varchar(30)  NOT NULL REFERENCES ref.course,
  year             smallint     NOT NULL,                    -- year of study
  section_name     varchar(30)  NOT NULL,                    -- A, B, S1 ...
  strength         integer,
  class_advisor_id varchar(20)                               -- FK staff_master (added below)
);

CREATE TABLE ref.batch (
  batch_id         varchar(30)  PRIMARY KEY,
  section_id       varchar(30)  NOT NULL REFERENCES ref.section,
  batch_name       varchar(30)  NOT NULL,
  size             integer
);
COMMENT ON TABLE ref.batch IS 'Lab batches that split a section';

CREATE TABLE ref.subject (
  subject_id       varchar(30)  PRIMARY KEY,
  course_id        varchar(30)  NOT NULL REFERENCES ref.course,
  subject_name     varchar(120) NOT NULL,
  subject_type     ref.subject_type NOT NULL,
  credits          numeric(3,1)
);

CREATE TABLE ref.sport (
  sport_id         varchar(30)  PRIMARY KEY,
  sport_name       varchar(80)  NOT NULL,
  indoor_outdoor   ref.indoor_outdoor NOT NULL,
  default_space_id varchar(30)                               -- FK infra.space, added in 020_infra
);

-- ---------- MS3 / 3.2 Staff_Master  (source: employee_profile ERP export) ----------
CREATE TABLE ref.staff_master (
  staff_id             varchar(20)  PRIMARY KEY,             -- ERP uni_id
  salutation           varchar(10),                          -- Dr., Mr., Ms.
  first_name           varchar(80)  NOT NULL,
  middle_name          varchar(80),
  last_name            varchar(80),
  full_name            varchar(200) GENERATED ALWAYS AS (btrim(first_name || ' ' || coalesce(middle_name || ' ', '') || coalesce(last_name, ''))) STORED,
  gender               ref.gender   NOT NULL,                -- needed when assigning wardens to girls' hostels
  date_of_birth        date,
  blood_group          ref.blood_group,
  caste_category       ref.caste_category,
  disability           varchar(60),
  marital_status       ref.marital_status,
  nationality          varchar(40),
  religion             varchar(40),
  mother_tongue        varchar(40),
  birth_place          varchar(80),
  father_name          varchar(120),
  mother_name          varchar(120),
  height_cm            numeric(5,1),
  weight_kg            numeric(5,1),
  pf_number            varchar(30),
  joining_date         date,
  dept_code            varchar(20)  NOT NULL REFERENCES ref.department,   -- ERP department
  designation          varchar(80)  NOT NULL,                -- ERP designation (Professor, Stores General Manager ...)
  staff_type           ref.staff_type NOT NULL DEFAULT 'Other',
  recruitment_type     ref.recruitment_type,
  recruit_agency       varchar(80),                          -- KLEF - Vijayawada
  campus_code          varchar(20),                          -- KLVZA; FK infra.campus added in 020_infra
  personal_email       varchar(120),
  official_email       varchar(120),                         -- for notifications (optional in spec)
  mobile_no            varchar(15)  NOT NULL,                -- shown on the room QR page for the responsible person
  communication_no     varchar(15),
  photo_object_key     varchar(200),                         -- object-storage key, never a blob in the DB
  resume_link          varchar(300),
  status               shared.active_status NOT NULL DEFAULT 'Active',
  synced_at            timestamptz NOT NULL DEFAULT now(),
  import_batch_id      bigint                                -- FK shared.import_batch, added in 040_shared
);
COMMENT ON TABLE ref.staff_master IS 'MS3 Staff_Master — one row per employee, ERP employee profile, read-only here. Aadhaar, PAN and bank rows stay in the ERP.';

ALTER TABLE ref.department ADD CONSTRAINT fk_department_hod FOREIGN KEY (hod_staff_id) REFERENCES ref.staff_master;
ALTER TABLE ref.section    ADD CONSTRAINT fk_section_advisor FOREIGN KEY (class_advisor_id) REFERENCES ref.staff_master;

CREATE TABLE ref.staff_address (
  staff_id      varchar(20)      NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  address_type  ref.address_type NOT NULL,
  door_no       varchar(60), street varchar(120), landmark varchar(120), city varchar(80),
  district      varchar(80), state varchar(80), country varchar(60) DEFAULT 'India', pincode varchar(10),
  PRIMARY KEY (staff_id, address_type)
);
CREATE TABLE ref.staff_contact (
  contact_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id      varchar(20)  NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  contact_type  varchar(30)  NOT NULL,                       -- Mobile / Emergency / Landline
  contact_person varchar(120),
  phone_number  varchar(15)  NOT NULL,
  status        shared.active_status NOT NULL DEFAULT 'Active'
);
CREATE TABLE ref.staff_qualification (
  qualification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id         varchar(20) NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  degree           varchar(60), specialization varchar(120), university varchar(160), college varchar(160),
  cgpa_or_pct      numeric(6,2), year_of_passing smallint
);
CREATE TABLE ref.staff_dependent (
  dependent_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id      varchar(20)  NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  relation      ref.relation NOT NULL,
  full_name     varchar(160) NOT NULL,
  date_of_birth date, gender ref.gender, is_nominee boolean NOT NULL DEFAULT false,
  status        shared.active_status NOT NULL DEFAULT 'Active'
);
CREATE TABLE ref.staff_employment_history (
  employment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id      varchar(20) NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  employer_name varchar(160) NOT NULL, job_type varchar(40), designation varchar(80),
  joining_date date, leaving_date date, salary numeric(12,2), employer_address text, city varchar(80), state varchar(80), country varchar(60)
);
CREATE TABLE ref.staff_membership (
  membership_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id      varchar(20) NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  body_name     varchar(160) NOT NULL, membership_no varchar(60), subscription varchar(40), from_date date, end_date date
);
CREATE TABLE ref.staff_responsibility (
  responsibility_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id      varchar(20) NOT NULL REFERENCES ref.staff_master ON DELETE CASCADE,
  designation   varchar(120) NOT NULL,                       -- ALTERNATE HOD, PROFESSOR IN CHARGE
  start_date    date, end_date date
);
COMMENT ON TABLE ref.staff_responsibility IS 'ERP "Employee Other Responsibilities"; hostel duty assignments live in hostel.staff_space_assignment instead';

-- ---------- MS1 / 3.1 Student_Master  (source: student_profile ERP export; EXTENDED by hostel v2) ----------
CREATE TABLE ref.student_master (
  student_id           varchar(20)  PRIMARY KEY,             -- University Id, the key used in every hostel table
  full_name            varchar(160) NOT NULL,                -- ERP column Studentname
  admission_type       ref.admission_type NOT NULL DEFAULT 'Regular',
  father_name          varchar(120),
  mother_name          varchar(120),
  regulation           varchar(10),                          -- R26
  student_type         ref.student_type NOT NULL,            -- UG / PG / PhD ...
  course_id            varchar(30)  REFERENCES ref.course,   -- programme (ERP column Degree)
  programme            varchar(80)  NOT NULL,                -- ERP text as exported, kept for traceability
  offering_mode        ref.offering_mode,                    -- Regular / Regular PBL / Part Time ...
  section_id           varchar(30)  REFERENCES ref.section,
  year_semester        varchar(20),
  gender               ref.gender   NOT NULL,                -- decides which hostels the student may choose
  date_of_birth        date         NOT NULL,                -- under-18 students need parent consent
  caste_category       ref.caste_category,
  economic_status      varchar(20),                          -- EBC / Non EBC (blank in current export)
  family_income_band   varchar(20),
  nationality          varchar(40)  NOT NULL DEFAULT 'indian',
  religion             varchar(40),
  blood_group          ref.blood_group,                      -- for emergencies
  disability           varchar(60),                          -- used to offer an accessible room
  personal_email       varchar(120) NOT NULL,                -- for receipts and notices
  admission_date       date,
  kleee_application_id varchar(40),
  seat_status          varchar(20),
  dept_code            varchar(20)  REFERENCES ref.department,     -- Added in Version 2: routes discipline summary to the HOD
  counsellor_id        varchar(20)  REFERENCES ref.staff_master,   -- Added in Version 2: Faculty Counsellor
  photo_object_key     varchar(200),                         -- shown to Security at the gate; not in current export
  is_hosteller         boolean      NOT NULL DEFAULT false,  -- ERP column Hostel Status; set by the hostel module at check-in and vacating
  status               ref.student_status NOT NULL DEFAULT 'Active',
  synced_at            timestamptz  NOT NULL DEFAULT now(),
  import_batch_id      bigint
);
COMMENT ON TABLE ref.student_master IS 'MS1 Student_Master (EXTENDED) — ERP student profile. Identity Number (Aadhaar) is deliberately not copied.';
CREATE INDEX ix_student_master_dept   ON ref.student_master (dept_code);
CREATE INDEX ix_student_master_gender ON ref.student_master (gender) WHERE status = 'Active';

CREATE TABLE ref.student_address (
  student_id    varchar(20)      NOT NULL REFERENCES ref.student_master ON DELETE CASCADE,
  address_type  ref.address_type NOT NULL DEFAULT 'Permanent',
  seq_no        smallint         NOT NULL DEFAULT 1,         -- export packs several addresses separated by "::"
  hno           varchar(80), street varchar(120), landmark varchar(160), district varchar(80),
  state         varchar(80), city varchar(80), country varchar(60) DEFAULT 'India', pincode varchar(10),
  PRIMARY KEY (student_id, address_type, seq_no)
);
COMMENT ON TABLE ref.student_address IS 'Parsed from the ERP "Address" column: Hno:..|| Street:..|| Landmark:..|| District:..|| State:..|| City:..|| Country:..|| Pincode:..';
