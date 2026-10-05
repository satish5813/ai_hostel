-- =====================================================================
-- 054  hostel — Workflow D: Student tracking
--      Consent > Scan or camera event > Current status > Alert > Action by Floor Warden or Security
--      Tables D1 Tracking_Consent, D2 Capture_Point, D3 Movement_Event, D4 Student_Current_Status,
--             D5 Hostel_Alert, D6 Location_Access_Log
-- =====================================================================

CREATE TYPE hostel.consent_given_by AS ENUM ('Student','Parent');
CREATE TYPE hostel.point_type       AS ENUM ('Room_Corridor','Hostel_Gate','Campus_Gate','Mess','Facility','Academic_Block');
CREATE TYPE hostel.device_type      AS ENUM ('Camera','Card_Reader','QR_Scanner','Manual');
CREATE TYPE hostel.device_status    AS ENUM ('Active','Faulty');
CREATE TYPE hostel.direction        AS ENUM ('In','Out');
CREATE TYPE hostel.event_source     AS ENUM ('Scan','Camera','Manual');
CREATE TYPE hostel.current_status   AS ENUM ('In_Room','In_Hostel','On_Campus','Outside_On_Pass','On_Sick_Leave','Outside_No_Pass','Overdue','Not_Seen');
CREATE TYPE hostel.alert_type       AS ENUM ('No_Pass_Exit','Pass_Overdue','Not_Seen','Fee_Overdue','Meter_Low','Checklist_Missed','Register_Missed','Sick_Meal_Missed','Ticket_Not_Done','Instalment_Overdue');
CREATE TYPE hostel.severity         AS ENUM ('Info','Warning','Critical');
CREATE TYPE hostel.alert_status     AS ENUM ('Open','Acknowledged','Closed');
CREATE TYPE hostel.access_purpose   AS ENUM ('Routine','Alert','Parent_Query','Emergency');

-- ---------- D1 Tracking_Consent: consent given for a student (latest is the one in force) ----------
CREATE TABLE hostel.tracking_consent (
  consent_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id     varchar(20) NOT NULL REFERENCES ref.student_master,
  given_by       hostel.consent_given_by NOT NULL,           -- parent if the student is under 18
  contact_id     bigint REFERENCES hostel.student_contact,   -- parent who consented (required if parent)
  policy_version varchar(20) NOT NULL,                       -- version of the tracking policy shown
  given_on       timestamptz NOT NULL DEFAULT now(),
  withdrawn_on   timestamptz,
  recorded_by    varchar(20) REFERENCES ref.staff_master,    -- Office Staff
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (given_by <> 'Parent' OR contact_id IS NOT NULL),
  CHECK (withdrawn_on IS NULL OR withdrawn_on >= given_on)
);
CREATE INDEX ix_consent_student_current ON hostel.tracking_consent (student_id, given_on DESC);

-- ---------- D2 Capture_Point: place where in and out is captured ----------
CREATE TABLE hostel.capture_point (
  point_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  point_name  varchar(120) NOT NULL,                         -- Block A, Floor 2, east corridor
  point_type  hostel.point_type NOT NULL,
  facility_id varchar(30) NOT NULL REFERENCES infra.facility,
  zone_id     varchar(30) REFERENCES infra.zone,             -- floor, for corridor points
  space_id    varchar(30) REFERENCES infra.space,            -- gate / corridor space, if modelled
  device_type hostel.device_type NOT NULL,
  device_ref  varchar(80),                                   -- device identifier
  status      hostel.device_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);
ALTER TABLE hostel.room_profile ADD CONSTRAINT fk_room_nearest_point FOREIGN KEY (nearest_point_id) REFERENCES hostel.capture_point;

-- ---------- D3 Movement_Event: one in or out of one student at one point (append-only, partitioned by month) ----------
CREATE TABLE hostel.movement_event (
  event_id         bigint GENERATED ALWAYS AS IDENTITY,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master,
  point_id         bigint NOT NULL REFERENCES hostel.capture_point,
  direction        hostel.direction NOT NULL,
  event_at         timestamptz NOT NULL DEFAULT now(),
  source           hostel.event_source NOT NULL,
  match_confidence numeric(5,2),                             -- how sure the camera match is (required if camera)
  outpass_id       bigint,                                   -- filled at the campus gate when an outpass was used (FK added in 055)
  recorded_by      varchar(20) REFERENCES ref.staff_master,  -- guard who entered it (required if manual)
  PRIMARY KEY (event_id, event_at),
  CHECK (source <> 'Camera' OR match_confidence IS NOT NULL),
  CHECK (source <> 'Manual' OR recorded_by IS NOT NULL)
) PARTITION BY RANGE (event_at);
COMMENT ON TABLE hostel.movement_event IS 'D3 — rows can be added but not changed; a scheduled job drops partitions older than policy_setting.movement_retention_days';
CREATE TABLE hostel.movement_event_default PARTITION OF hostel.movement_event DEFAULT;
CREATE INDEX ix_movement_student_time ON hostel.movement_event (student_id, event_at DESC);
CREATE TRIGGER trg_movement_immutable BEFORE UPDATE OR DELETE ON hostel.movement_event FOR EACH ROW EXECUTE FUNCTION shared.fn_block_change();

-- ---------- D4 Student_Current_Status: one row per hosteller, kept up to date from D3 ----------
CREATE TABLE hostel.student_current_status (
  student_id     varchar(20) PRIMARY KEY REFERENCES ref.student_master,
  current_status hostel.current_status NOT NULL DEFAULT 'Not_Seen',
  last_event_id  bigint,                                     -- the event that set the status
  last_event_at  timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_current_status ON hostel.student_current_status (current_status);

-- ---------- D5 Hostel_Alert: alert raised by the system ----------
CREATE TABLE hostel.hostel_alert (
  alert_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_type      hostel.alert_type NOT NULL,
  student_id      varchar(20) REFERENCES ref.student_master, -- student concerned, if any
  facility_id     varchar(30) NOT NULL REFERENCES hostel.hostel_profile,
  related_type    varchar(40),                               -- movement_event / fee_demand / meter / ticket ...
  related_id      bigint,
  raised_at       timestamptz NOT NULL DEFAULT now(),
  severity        hostel.severity NOT NULL DEFAULT 'Warning',
  assigned_to     varchar(20) REFERENCES ref.staff_master,   -- from staff_space_assignment
  parent_informed boolean NOT NULL DEFAULT false,            -- Yes when a message went to the parent
  acknowledged_at timestamptz,
  action_taken    text,                                      -- required to close
  status          hostel.alert_status NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (status <> 'Closed' OR action_taken IS NOT NULL)
);
CREATE INDEX ix_alert_open ON hostel.hostel_alert (facility_id, status, raised_at DESC) WHERE status <> 'Closed';

-- ---------- D6 Location_Access_Log: time a staff member looked up a student's location (append-only) ----------
CREATE TABLE hostel.location_access_log (
  log_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viewer_staff_id varchar(20) NOT NULL REFERENCES ref.staff_master,
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  viewed_at       timestamptz NOT NULL DEFAULT now(),
  purpose         hostel.access_purpose NOT NULL,
  alert_id        bigint REFERENCES hostel.hostel_alert
);
CREATE INDEX ix_location_access_student ON hostel.location_access_log (student_id, viewed_at DESC);
CREATE TRIGGER trg_location_access_immutable BEFORE UPDATE OR DELETE ON hostel.location_access_log FOR EACH ROW EXECUTE FUNCTION shared.fn_block_change();
