-- =====================================================================
-- 108  Executive dashboard (EXE-01) for the President, Vice President and Pro-VCs, 4 Oct 2026.
--   One card per hostel building, opening into its student performance (backlogs, cumulative attendance short of
--   the minimum, clubs, sports and other activities), mess, fees and dues, wardens' attendance and discipline.
--   This file adds the attendance minimum as a setting and one row per resident with what the cards count.
-- =====================================================================

INSERT INTO shared.policy_setting (setting_key, module, amount, value_text, meaning) VALUES
  ('attendance_min_pct', 'hostel', 75, NULL, 'Cumulative class attendance below this per cent is a shortfall'),
  ('cgpa_watch', 'hostel', 6, NULL, 'CGPA below this is shown as needing attention')
ON CONFLICT (setting_key) DO NOTHING;

-- Each resident with their latest term result and this academic year's activities.
CREATE OR REPLACE VIEW hostel.v_resident_snapshot AS
WITH yr AS (SELECT start_date, end_date FROM hostel.academic_year WHERE is_current LIMIT 1)
SELECT a.student_id, initcap(sm.full_name) AS name, sm.programme, sm.dept_code, sm.year_semester,
       CASE WHEN sm.gender::text IN ('Female', 'F') THEN 'Girls' ELSE 'Boys' END AS grp,
       b.facility_id, b.hostel_code, b.subspace_id,
       t.term_label, t.semester_no, t.cgpa, t.sgpa, t.attendance_pct, coalesce(t.backlogs, 0) AS backlogs,
       coalesce(ac.n, 0) AS activities, ac.types AS activity_types, coalesce(ac.hours, 0) AS activity_hours,
       coalesce(ach.n, 0) AS achievements
  FROM hostel.hostel_allocation a
  JOIN hostel.v_bed b ON b.subspace_id = a.subspace_id
  JOIN ref.student_master sm ON sm.student_id = a.student_id
  CROSS JOIN yr
  LEFT JOIN LATERAL (SELECT * FROM acad.term_result x WHERE x.student_id = a.student_id ORDER BY x.semester_no DESC LIMIT 1) t ON true
  LEFT JOIN LATERAL (SELECT count(*)::int AS n, array_agg(DISTINCT x.activity_type::text) AS types, sum(x.hours) AS hours FROM acad.activity x
                      WHERE x.student_id = a.student_id AND x.from_date <= yr.end_date AND coalesce(x.to_date, yr.end_date) >= yr.start_date - 365) ac ON true
  LEFT JOIN LATERAL (SELECT count(*)::int AS n FROM acad.achievement x WHERE x.student_id = a.student_id AND x.achieved_on >= yr.start_date - 365) ach ON true
 WHERE a.status = 'Active' AND a.occupant_type = 'Student';
COMMENT ON VIEW hostel.v_resident_snapshot IS 'Each resident: building, latest term result (CGPA, cumulative attendance, backlogs), activities and achievements of the last year';
