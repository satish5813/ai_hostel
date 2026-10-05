-- =====================================================================
-- 092  Night roll call (attendance register) kept by the Floor Warden.
--      One mark per student per night. Absent raises a Not_Seen alert (API); outing and sick leave are derived
--      from hostel.outpass / hostel.sick_leave, so a warden marks only Present or Absent.
-- =====================================================================
CREATE TYPE hostel.attendance_status AS ENUM ('Present','Absent','On_Pass','Sick_Leave');

CREATE TABLE hostel.night_attendance (
  attendance_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id    varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  att_date      date        NOT NULL,
  status        hostel.attendance_status NOT NULL,
  facility_id   varchar(30) REFERENCES infra.facility(facility_id),
  remarks       varchar(200),
  marked_by     varchar(20) NOT NULL REFERENCES ref.staff_master(staff_id),
  marked_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, att_date)
);
CREATE INDEX ix_night_attendance_date ON hostel.night_attendance (att_date, facility_id);
COMMENT ON TABLE hostel.night_attendance IS 'Night roll call by the Floor Warden; one row per student per night. Corrections overwrite the row and are audited.';

CREATE TRIGGER trg_audit_night_attendance AFTER INSERT OR UPDATE OR DELETE ON hostel.night_attendance
  FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('attendance_id');
