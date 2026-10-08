-- =====================================================================
-- 104  Dean, Students Affairs portal, 4 Oct 2026.
--   Discipline register (Workflow M, DIS-01..03): the Chief Warden records an incident with the student's statement,
--   findings and a recommendation and sends it to the Dean; the Dean awards a punishment or closes it with no action.
--   An outing ban stops new outing requests while it is in force (rule already in 060).
--   Career goal: what a hosteller says they are working towards (placement, higher studies ...), set by the student,
--   read against their record in the Dean's career guidance view.
--   Weekly floor report: every Monday the system prepares last week's report per hostel, floor by floor (roll-call
--   absences, outings and late returns, sick leave, discipline); the Chief Warden adds remarks and sends it to the Dean.
-- =====================================================================

-- ---------- discipline register ----------
CREATE SEQUENCE IF NOT EXISTS hostel.seq_discipline_case;
ALTER TABLE hostel.discipline_case
  ADD COLUMN IF NOT EXISTS facility_id varchar(30) REFERENCES hostel.hostel_profile(facility_id),
  ADD COLUMN IF NOT EXISTS submitted_by varchar(20),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS dean_decision text,
  ADD COLUMN IF NOT EXISTS decided_by varchar(20),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;
UPDATE hostel.discipline_case SET status = 'Reported' WHERE status IS NULL OR status NOT IN ('Reported', 'With_Dean', 'Action_Taken', 'Closed_No_Action');
ALTER TABLE hostel.discipline_case ALTER COLUMN status SET DEFAULT 'Reported';
ALTER TABLE hostel.discipline_case ADD CONSTRAINT ck_discipline_case_status CHECK (status IN ('Reported', 'With_Dean', 'Action_Taken', 'Closed_No_Action'));
CREATE UNIQUE INDEX IF NOT EXISTS ux_discipline_case_no ON hostel.discipline_case (case_no);
COMMENT ON COLUMN hostel.discipline_case.status IS 'Reported (Chief Warden inquiring) -> With_Dean -> Action_Taken | Closed_No_Action';

CREATE OR REPLACE FUNCTION hostel.fn_discipline_case_before() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.case_no := coalesce(NEW.case_no, 'DC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('hostel.seq_discipline_case')::text, 5, '0'));
    NEW.recorded_at := coalesce(NEW.recorded_at, now());
    NEW.status := 'Reported';
    IF NEW.facility_id IS NULL THEN
      SELECT b.facility_id INTO NEW.facility_id FROM hostel.hostel_allocation a JOIN hostel.v_bed b ON b.subspace_id = a.subspace_id
       WHERE a.student_id = NEW.student_id AND a.status = 'Active' LIMIT 1;
    END IF;
    IF NEW.incident_on > now() THEN RAISE EXCEPTION 'The incident cannot be in the future' USING ERRCODE = 'P0001'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'Reported' AND NEW.status = 'With_Dean' THEN
      IF coalesce(trim(NEW.cw_findings), '') = '' OR coalesce(trim(NEW.cw_recommendation), '') = '' THEN
        RAISE EXCEPTION 'Write the findings and a recommendation before sending the case to the Dean' USING ERRCODE = 'P0001';
      END IF;
      NEW.submitted_at := coalesce(NEW.submitted_at, now());
    ELSIF OLD.status = 'With_Dean' AND NEW.status IN ('Action_Taken', 'Closed_No_Action') THEN
      IF coalesce(trim(NEW.dean_decision), '') = '' THEN RAISE EXCEPTION 'Write the decision' USING ERRCODE = 'P0001'; END IF;
      NEW.decided_at := coalesce(NEW.decided_at, now());
    ELSIF OLD.status = 'With_Dean' AND NEW.status = 'Reported' THEN
      NULL;   -- the Dean returns the case for more inquiry
    ELSE
      RAISE EXCEPTION 'A case cannot go from % to %', OLD.status, NEW.status USING ERRCODE = 'P0001';
    END IF;
  ELSIF OLD.status IN ('Action_Taken', 'Closed_No_Action') THEN
    RAISE EXCEPTION 'Case % is closed', OLD.case_no USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_discipline_case_before ON hostel.discipline_case;
CREATE TRIGGER trg_discipline_case_before BEFORE INSERT OR UPDATE ON hostel.discipline_case FOR EACH ROW EXECUTE FUNCTION hostel.fn_discipline_case_before();
DROP TRIGGER IF EXISTS trg_audit_discipline_case ON hostel.discipline_case;
CREATE TRIGGER trg_audit_discipline_case AFTER INSERT OR UPDATE OR DELETE ON hostel.discipline_case FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('case_id');
DROP TRIGGER IF EXISTS trg_audit_discipline_punishment ON hostel.discipline_punishment;
CREATE TRIGGER trg_audit_discipline_punishment AFTER INSERT OR UPDATE OR DELETE ON hostel.discipline_punishment FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('punishment_id');

-- The Dean is told when a case arrives; the student when it is decided.
CREATE OR REPLACE FUNCTION hostel.fn_discipline_case_after() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'With_Dean' AND OLD.status IS DISTINCT FROM 'With_Dean' THEN
    INSERT INTO shared.notification (recipient_type, student_id, staff_id, channel, template_code, subject, body, related_type, related_id)
    SELECT 'Staff', NEW.student_id, u.staff_id, 'In_App', 'DISCIPLINE_TO_DEAN', 'Discipline case ' || NEW.case_no || ' for your decision',
           'The Chief Warden has sent case ' || NEW.case_no || ' (' || replace(NEW.incident_type, '_', ' ') || ') with a recommendation: ' || NEW.cw_recommendation,
           'discipline_case', NEW.case_id::text
      FROM portal.user_role r JOIN portal.app_user u ON u.user_id = r.user_id AND u.active
     WHERE r.role_code = 'Dean_Students_Affairs' AND u.staff_id IS NOT NULL;
  ELSIF NEW.status IN ('Action_Taken', 'Closed_No_Action') AND OLD.status = 'With_Dean' THEN
    INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
    VALUES ('Student', NEW.student_id, 'In_App', 'DISCIPLINE_DECIDED', 'Discipline case ' || NEW.case_no,
            CASE WHEN NEW.status = 'Closed_No_Action' THEN 'Case ' || NEW.case_no || ' is closed with no action.'
                 ELSE 'The Dean, Students Affairs has decided case ' || NEW.case_no || ': ' || NEW.dean_decision END,
            'discipline_case', NEW.case_id::text);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_discipline_case_after ON hostel.discipline_case;
CREATE TRIGGER trg_discipline_case_after AFTER UPDATE OF status ON hostel.discipline_case FOR EACH ROW EXECUTE FUNCTION hostel.fn_discipline_case_after();

-- ---------- career goal ----------
CREATE TABLE IF NOT EXISTS acad.career_goal (
  student_id  varchar(20) PRIMARY KEY REFERENCES ref.student_master(student_id),
  goal        varchar(30) NOT NULL CHECK (goal IN ('Placement_Product', 'Placement_Services', 'Higher_Studies', 'Govt_Exams', 'Entrepreneurship', 'Core_Other', 'Undecided')),
  notes       varchar(300),
  stated_on   timestamptz NOT NULL DEFAULT now(),
  updated_by  varchar(20)
);
COMMENT ON TABLE acad.career_goal IS 'What the student is working towards after the degree, in their own words; read against their record by the Dean';

-- ---------- weekly floor report ----------
CREATE TABLE IF NOT EXISTS hostel.weekly_floor_report (
  report_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  facility_id   varchar(30) NOT NULL REFERENCES hostel.hostel_profile(facility_id),
  week_start    date NOT NULL CHECK (extract(isodow FROM week_start) = 1),
  metrics       jsonb NOT NULL,
  floors        jsonb NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  cw_remarks    text,
  status        varchar(10) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Read')),
  sent_by       varchar(20),
  sent_at       timestamptz,
  read_by       varchar(20),
  read_at       timestamptz,
  UNIQUE (facility_id, week_start)
);
COMMENT ON TABLE hostel.weekly_floor_report IS 'Last week per hostel and floor for the Dean: prepared on Monday, sent by the Chief Warden with remarks';
CREATE TRIGGER trg_audit_weekly_floor_report AFTER UPDATE OR DELETE ON hostel.weekly_floor_report FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('report_id');

-- Prepares (or refreshes, while still a draft) the reports of the week starting p_week (default: last week).
CREATE OR REPLACE FUNCTION hostel.fn_build_weekly_floor_reports(p_week date DEFAULT NULL) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  w0 date := coalesce(p_week, date_trunc('week', current_date - 7)::date);
  w1 date := w0 + 6;
  n integer := 0; h record;
BEGIN
  IF extract(isodow FROM w0) <> 1 THEN RAISE EXCEPTION 'A week starts on a Monday' USING ERRCODE = 'P0001'; END IF;
  FOR h IN SELECT hp.facility_id FROM hostel.hostel_profile hp WHERE hp.status = 'Active' AND hp.hostel_gender <> 'Staff' LOOP
    WITH res AS (   -- residents and their floor today
      SELECT b.student_id, b.floor_no, b.floor_name FROM hostel.v_bed b WHERE b.facility_id = h.facility_id AND b.occupant_type = 'Student' AND b.student_id IS NOT NULL),
    att AS (SELECT r.floor_no, count(*) FILTER (WHERE na.status = 'Absent') AS absences, count(*) AS marked,
                   count(*) FILTER (WHERE na.status = 'On_Pass') AS on_pass, count(*) FILTER (WHERE na.status = 'Sick_Leave') AS on_sick
              FROM hostel.night_attendance na JOIN res r ON r.student_id = na.student_id WHERE na.att_date BETWEEN w0 AND w1 GROUP BY 1),
    rep AS (SELECT r.floor_no, jsonb_agg(jsonb_build_object('student_id', r.student_id, 'full_name', initcap(sm.full_name), 'nights', x.n) ORDER BY x.n DESC) AS list
              FROM (SELECT student_id, count(*) AS n FROM hostel.night_attendance WHERE status = 'Absent' AND att_date BETWEEN w0 AND w1 GROUP BY 1 HAVING count(*) >= 2) x
              JOIN res r ON r.student_id = x.student_id JOIN ref.student_master sm ON sm.student_id = x.student_id GROUP BY 1),
    outs AS (SELECT r.floor_no, count(*) AS outings, count(*) FILTER (WHERE o.late_by_minutes > 0 OR o.status = 'Overdue') AS late
               FROM hostel.outpass o JOIN res r ON r.student_id = o.student_id
              WHERE o.leave_from::date BETWEEN w0 AND w1 AND o.status NOT IN ('Cancelled', 'Rejected') GROUP BY 1),
    sick AS (SELECT r.floor_no, count(*) AS sick FROM hostel.sick_leave s JOIN res r ON r.student_id = s.student_id
              WHERE s.from_date BETWEEN w0 AND w1 AND s.status::text NOT IN ('Cancelled', 'Rejected') GROUP BY 1),
    dis AS (SELECT r.floor_no, count(*) AS cases FROM hostel.discipline_case d JOIN res r ON r.student_id = d.student_id
             WHERE d.incident_on::date BETWEEN w0 AND w1 GROUP BY 1),
    fl AS (SELECT r.floor_no, min(r.floor_name) AS floor_name, count(*) AS residents FROM res r GROUP BY 1),
    floors AS (
      SELECT jsonb_agg(jsonb_build_object(
               'floor_no', fl.floor_no, 'floor_name', fl.floor_name, 'residents', fl.residents,
               'nights_marked', coalesce(att.marked, 0), 'absences', coalesce(att.absences, 0), 'on_pass', coalesce(att.on_pass, 0), 'on_sick', coalesce(att.on_sick, 0),
               'outings', coalesce(outs.outings, 0), 'late_returns', coalesce(outs.late, 0), 'sick_leaves', coalesce(sick.sick, 0), 'cases', coalesce(dis.cases, 0),
               'repeat_absentees', coalesce(rep.list, '[]'::jsonb)) ORDER BY fl.floor_no) AS j,
             jsonb_build_object(
               'residents', coalesce(sum(fl.residents), 0), 'nights_marked', coalesce(sum(coalesce(att.marked, 0)), 0), 'absences', coalesce(sum(coalesce(att.absences, 0)), 0),
               'outings', coalesce(sum(coalesce(outs.outings, 0)), 0), 'late_returns', coalesce(sum(coalesce(outs.late, 0)), 0), 'sick_leaves', coalesce(sum(coalesce(sick.sick, 0)), 0),
               'cases', coalesce(sum(coalesce(dis.cases, 0)), 0), 'repeat_absentees', coalesce(sum(coalesce(jsonb_array_length(rep.list), 0)), 0)) AS m
        FROM fl LEFT JOIN att USING (floor_no) LEFT JOIN rep USING (floor_no) LEFT JOIN outs USING (floor_no) LEFT JOIN sick USING (floor_no) LEFT JOIN dis USING (floor_no))
    INSERT INTO hostel.weekly_floor_report (facility_id, week_start, metrics, floors)
    SELECT h.facility_id, w0, coalesce(m, '{}'::jsonb), coalesce(j, '[]'::jsonb) FROM floors
    ON CONFLICT (facility_id, week_start) DO UPDATE SET metrics = excluded.metrics, floors = excluded.floors, generated_at = now()
     WHERE hostel.weekly_floor_report.status = 'Draft';
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
