-- Demo health data (dev only; run after migration 114). Invented values, not real people's results.
--   A Gym Manager login, and for every resident a full report from 20 September (gym equipment and laboratory),
--   with an earlier one from August for some, so the report can show the change. The patterns are the common ones
--   among Indian college students: low vitamin D for many, anaemia in some (more often women), some overweight or
--   underweight, a few with high LDL cholesterol or low vitamin B12. Safe to run again: demo reports are replaced.
INSERT INTO ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email)
VALUES ('S-GM', 'Mr.', 'Gym', 'Manager', 'Male', 'HOSTELS', 'Gym Manager', '9000000018', 'Sports_Coach', 'gym@kluniversity.in') ON CONFLICT (staff_id) DO NOTHING;
INSERT INTO portal.app_user (staff_id, full_name, email, title, home_dept) SELECT staff_id, full_name, official_email, designation, dept_code FROM ref.staff_master WHERE staff_id = 'S-GM' ON CONFLICT DO NOTHING;
INSERT INTO portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref) SELECT user_id, 'Gym_Manager', 'HOSTELS', 'S-AD', 'HO/2026/ROLES/04' FROM portal.app_user WHERE staff_id = 'S-GM' ON CONFLICT DO NOTHING;
INSERT INTO portal.demo_login (username, password_hash, role_code, user_ref, display_name, description, group_name, sort_order)
VALUES ('S-GM', crypt('Demo@2026', gen_salt('bf', 8)), 'Gym_Manager', 'S-GM', 'Gym Manager', 'Students'' health reports: capture, upload, view', 'Health', 47)
ON CONFLICT (username) DO UPDATE SET role_code = excluded.role_code, display_name = excluded.display_name, description = excluded.description, active = true;

BEGIN;
SELECT setseed(0.61);
DELETE FROM hostel.health_report WHERE entered_by = 'S-GM' AND device_ref LIKE 'DEMO-%';

DO $$
DECLARE s record; rid bigint; d timestamptz; f boolean; n int := 0; v jsonb;
  anaemic boolean; vitd_low boolean; heavy boolean; thin boolean; lipid boolean; b12 boolean; sugar boolean; fit numeric;
  wt numeric; ht numeric; hb numeric; k text;
BEGIN
  FOR s IN SELECT sm.student_id, sm.gender::text AS g, (sm.gender::text = 'Female') AS fem FROM hostel.v_resident_snapshot r JOIN ref.student_master sm USING (student_id) ORDER BY sm.student_id LOOP
    n := n + 1;
    anaemic := random()::numeric < CASE WHEN s.fem THEN 0.45 ELSE 0.15 END;
    vitd_low := random()::numeric < 0.65; heavy := random()::numeric < 0.22; thin := NOT heavy AND random()::numeric < 0.18;
    lipid := heavy AND random()::numeric < 0.6; b12 := random()::numeric < 0.2; sugar := heavy AND random()::numeric < 0.3; fit := random()::numeric;
    FOREACH d IN ARRAY CASE WHEN n % 3 = 0 THEN ARRAY[TIMESTAMPTZ '2026-08-10 07:30+05:30', TIMESTAMPTZ '2026-09-20 07:30+05:30'] ELSE ARRAY[TIMESTAMPTZ '2026-09-20 07:30+05:30'] END LOOP
      f := d < '2026-09-01';                                   -- the August report: a little worse than September
      ht := CASE WHEN s.fem THEN 152 + random()::numeric * 16 ELSE 163 + random()::numeric * 18 END;
      wt := (ht / 100) ^ 2 * CASE WHEN heavy THEN 25.5 + random()::numeric * 4 WHEN thin THEN 16.8 + random()::numeric * 1.4 ELSE 19.5 + random()::numeric * 3 END + CASE WHEN f THEN 1.2 ELSE 0 END;
      hb := CASE WHEN anaemic THEN (CASE WHEN s.fem THEN 9.2 ELSE 10.8 END) + random()::numeric * 2 ELSE (CASE WHEN s.fem THEN 12.4 ELSE 13.6 END) + random()::numeric * 2.2 END - CASE WHEN f THEN 0.4 ELSE 0 END;
      v := jsonb_build_object(
        'WT', round(wt, 1), 'HT', round(ht, 1),
        'BFAT', round(CASE WHEN heavy THEN (CASE WHEN s.fem THEN 31 ELSE 24 END) ELSE (CASE WHEN s.fem THEN 23 ELSE 15 END) END + random()::numeric * 5 - CASE WHEN thin THEN 4 ELSE 0 END, 1),
        'SMM', round(CASE WHEN s.fem THEN 19 ELSE 28 END + random()::numeric * 8 - CASE WHEN thin THEN 3 ELSE 0 END, 1),
        'VFAT', round(CASE WHEN heavy THEN 9 + random()::numeric * 5 ELSE 2 + random()::numeric * 5 END),
        'TBW', round(CASE WHEN s.fem THEN 48 ELSE 54 END + random()::numeric * 8, 1), 'BONE', round(CASE WHEN s.fem THEN 2.2 ELSE 2.9 END + random()::numeric * 0.6, 1),
        'PROTP', round(15.5 + random()::numeric * 4, 1), 'BMR', round(CASE WHEN s.fem THEN 1250 ELSE 1550 END + random()::numeric * 250),
        'MAGE', round(19 + random()::numeric * 6 + CASE WHEN heavy THEN 6 ELSE 0 END), 'WAIST', round(CASE WHEN s.fem THEN 68 ELSE 76 END + CASE WHEN heavy THEN 16 ELSE 0 END + random()::numeric * 8, 1),
        'WHR', round(CASE WHEN s.fem THEN 0.76 ELSE 0.83 END + CASE WHEN heavy THEN 0.08 ELSE 0 END + random()::numeric * 0.05, 2),
        'SBP', round(108 + random()::numeric * 16 + CASE WHEN heavy THEN 10 ELSE 0 END), 'DBP', round(68 + random()::numeric * 12 + CASE WHEN heavy THEN 6 ELSE 0 END),
        'HR', round(64 + random()::numeric * 22 + CASE WHEN fit < 0.2 THEN 8 ELSE 0 END), 'SPO2', round(97 + random()::numeric * 2), 'TEMP', round(36.4 + random()::numeric * 0.6, 1),
        'VO2MAX', round(CASE WHEN s.fem THEN 30 ELSE 36 END + fit * 16 - CASE WHEN heavy THEN 4 ELSE 0 END, 1),
        'GRIP', round(CASE WHEN s.fem THEN 18 ELSE 30 END + fit * 14, 1), 'SITRCH', round(CASE WHEN s.fem THEN 24 ELSE 20 END + random()::numeric * 14),
        'PUSHUP', round(CASE WHEN s.fem THEN 6 ELSE 14 END + fit * 22)) || jsonb_build_object(   -- two objects: a function takes at most 100 arguments
        'HB', round(hb, 1), 'RBC', round(CASE WHEN s.fem THEN 4.0 ELSE 4.6 END + random()::numeric * 0.8 - CASE WHEN anaemic THEN 0.4 ELSE 0 END, 2),
        'PCV', round(hb * 3 + random()::numeric * 2, 1), 'MCV', round(CASE WHEN anaemic THEN 72 + random()::numeric * 9 ELSE 85 + random()::numeric * 12 END, 1),
        'MCH', round(CASE WHEN anaemic THEN 22 + random()::numeric * 4 ELSE 27.5 + random()::numeric * 4 END, 1), 'MCHC', round(31.8 + random()::numeric * 2.4, 1),
        'RDW', round(CASE WHEN anaemic THEN 14.5 + random()::numeric * 2 ELSE 12 + random()::numeric * 1.8 END, 1), 'TLC', round(5 + random()::numeric * 4.5, 2),
        'NEUT', round(50 + random()::numeric * 20), 'LYMPH', round(25 + random()::numeric * 12), 'MONO', round(4 + random()::numeric * 4), 'EOS', round(1 + random()::numeric * 5 + CASE WHEN random()::numeric < 0.1 THEN 4 ELSE 0 END), 'BASO', 0,
        'PLT', round(180 + random()::numeric * 190), 'ESR', round(4 + random()::numeric * 14 + CASE WHEN anaemic THEN 8 ELSE 0 END)) || jsonb_build_object(
        'FBS', round(CASE WHEN sugar THEN 104 + random()::numeric * 18 ELSE 78 + random()::numeric * 18 END), 'PPBS', round(CASE WHEN sugar THEN 145 + random()::numeric * 30 ELSE 98 + random()::numeric * 32 END),
        'HBA1C', round(CASE WHEN sugar THEN 5.8 + random()::numeric * 0.5 ELSE 4.7 + random()::numeric * 0.8 END, 1),
        'TCHOL', round(CASE WHEN lipid THEN 212 + random()::numeric * 40 ELSE 140 + random()::numeric * 50 END), 'TG', round(CASE WHEN lipid THEN 160 + random()::numeric * 80 ELSE 70 + random()::numeric * 70 END),
        'HDL', round(CASE WHEN heavy THEN 34 + random()::numeric * 10 ELSE 42 + random()::numeric * 18 END + CASE WHEN s.fem THEN 6 ELSE 0 END),
        'TBIL', round(0.4 + random()::numeric * 0.7, 2), 'DBIL', round(0.08 + random()::numeric * 0.2, 2), 'SGOT', round(18 + random()::numeric * 18 + CASE WHEN heavy THEN 12 ELSE 0 END),
        'SGPT', round(14 + random()::numeric * 22 + CASE WHEN heavy THEN 22 ELSE 0 END), 'ALP', round(55 + random()::numeric * 50), 'GGT', round(12 + random()::numeric * 25),
        'TPROT', round(6.6 + random()::numeric * 1.4, 1), 'ALB', round(3.8 + random()::numeric * 1.0, 1),
        'UREA', round(18 + random()::numeric * 20), 'CREAT', round(CASE WHEN s.fem THEN 0.6 ELSE 0.8 END + random()::numeric * 0.35, 2), 'URIC', round(CASE WHEN s.fem THEN 3.2 ELSE 4.4 END + random()::numeric * 2.5 + CASE WHEN heavy THEN 1.2 ELSE 0 END, 1),
        'NA', round(137 + random()::numeric * 6), 'K', round(3.7 + random()::numeric * 1.1, 1), 'CL', round(99 + random()::numeric * 6), 'CA', round(8.8 + random()::numeric * 1.2, 1),
        'TSH', round(CASE WHEN random()::numeric < 0.08 THEN 5.2 + random()::numeric * 3 ELSE 0.9 + random()::numeric * 2.8 END, 2), 'FT3', round(2.4 + random()::numeric * 1.6, 2), 'FT4', round(1.0 + random()::numeric * 0.6, 2),
        'VITD', round(CASE WHEN vitd_low THEN 9 + random()::numeric * 19 ELSE 31 + random()::numeric * 25 END - CASE WHEN f THEN 3 ELSE 0 END, 1),
        'VITB12', round(CASE WHEN b12 THEN 140 + random()::numeric * 60 ELSE 260 + random()::numeric * 420 END),
        'IRON', round(CASE WHEN anaemic THEN 30 + random()::numeric * 25 ELSE 70 + random()::numeric * 70 END), 'FERR', round(CASE WHEN anaemic THEN 5 + random()::numeric * 10 ELSE CASE WHEN s.fem THEN 25 ELSE 60 END + random()::numeric * 80 END),
        'U_COLOR', 'Pale yellow', 'U_PH', round(5.5 + random()::numeric * 1.5, 1), 'U_SG', round(1.010 + random()::numeric * 0.015, 3), 'U_PROT', 'Negative', 'U_GLU', 'Negative',
        'U_KET', 'Negative', 'U_PUS', round(random()::numeric * 4 + CASE WHEN random()::numeric < 0.06 THEN 8 ELSE 0 END), 'U_RBC', round(random()::numeric * 2));
      INSERT INTO hostel.health_report (student_id, collected_at, reported_at, source, device_ref, lab_name, device_notes, entered_by)
      VALUES (s.student_id, d, d + interval '6 hours', 'Device', 'DEMO-BODY-01', 'University Health Centre laboratory',
        CASE WHEN heavy THEN 'Body-fat and visceral-fat readings above the healthy band; fitness score below average for age.'
             WHEN thin THEN 'Weight and muscle mass below the healthy band for height.'
             WHEN fit > 0.7 THEN 'Good aerobic fitness and body composition for age.' ELSE 'Body composition within the healthy band.' END, 'S-GM')
      RETURNING report_id INTO rid;
      INSERT INTO hostel.health_result (report_id, test_code, value_num, value_text)
      SELECT rid, e.key, CASE WHEN jsonb_typeof(e.value) = 'number' THEN (e.value #>> '{}')::numeric END, CASE WHEN jsonb_typeof(e.value) = 'string' THEN e.value #>> '{}' END
        FROM jsonb_each(v) e;
      -- derived as the API does: BMI, VLDL, LDL, cholesterol / HDL
      INSERT INTO hostel.health_result (report_id, test_code, value_num)
      SELECT rid, x.k, x.v FROM (VALUES
        ('BMI', round((v->>'WT')::numeric / ((v->>'HT')::numeric / 100) ^ 2, 1)),
        ('VLDL', round((v->>'TG')::numeric / 5)),
        ('LDL', round((v->>'TCHOL')::numeric - (v->>'HDL')::numeric - (v->>'TG')::numeric / 5)),
        ('CHR', round((v->>'TCHOL')::numeric / (v->>'HDL')::numeric, 1))) x(k, v);
    END LOOP;
  END LOOP;
END $$;
COMMIT;

SELECT count(DISTINCT student_id) AS students, count(*) AS reports,
       (SELECT count(*) FROM hostel.health_result r JOIN hostel.health_report h USING (report_id) WHERE h.device_ref LIKE 'DEMO-%' AND r.flag IN ('L','H','LL','HH','A')) AS out_of_range
  FROM hostel.health_report WHERE device_ref LIKE 'DEMO-%';
