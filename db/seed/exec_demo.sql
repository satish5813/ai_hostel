-- Demo data for the executive dashboard (dev only): thirty days of attendance of every warden and hostel
-- officer assigned to a hostel, so each building's "wardens' attendance" card has something to show.
-- Safe to run again: the last 30 days of these staff are replaced.
BEGIN;
SELECT setseed(0.17);
DELETE FROM hostel.staff_attendance sa USING hostel.staff_space_assignment x
 WHERE x.staff_id = sa.staff_id AND x.hostel_role IN ('Chief_Warden', 'Warden', 'Floor_Warden', 'Assistant_Warden', 'Hostel_Incharge')
   AND sa.att_date > current_date - 30;
INSERT INTO hostel.staff_attendance (att_date, staff_id, facility_id, status, in_time, marked_by)
SELECT d::date, x.staff_id, x.facility_id,
       (CASE WHEN r < 0.06 + (abs(hashtext(x.staff_id)) % 5) * 0.025 THEN 'Absent' WHEN r < 0.12 + (abs(hashtext(x.staff_id)) % 5) * 0.025 THEN 'Leave' ELSE 'Present' END)::hostel.staff_day_status,
       CASE WHEN r >= 0.12 THEN time '08:30' + make_interval(mins => (random() * 50)::int) END, 'S-CW'
  FROM (SELECT x.staff_id, x.facility_id, d, random() AS r                     -- one draw per person and day
          FROM (SELECT DISTINCT ON (staff_id) staff_id, facility_id FROM hostel.staff_space_assignment
                 WHERE status = 'Active' AND hostel_role IN ('Chief_Warden', 'Warden', 'Floor_Warden', 'Assistant_Warden', 'Hostel_Incharge') ORDER BY staff_id, facility_id) x
          CROSS JOIN generate_series(current_date - 29, current_date, interval '1 day') d) x
ON CONFLICT DO NOTHING;
COMMIT;
SELECT facility_id, status, count(*) FROM hostel.staff_attendance WHERE att_date > current_date - 30 GROUP BY 1, 2 ORDER BY 1, 2;
