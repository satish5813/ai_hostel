-- =====================================================================
-- 095  Attendance sessions, floor rounds, the student 360 (academics, CRT, skills, activities, achievements)
--      and access control for every space (2 Oct 2026)
--
--   * Attendance is taken in sessions through the day (morning, study hours, night roll call ...), by hand or by
--     QR / face / thumb / card at a capture point. The night session also fills night_attendance (register, alerts).
--   * Floor rounds: the Floor Warden walks each room and washroom with a checklist; a failed item raises a
--     maintenance ticket (infra.maintenance_ticket) and the round is kept in infra.inspection_log.
--   * acad.*: what the university knows of a hosteller beyond the hostel — results, CRT, certifications, activities,
--     achievements — loaded from files and, for certificates and achievements, added by the student and verified.
--   * Access: each capture point has the methods it accepts and a policy (who, when, what proof, whether a pass or
--     an approval is needed). Every scan is judged against it and the verdict is kept on the movement event.
--     Face and thumb templates stay in the device; only an enrolment reference is stored here.
-- =====================================================================

CREATE TYPE hostel.capture_method AS ENUM ('Manual','QR','Face','Thumb','Card');

-- ---------- attendance sessions ----------
CREATE TABLE hostel.attendance_session (
  session_id   smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  facility_id  varchar(30) REFERENCES hostel.hostel_profile,     -- empty: every hostel
  session_name varchar(40) NOT NULL,
  starts_at    time NOT NULL,
  ends_at      time NOT NULL,
  days         smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',     -- ISO weekday numbers
  method       hostel.capture_method NOT NULL DEFAULT 'Manual',
  is_night     boolean NOT NULL DEFAULT false,                    -- the night roll call: also kept in night_attendance
  raises_alert boolean NOT NULL DEFAULT false,                    -- Not seen without a pass raises a Not_Seen alert
  status       shared.active_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (ends_at > starts_at)
);
INSERT INTO hostel.attendance_session (session_name, starts_at, ends_at, method, is_night, raises_alert) VALUES
  ('Morning', '06:30', '07:30', 'Manual', false, false),
  ('Study hours', '19:00', '21:00', 'QR', false, false),
  ('Night roll call', '21:30', '22:30', 'Manual', true, true);

CREATE TABLE hostel.session_attendance (
  session_id  smallint NOT NULL REFERENCES hostel.attendance_session,
  att_date    date NOT NULL,
  student_id  varchar(20) NOT NULL REFERENCES ref.student_master,
  status      hostel.attendance_status NOT NULL,
  method      hostel.capture_method NOT NULL DEFAULT 'Manual',
  point_id    bigint REFERENCES hostel.capture_point,
  remarks     text,
  marked_by   varchar(20) NOT NULL,
  marked_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, att_date, student_id)
);
CREATE INDEX ix_session_attendance_student ON hostel.session_attendance (student_id, att_date);

-- ---------- floor rounds: checklist items and maintenance categories ----------
INSERT INTO infra.maintenance_category (category_id, category_name, default_sla_hours) VALUES
  ('ELEC', 'Electrical', 24), ('PLUMB', 'Plumbing', 24), ('CARP', 'Carpentry and furniture', 72), ('HOUSE', 'Housekeeping', 8),
  ('CIVIL', 'Civil and paint', 120), ('FIRE', 'Fire safety', 4), ('NET', 'Wi-Fi and network', 24)
ON CONFLICT (category_id) DO NOTHING;

CREATE TABLE hostel.round_item (
  item_code   varchar(20) PRIMARY KEY,
  item_name   varchar(80) NOT NULL,
  applies_to  varchar(20) NOT NULL CHECK (applies_to IN ('Hostel_Room','Toilet_Block','Common_Area','Floor')),
  category_id varchar(20) NOT NULL REFERENCES infra.maintenance_category,
  sort_no     smallint NOT NULL DEFAULT 0
);
INSERT INTO hostel.round_item VALUES
  ('R-LIGHT', 'Lights work', 'Hostel_Room', 'ELEC', 1), ('R-FAN', 'Fan works', 'Hostel_Room', 'ELEC', 2), ('R-PLUG', 'Plug points safe', 'Hostel_Room', 'ELEC', 3),
  ('R-FURN', 'Cots, tables, cupboards sound', 'Hostel_Room', 'CARP', 4), ('R-DOOR', 'Door and lock work', 'Hostel_Room', 'CARP', 5), ('R-CLEAN', 'Room clean', 'Hostel_Room', 'HOUSE', 6),
  ('T-TAPS', 'Taps and flush work', 'Toilet_Block', 'PLUMB', 1), ('T-LEAK', 'No leaks or blockage', 'Toilet_Block', 'PLUMB', 2), ('T-LIGHT', 'Lights work', 'Toilet_Block', 'ELEC', 3),
  ('T-CLEAN', 'Clean and dry', 'Toilet_Block', 'HOUSE', 4), ('T-GEYSER', 'Geyser works', 'Toilet_Block', 'ELEC', 5),
  ('F-EXT', 'Fire extinguisher in date', 'Floor', 'FIRE', 1), ('F-EXIT', 'Exit clear and lit', 'Floor', 'FIRE', 2), ('F-CORR', 'Corridor clean', 'Floor', 'HOUSE', 3), ('F-WIFI', 'Wi-Fi works', 'Floor', 'NET', 4);

CREATE TABLE hostel.floor_round (
  round_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  facility_id varchar(30) NOT NULL REFERENCES hostel.hostel_profile,
  zone_id     varchar(30) NOT NULL REFERENCES infra.zone,
  round_date  date NOT NULL DEFAULT current_date,
  done_by     varchar(20) NOT NULL REFERENCES ref.staff_master,
  started_at  timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  places_checked int NOT NULL DEFAULT 0,
  faults      int NOT NULL DEFAULT 0,
  UNIQUE (zone_id, round_date, done_by)
);
CREATE TABLE hostel.floor_round_line (
  round_id   bigint NOT NULL REFERENCES hostel.floor_round ON DELETE CASCADE,
  place      varchar(30) NOT NULL,                          -- the room or washroom (space_id), or the floor (zone_id) for floor-wide items
  space_id   varchar(30) REFERENCES infra.space,            -- empty for floor-wide items
  item_code  varchar(20) NOT NULL REFERENCES hostel.round_item,
  ok         boolean NOT NULL,
  note       text,
  ticket_id  bigint REFERENCES infra.maintenance_ticket,
  PRIMARY KEY (round_id, place, item_code),
  CHECK (ok OR note IS NOT NULL OR ticket_id IS NOT NULL)
);

-- ---------- acad: the student beyond the hostel ----------
CREATE SCHEMA IF NOT EXISTS acad;
CREATE TYPE acad.crt_category   AS ENUM ('Aptitude','Coding','Verbal','Technical','Mock_Interview','Soft_Skills');
CREATE TYPE acad.cert_category  AS ENUM ('Technical','Cloud','Programming','Language','Soft_Skill','Sports','Other');
CREATE TYPE acad.activity_type  AS ENUM ('Club','Sports','Cultural','NSS_NCC','Technical_Event','Internship','Volunteering','Hostel_Committee');
CREATE TYPE acad.achieve_level  AS ENUM ('Hostel','University','State','National','International');

CREATE TABLE acad.term_result (
  student_id     varchar(20) NOT NULL REFERENCES ref.student_master,
  semester_no    smallint NOT NULL CHECK (semester_no BETWEEN 1 AND 12),
  term_label     varchar(30) NOT NULL,                        -- 2026-27 Odd
  sgpa           numeric(4,2) CHECK (sgpa BETWEEN 0 AND 10),
  cgpa           numeric(4,2) CHECK (cgpa BETWEEN 0 AND 10),
  credits_earned numeric(5,1),
  attendance_pct numeric(5,2) CHECK (attendance_pct BETWEEN 0 AND 100),
  backlogs       smallint NOT NULL DEFAULT 0,
  import_batch_id bigint,
  PRIMARY KEY (student_id, semester_no)
);
CREATE TABLE acad.crt_attendance (
  student_id varchar(20) NOT NULL REFERENCES ref.student_master,
  month      date NOT NULL CHECK (extract(day FROM month) = 1),
  sessions_held     smallint NOT NULL CHECK (sessions_held >= 0),
  sessions_attended smallint NOT NULL CHECK (sessions_attended >= 0),
  import_batch_id bigint,
  PRIMARY KEY (student_id, month),
  CHECK (sessions_attended <= sessions_held)
);
CREATE TABLE acad.crt_assessment (
  assessment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id varchar(20) NOT NULL REFERENCES ref.student_master,
  test_name  varchar(80) NOT NULL,
  test_date  date NOT NULL,
  category   acad.crt_category NOT NULL,
  score      numeric(6,2) NOT NULL,
  max_score  numeric(6,2) NOT NULL CHECK (max_score > 0),
  import_batch_id bigint,
  UNIQUE (student_id, test_name, test_date),
  CHECK (score BETWEEN 0 AND max_score)
);
CREATE TABLE acad.certification (
  cert_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id varchar(20) NOT NULL REFERENCES ref.student_master,
  title      varchar(160) NOT NULL,
  provider   varchar(80) NOT NULL,
  category   acad.cert_category NOT NULL DEFAULT 'Technical',
  issued_on  date NOT NULL,
  valid_until date,
  credential_ref varchar(200),                               -- credential ID or verification link
  added_by   varchar(20) NOT NULL,                           -- the student, or the file upload
  verified_by varchar(20), verified_on timestamptz,
  import_batch_id bigint,
  UNIQUE (student_id, title, provider, issued_on)
);
CREATE TABLE acad.activity (
  activity_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id varchar(20) NOT NULL REFERENCES ref.student_master,
  activity_type acad.activity_type NOT NULL,
  title      varchar(160) NOT NULL,
  role       varchar(60),
  from_date  date NOT NULL,
  to_date    date,
  hours      numeric(6,1),
  import_batch_id bigint,
  UNIQUE (student_id, title, from_date),
  CHECK (to_date IS NULL OR to_date >= from_date)
);
CREATE TABLE acad.achievement (
  achievement_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id varchar(20) NOT NULL REFERENCES ref.student_master,
  title      varchar(160) NOT NULL,
  level      acad.achieve_level NOT NULL,
  category   varchar(40),
  achieved_on date NOT NULL,
  award      varchar(80),                                     -- First prize, Gold, Selected ...
  added_by   varchar(20) NOT NULL,
  verified_by varchar(20), verified_on timestamptz,
  import_batch_id bigint,
  UNIQUE (student_id, title, achieved_on)
);
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Acad_Results';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Acad_CRT';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Acad_Certification';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Acad_Activity';

-- ---------- access control ----------
ALTER TYPE hostel.point_type ADD VALUE IF NOT EXISTS 'Library';
ALTER TYPE hostel.point_type ADD VALUE IF NOT EXISTS 'Gym';
ALTER TABLE hostel.capture_point ADD COLUMN methods hostel.capture_method[] NOT NULL DEFAULT '{Manual}';

CREATE TABLE hostel.access_policy (
  point_id      bigint PRIMARY KEY REFERENCES hostel.capture_point,
  who           varchar(20) NOT NULL DEFAULT 'All_Hostellers' CHECK (who IN ('Everyone','All_Hostellers','Own_Hostel','Own_Floor','Staff_Only')),
  open_from     time,                                         -- empty: open all day
  open_to       time,
  outside_hours varchar(20) NOT NULL DEFAULT 'Deny' CHECK (outside_hours IN ('Deny','Need_Approval','Allow_And_Alert')),
  pass_to_exit  boolean NOT NULL DEFAULT false,               -- going out needs an approved outing pass
  proof         hostel.capture_method[] NOT NULL DEFAULT '{QR}',   -- any one of these proves the person
  approver_role varchar(30) REFERENCES portal.role,           -- who approves a request to enter out of hours
  photo_on_entry boolean NOT NULL DEFAULT false,              -- the camera keeps a snapshot reference
  updated_at timestamptz, updated_by varchar(20)
);

CREATE TABLE hostel.biometric_enrolment (
  student_id   varchar(20) NOT NULL REFERENCES ref.student_master,
  method       hostel.capture_method NOT NULL CHECK (method IN ('Face','Thumb','Card')),
  template_ref varchar(120) NOT NULL,                         -- reference held by the device vendor; never the image or print
  enrolled_on  timestamptz NOT NULL DEFAULT now(),
  enrolled_by  varchar(20) NOT NULL,
  status       shared.active_status NOT NULL DEFAULT 'Active',
  PRIMARY KEY (student_id, method)
);

CREATE TYPE hostel.access_verdict AS ENUM ('Allowed','Allowed_Alerted','Approval_Needed','Denied');
ALTER TABLE hostel.movement_event ADD COLUMN method hostel.capture_method, ADD COLUMN verdict hostel.access_verdict, ADD COLUMN verdict_reason text;

CREATE TABLE hostel.access_request (
  request_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id   varchar(20) NOT NULL REFERENCES ref.student_master,
  point_id     bigint NOT NULL REFERENCES hostel.capture_point,
  reason       text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  valid_until  timestamptz NOT NULL DEFAULT now() + interval '2 hours',
  status       varchar(10) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Used','Expired')),
  decided_by   varchar(20), decided_at timestamptz, remarks text
);
CREATE INDEX ix_access_request_open ON hostel.access_request (student_id, point_id) WHERE status IN ('Pending','Approved');

/**
 * Judge a scan: is the person allowed through this point now, with this proof?
 * Returns the verdict and the reason in plain words. The caller records the movement with the verdict.
 */
CREATE OR REPLACE FUNCTION hostel.fn_access_check(p_student varchar, p_point bigint, p_direction hostel.direction, p_method hostel.capture_method, p_at timestamptz DEFAULT now(),
  OUT verdict hostel.access_verdict, OUT reason text) LANGUAGE plpgsql STABLE AS $$
DECLARE pt hostel.capture_point%ROWTYPE; pol hostel.access_policy%ROWTYPE; stay record; t time := (p_at AT TIME ZONE 'Asia/Kolkata')::time; v_open boolean;
BEGIN
  SELECT * INTO pt FROM hostel.capture_point WHERE point_id = p_point;
  IF pt.point_id IS NULL THEN verdict := 'Denied'; reason := 'Unknown capture point'; RETURN; END IF;
  SELECT * INTO pol FROM hostel.access_policy WHERE point_id = p_point;
  IF pol.point_id IS NULL THEN verdict := 'Allowed'; reason := 'No rule set for this point; recorded only'; RETURN; END IF;
  SELECT * INTO stay FROM hostel.fn_student_stay(p_student);
  -- 1. proof
  IF NOT (p_method = ANY (pol.proof)) THEN verdict := 'Denied'; reason := format('%s is not accepted here; use %s', p_method, array_to_string(pol.proof, ' or ')); RETURN; END IF;
  IF p_method IN ('Face','Thumb','Card') AND NOT EXISTS (SELECT 1 FROM hostel.biometric_enrolment e WHERE e.student_id = p_student AND e.method = p_method AND e.status = 'Active') THEN
    verdict := 'Denied'; reason := format('No %s enrolment for this student', lower(p_method::text)); RETURN;
  END IF;
  -- 2. who
  IF pol.who = 'Staff_Only' THEN verdict := 'Denied'; reason := 'Staff only'; RETURN; END IF;
  IF pol.who IN ('All_Hostellers','Own_Hostel','Own_Floor') AND stay.facility_id IS NULL THEN verdict := 'Denied'; reason := 'Not a resident of any hostel'; RETURN; END IF;
  IF pol.who IN ('Own_Hostel','Own_Floor') AND pt.facility_id IS DISTINCT FROM stay.facility_id THEN verdict := 'Denied'; reason := 'Not a resident of this hostel'; RETURN; END IF;
  IF pol.who = 'Own_Floor' AND pt.zone_id IS NOT NULL AND pt.zone_id IS DISTINCT FROM stay.zone_id THEN verdict := 'Denied'; reason := 'Not a resident of this floor'; RETURN; END IF;
  -- 3. pass to go out
  IF pol.pass_to_exit AND p_direction = 'Out' AND NOT EXISTS (SELECT 1 FROM hostel.outpass o WHERE o.student_id = p_student AND o.status IN ('Approved','Out')
       AND p_at BETWEEN o.leave_from - interval '2 hours' AND o.return_by) THEN
    verdict := 'Denied'; reason := 'No approved outing pass for now'; RETURN;
  END IF;
  -- 4. hours
  v_open := pol.open_from IS NULL OR (CASE WHEN pol.open_from <= pol.open_to THEN t BETWEEN pol.open_from AND pol.open_to ELSE t >= pol.open_from OR t <= pol.open_to END);
  IF NOT v_open THEN
    IF EXISTS (SELECT 1 FROM hostel.access_request r WHERE r.student_id = p_student AND r.point_id = p_point AND r.status = 'Approved' AND p_at <= r.valid_until) THEN
      verdict := 'Allowed'; reason := 'Out of hours, on an approved request'; RETURN;
    END IF;
    IF pol.outside_hours = 'Need_Approval' THEN verdict := 'Approval_Needed'; reason := format('Open %s to %s; needs approval of the %s', to_char(pol.open_from, 'HH24:MI'), to_char(pol.open_to, 'HH24:MI'), replace(coalesce(pol.approver_role, 'Warden'), '_', ' ')); RETURN; END IF;
    IF pol.outside_hours = 'Allow_And_Alert' THEN verdict := 'Allowed_Alerted'; reason := format('Out of hours (%s to %s); the Floor Warden is told', to_char(pol.open_from, 'HH24:MI'), to_char(pol.open_to, 'HH24:MI')); RETURN; END IF;
    verdict := 'Denied'; reason := format('Closed now; open %s to %s', to_char(pol.open_from, 'HH24:MI'), to_char(pol.open_to, 'HH24:MI')); RETURN;
  END IF;
  verdict := 'Allowed'; reason := CASE WHEN pol.pass_to_exit AND p_direction = 'Out' THEN 'Approved outing pass' ELSE 'Permitted' END;
END $$;

-- audit
CREATE TRIGGER trg_audit_access_policy AFTER INSERT OR UPDATE OR DELETE ON hostel.access_policy FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('point_id');
CREATE TRIGGER trg_audit_access_request AFTER INSERT OR UPDATE OR DELETE ON hostel.access_request FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('request_id');
CREATE TRIGGER trg_audit_biometric AFTER INSERT OR UPDATE OR DELETE ON hostel.biometric_enrolment FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('student_id');

-- a refused scan is kept for the record but does not move the student; an out-of-hours entry tells the Floor Warden
ALTER TYPE hostel.alert_type ADD VALUE IF NOT EXISTS 'Out_Of_Hours';
DROP TRIGGER trg_movement_after ON hostel.movement_event;
CREATE TRIGGER trg_movement_after AFTER INSERT ON hostel.movement_event FOR EACH ROW
  WHEN (NEW.verdict IS NULL OR NEW.verdict NOT IN ('Denied','Approval_Needed')) EXECUTE FUNCTION hostel.fn_movement_after();

-- night marks taken before sessions existed belong to the night session
INSERT INTO hostel.session_attendance (session_id, att_date, student_id, status, marked_by, marked_at)
SELECT s.session_id, n.att_date, n.student_id, n.status, n.marked_by, n.marked_at FROM hostel.night_attendance n
JOIN LATERAL (SELECT session_id FROM hostel.attendance_session WHERE is_night ORDER BY session_id LIMIT 1) s ON true
ON CONFLICT DO NOTHING;
