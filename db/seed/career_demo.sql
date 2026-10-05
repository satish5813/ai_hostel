-- Demo data for career tracking (dev only; run after migration 109):
--   fourteen residents are final-year students (semesters 4 to 6 added to their results) with placement offers,
--   higher-studies applications, competitive examinations and ventures; the other residents are in second year.
--   The demo sign-in students stay in second year. Safe to run again.
BEGIN;
CREATE TEMP TABLE fy (student_id varchar(20) PRIMARY KEY, goal varchar(30), drift numeric) ON COMMIT DROP;
INSERT INTO fy VALUES
  ('2600040021', 'Placement_Product', 0.3), ('2600040022', 'Placement_Services', -0.2), ('2600040023', 'Higher_Studies', 0.4), ('2600040024', 'Entrepreneurship', 0.0),
  ('2600040025', 'Placement_Services', -0.6), ('2600041002', 'Higher_Studies', 0.2),
  ('2600042203', 'Placement_Product', 0.1), ('2600042207', 'Govt_Exams', -0.1), ('2600042208', 'Higher_Studies', 0.3),
  ('2600042005', 'Placement_Product', 0.2), ('2600042007', 'Govt_Exams', 0.0), ('2600042008', 'Higher_Studies', 0.5),
  ('2600042302', 'Placement_Services', 0.1), ('2600042304', 'Entrepreneurship', -0.3);

UPDATE ref.student_master SET year_semester = '4 Year / Sem 7' WHERE student_id IN (SELECT student_id FROM fy);
UPDATE ref.student_master SET year_semester = '2 Year / Sem 3'
 WHERE student_id IN (SELECT student_id FROM hostel.v_resident_snapshot) AND student_id NOT IN (SELECT student_id FROM fy) AND year_semester IS NULL;
INSERT INTO acad.career_goal (student_id, goal, notes, updated_by) SELECT student_id, goal, NULL, 'system' FROM fy
ON CONFLICT (student_id) DO UPDATE SET goal = excluded.goal;

-- semesters 4 to 6: the student's last result, drifting a little each term
INSERT INTO acad.term_result (student_id, semester_no, term_label, sgpa, cgpa, credits_earned, attendance_pct, backlogs)
SELECT f.student_id, s, CASE s WHEN 4 THEN '2024-25 Even' WHEN 5 THEN '2025-26 Odd' ELSE '2025-26 Even' END,
       greatest(5, least(9.9, t.cgpa + f.drift * (s - 3) / 3.0)), greatest(5, least(9.8, t.cgpa + f.drift * (s - 3) / 6.0)), 21,
       greatest(62, least(98, t.attendance_pct + (f.drift * 6)::numeric + (s - 4))),
       CASE WHEN f.drift <= -0.5 AND s = 6 THEN 2 WHEN f.drift <= -0.3 AND s >= 5 THEN 1 ELSE 0 END
  FROM fy f JOIN LATERAL (SELECT * FROM acad.term_result x WHERE x.student_id = f.student_id ORDER BY semester_no DESC LIMIT 1) t ON true
  CROSS JOIN generate_series(4, 6) s
ON CONFLICT DO NOTHING;

DELETE FROM acad.career_outcome WHERE student_id IN (SELECT student_id FROM fy);
INSERT INTO acad.career_outcome (student_id, outcome_type, stage, organisation, detail, ctc_lpa, country, score, funding_inr, stage_on, source, verified, created_by) VALUES
  -- placements: product companies
  ('2600040021', 'Placement', 'Rejected', 'Google', 'Software engineer', NULL, NULL, NULL, NULL, '2026-08-20', 'Placement_Cell', true, 'system'),
  ('2600040021', 'Placement', 'Offer', 'Microsoft', 'Software engineer', 44.00, NULL, NULL, NULL, '2026-09-12', 'Placement_Cell', true, 'system'),
  ('2600040021', 'Placement', 'Offer', 'Zoho', 'Member technical staff', 8.40, NULL, NULL, NULL, '2026-08-30', 'Placement_Cell', true, 'system'),
  ('2600042203', 'Placement', 'Interview', 'Amazon', 'SDE 1', NULL, NULL, NULL, NULL, '2026-09-25', 'Placement_Cell', true, 'system'),
  ('2600042203', 'Placement', 'Offer', 'Freshworks', 'Software engineer', 12.00, NULL, NULL, NULL, '2026-09-05', 'Placement_Cell', true, 'system'),
  ('2600042005', 'Placement', 'Offer', 'Salesforce', 'Associate member of technical staff', 24.00, NULL, NULL, NULL, '2026-09-18', 'Placement_Cell', true, 'system'),
  ('2600042005', 'Placement', 'Declined', 'Infosys', 'Specialist programmer', 9.50, NULL, NULL, NULL, '2026-08-25', 'Placement_Cell', true, 'system'),
  -- placements: IT services
  ('2600040022', 'Placement', 'Offer', 'TCS', 'Digital', 7.00, NULL, NULL, NULL, '2026-09-02', 'Placement_Cell', true, 'system'),
  ('2600040025', 'Placement', 'Rejected', 'Accenture', 'Associate software engineer', NULL, NULL, NULL, NULL, '2026-08-28', 'Placement_Cell', true, 'system'),
  ('2600040025', 'Placement', 'Shortlisted', 'Cognizant', 'GenC', NULL, NULL, NULL, NULL, '2026-09-28', 'Placement_Cell', true, 'system'),
  ('2600042302', 'Placement', 'Offer', 'Wipro', 'Project engineer', 3.60, NULL, NULL, NULL, '2026-08-22', 'Placement_Cell', true, 'system'),
  ('2600042302', 'Placement', 'Offer', 'Deloitte', 'Analyst', 7.60, NULL, NULL, NULL, '2026-09-20', 'Placement_Cell', true, 'system'),
  -- higher studies
  ('2600040023', 'Higher_Studies', 'Admitted', 'Arizona State University', 'MS Computer Science', NULL, 'USA', 'GRE 321', NULL, '2026-09-30', 'Student', false, 'system'),
  ('2600040023', 'Higher_Studies', 'Applied', 'University of Texas at Dallas', 'MS Computer Science', NULL, 'USA', 'GRE 321', NULL, '2026-09-10', 'Student', false, 'system'),
  ('2600041002', 'Higher_Studies', 'Test_Taken', 'GATE 2027', 'M.Tech at an IIT', NULL, 'India', 'Mock 68 percentile', NULL, '2026-09-15', 'Student', false, 'system'),
  ('2600041002', 'Placement', 'Offer', 'Cognizant', 'Programmer analyst (backup)', 4.50, NULL, NULL, NULL, '2026-09-08', 'Placement_Cell', true, 'system'),
  ('2600042208', 'Higher_Studies', 'Admitted', 'Technical University of Munich', 'M.Sc. Informatics', NULL, 'Germany', 'IELTS 7.5', NULL, '2026-09-22', 'Student', true, 'system'),
  ('2600042008', 'Higher_Studies', 'Applied', 'IIM Bangalore', 'MBA (PGP)', NULL, 'India', 'CAT mock 92 percentile', NULL, '2026-09-26', 'Student', false, 'system'),
  ('2600042008', 'Competitive_Exam', 'Appeared', 'CAT 2026', 'Common Admission Test', NULL, NULL, NULL, NULL, '2026-09-29', 'Student', false, 'system'),
  -- competitive examinations
  ('2600042207', 'Competitive_Exam', 'Qualified', 'UPSC Civil Services', 'Preliminary examination cleared', NULL, NULL, 'Prelims 2026', NULL, '2026-06-12', 'Student', true, 'system'),
  ('2600042207', 'Competitive_Exam', 'Not_Qualified', 'APPSC Group 1', 'State civil services', NULL, NULL, NULL, NULL, '2026-05-02', 'Student', false, 'system'),
  ('2600042007', 'Competitive_Exam', 'Selected', 'SBI PO', 'Probationary officer', NULL, NULL, 'Rank 412', NULL, '2026-09-01', 'Student', true, 'system'),
  ('2600042007', 'Competitive_Exam', 'Qualified', 'GATE 2026', 'Computer Science', NULL, NULL, 'Score 612', NULL, '2026-03-16', 'Student', true, 'system'),
  -- ventures
  ('2600040024', 'Entrepreneurship', 'Funded', 'HostelHop', 'Room-sharing and mess app for colleges', NULL, NULL, NULL, 1500000, '2026-08-10', 'Student', true, 'system'),
  ('2600042304', 'Entrepreneurship', 'Incubated', 'Thapa Organics', 'Farm-to-campus vegetables', NULL, NULL, NULL, NULL, '2026-07-20', 'Student', false, 'system'),
  ('2600042304', 'Placement', 'Applied', 'Capgemini', 'Analyst', NULL, NULL, NULL, NULL, '2026-09-27', 'Placement_Cell', true, 'system');
COMMIT;

SELECT acad.fn_study_year(v.student_id) AS year, v.hostel_code, count(*) FROM hostel.v_resident_snapshot v GROUP BY 1, 2 ORDER BY 1, 2;
