-- Development data for 095: academic records of the hostellers, capture points with access rules, enrolments.
-- Deterministic: values come from hashes of the student ID, so a rerun gives the same numbers.
\set ON_ERROR_STOP 1
BEGIN;

-- results for semesters 1-3
INSERT INTO acad.term_result (student_id, semester_no, term_label, sgpa, cgpa, credits_earned, attendance_pct, backlogs)
SELECT sm.student_id, s.n, CASE s.n WHEN 1 THEN '2025-26 Odd' WHEN 2 THEN '2025-26 Even' ELSE '2026-27 Odd' END,
  round((6.2 + (abs(hashtext(sm.student_id || s.n)) % 340) / 100.0)::numeric, 2), NULL, 20 + s.n,
  round((68 + (abs(hashtext(sm.student_id || 'a' || s.n)) % 3100) / 100.0)::numeric, 2),
  CASE WHEN abs(hashtext(sm.student_id || 'b' || s.n)) % 9 = 0 THEN 1 ELSE 0 END
FROM ref.student_master sm CROSS JOIN generate_series(1, 3) s(n)
ON CONFLICT DO NOTHING;
UPDATE acad.term_result t SET cgpa = (SELECT round(avg(x.sgpa), 2) FROM acad.term_result x WHERE x.student_id = t.student_id AND x.semester_no <= t.semester_no);

-- CRT: three months of sessions and five assessments
INSERT INTO acad.crt_attendance (student_id, month, sessions_held, sessions_attended)
SELECT sm.student_id, m::date, 16, 9 + abs(hashtext(sm.student_id || m::text)) % 8
FROM ref.student_master sm CROSS JOIN generate_series(date '2026-07-01', date '2026-09-01', interval '1 month') m
ON CONFLICT DO NOTHING;
INSERT INTO acad.crt_assessment (student_id, test_name, test_date, category, score, max_score)
SELECT sm.student_id, t.name, t.d, t.c::acad.crt_category, 40 + abs(hashtext(sm.student_id || t.name)) % 58, 100
FROM ref.student_master sm CROSS JOIN (VALUES ('Aptitude test 1', date '2026-07-12', 'Aptitude'), ('Coding round 1', date '2026-07-26', 'Coding'),
  ('Verbal ability 1', date '2026-08-09', 'Verbal'), ('Aptitude test 2', date '2026-08-23', 'Aptitude'), ('Coding round 2', date '2026-09-13', 'Coding'),
  ('Mock interview', date '2026-09-27', 'Mock_Interview')) t(name, d, c)
ON CONFLICT DO NOTHING;

-- certifications, activities, achievements for some students
INSERT INTO acad.certification (student_id, title, provider, category, issued_on, credential_ref, added_by, verified_by, verified_on)
SELECT sm.student_id, c.title, c.provider, c.cat::acad.cert_category, c.d, 'CR-' || abs(hashtext(sm.student_id || c.title)) % 100000, 'file', 'S-CW', now()
FROM ref.student_master sm CROSS JOIN (VALUES ('AWS Cloud Practitioner', 'Amazon Web Services', 'Cloud', date '2026-06-20', 3), ('Python for Everybody', 'Coursera', 'Programming', date '2026-03-02', 2),
  ('Java Programming', 'NPTEL', 'Programming', date '2026-05-14', 4), ('Business English B1', 'Cambridge', 'Language', date '2026-01-30', 5)) c(title, provider, cat, d, k)
WHERE abs(hashtext(sm.student_id || c.title)) % c.k = 0
ON CONFLICT DO NOTHING;
INSERT INTO acad.activity (student_id, activity_type, title, role, from_date, to_date, hours)
SELECT sm.student_id, a.t::acad.activity_type, a.title, a.role, a.f, a.e, a.h
FROM ref.student_master sm CROSS JOIN (VALUES ('Club', 'Coding club', 'Member', date '2025-09-01', NULL::date, 40, 2), ('Sports', 'University cricket team', 'Player', date '2025-11-10', date '2026-02-20', 60, 4),
  ('NSS_NCC', 'NSS village camp', 'Volunteer', date '2026-01-05', date '2026-01-11', 56, 3), ('Hostel_Committee', 'Hostel mess committee', 'Member', date '2026-08-01', NULL, 12, 5),
  ('Internship', 'Summer internship, Infosys', 'Intern', date '2026-05-15', date '2026-07-10', 320, 6)) a(t, title, role, f, e, h, k)
WHERE abs(hashtext(sm.student_id || a.title)) % a.k = 0
ON CONFLICT DO NOTHING;
INSERT INTO acad.achievement (student_id, title, level, category, achieved_on, award, added_by, verified_by, verified_on)
SELECT sm.student_id, a.title, a.lvl::acad.achieve_level, a.cat, a.d, a.award, 'file', 'S-CW', now()
FROM ref.student_master sm CROSS JOIN (VALUES ('Smart India Hackathon', 'National', 'Technical', date '2026-03-18', 'Finalist', 4), ('Inter-university chess', 'State', 'Sports', date '2026-02-08', 'Second place', 5),
  ('Cleanest room award', 'Hostel', 'Hostel', date '2026-09-05', 'Winner', 3), ('Paper presentation, Techfest', 'University', 'Technical', date '2026-04-11', 'First prize', 6)) a(title, lvl, cat, d, award, k)
WHERE abs(hashtext(sm.student_id || a.title)) % a.k = 0
ON CONFLICT DO NOTHING;
COMMIT;

-- capture points, methods and rules (enum values added in 095 are usable now)
BEGIN;
UPDATE hostel.capture_point SET methods = '{QR,Face}' WHERE point_name = 'Main campus gate';
UPDATE hostel.capture_point SET methods = '{Card,Face}' WHERE point_name = 'BH1 entrance';
UPDATE hostel.capture_point SET methods = '{Face}' WHERE point_name = 'BH1 floor 1 corridor';
INSERT INTO hostel.capture_point (point_name, point_type, facility_id, zone_id, device_type, device_ref, methods, created_by)
SELECT x.n, x.t::hostel.point_type, x.f, x.z, x.d::hostel.device_type, x.r, x.m::hostel.capture_method[], 'S-SO'
FROM (VALUES ('BH1 floor 2 corridor', 'Room_Corridor', 'H-BH1', 'BH1-F2', 'Camera', 'CAM-BH1-F2', '{Face}'),
  ('BH1 mess counter', 'Mess', 'H-BH1', NULL, 'QR_Scanner', 'QR-MESS-1', '{QR,Card}'),
  ('Central library', 'Library', 'H-BH1', NULL, 'QR_Scanner', 'QR-LIB-1', '{QR,Card}'),
  ('Hostel gym', 'Gym', 'H-BH1', NULL, 'Card_Reader', 'CARD-GYM-1', '{Card,Thumb}'),
  ('GH1 entrance', 'Hostel_Gate', 'H-GH1', NULL, 'Card_Reader', 'CARD-GH1', '{Card,Face}')) x(n, t, f, z, d, r, m)
WHERE NOT EXISTS (SELECT 1 FROM hostel.capture_point p WHERE p.point_name = x.n);

INSERT INTO hostel.access_policy (point_id, who, open_from, open_to, outside_hours, pass_to_exit, proof, approver_role, photo_on_entry, updated_by)
SELECT p.point_id, x.who, x.f::time, x.t::time, x.o, x.pass, x.proof::hostel.capture_method[], x.role, x.photo, 'S-CW'
FROM hostel.capture_point p JOIN (VALUES
  ('Main campus gate', 'All_Hostellers', NULL, NULL, 'Deny', true, '{QR,Face}', NULL, true),
  ('BH1 entrance', 'Own_Hostel', '05:00', '22:00', 'Need_Approval', false, '{Card,Face}', 'Floor_Warden', true),
  ('GH1 entrance', 'Own_Hostel', '05:00', '21:30', 'Need_Approval', false, '{Card,Face}', 'Warden', true),
  ('BH1 floor 1 corridor', 'Own_Floor', NULL, NULL, 'Deny', false, '{Face}', NULL, false),
  ('BH1 floor 2 corridor', 'Own_Floor', NULL, NULL, 'Deny', false, '{Face}', NULL, false),
  ('BH1 mess counter', 'All_Hostellers', '07:00', '21:30', 'Deny', false, '{QR,Card}', NULL, false),
  ('Central library', 'All_Hostellers', '08:00', '23:00', 'Allow_And_Alert', false, '{QR,Card}', NULL, false),
  ('Hostel gym', 'Own_Hostel', '05:30', '21:00', 'Need_Approval', false, '{Card,Thumb}', 'Warden', false)) x(n, who, f, t, o, pass, proof, role, photo) ON x.n = p.point_name
ON CONFLICT (point_id) DO NOTHING;

-- enrolments: everyone in a bed has a card; most have a face template; a few a thumb
INSERT INTO hostel.biometric_enrolment (student_id, method, template_ref, enrolled_by)
SELECT a.student_id, m.m::hostel.capture_method, 'VND-' || m.m || '-' || abs(hashtext(a.student_id || m.m)) % 1000000, 'S-SO'
FROM hostel.hostel_allocation a CROSS JOIN (VALUES ('Card', 1), ('Face', 2), ('Thumb', 3)) m(m, k)
WHERE a.status = 'Active' AND a.student_id IS NOT NULL AND (m.k = 1 OR abs(hashtext(a.student_id || m.m)) % m.k <> 0)
ON CONFLICT DO NOTHING;
COMMIT;
