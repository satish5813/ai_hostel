-- =====================================================================
-- 055  hostel — Workflow E: Outing permission (CHANGED in v2.1)
--      Apply > Parent recommends > L1 Floor Warden > L2 Chief Warden > L3 Dean, Students Affairs (a day or more)
--      > QR pass > Gate out > Gate in.   Approvals are rows in shared.approval_step (request_type = Outpass).
--      Table E1 Outpass
-- =====================================================================

CREATE TYPE hostel.outing_category AS ENUM ('Same_Day','Day_Or_More');
CREATE TYPE hostel.outpass_status  AS ENUM ('Applied','Parent_Recommended','L1_Approved','L2_Approved','Approved','Rejected','Out','Returned','Overdue','Cancelled');

CREATE TABLE hostel.outpass (
  outpass_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outpass_no           varchar(20) NOT NULL UNIQUE,          -- printed number
  student_id           varchar(20) NOT NULL REFERENCES ref.student_master,
  reason               text NOT NULL,
  destination          varchar(200) NOT NULL,
  leave_from           timestamptz NOT NULL,                 -- planned exit
  return_by            timestamptz NOT NULL,                 -- planned return
  outing_category      hostel.outing_category NOT NULL,      -- Derived from the two dates (trigger); decides whether Level 3 is needed
  levels_required      smallint NOT NULL,                    -- Derived: 2 or 3, from approval_rule (trigger)
  contact_during_leave varchar(15) NOT NULL,                 -- phone number while away
  applied_on           timestamptz NOT NULL DEFAULT now(),
  qr_token             varchar(64) UNIQUE,                   -- issued after the final level; scanned at the gate
  actual_out_event_id  bigint,                               -- gate exit (movement_event)
  actual_in_event_id   bigint,                               -- gate return (movement_event)
  actual_out_at        timestamptz,
  actual_in_at         timestamptz,
  late_by_minutes      integer,                              -- Derived: return time minus return_by, if late (trigger)
  status               hostel.outpass_status NOT NULL DEFAULT 'Applied',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (return_by > leave_from),
  CHECK (status NOT IN ('Approved','Out','Returned','Overdue') OR qr_token IS NOT NULL)
);
CREATE INDEX ix_outpass_student ON hostel.outpass (student_id, applied_on DESC);
CREATE INDEX ix_outpass_open    ON hostel.outpass (status) WHERE status IN ('Applied','Parent_Recommended','L1_Approved','L2_Approved','Approved','Out','Overdue');
-- a student has at most one outpass in progress at a time
CREATE UNIQUE INDEX ux_outpass_in_progress ON hostel.outpass (student_id) WHERE status IN ('Applied','Parent_Recommended','L1_Approved','L2_Approved','Approved','Out','Overdue');

ALTER TABLE hostel.movement_event ADD CONSTRAINT fk_movement_outpass FOREIGN KEY (outpass_id) REFERENCES hostel.outpass;
