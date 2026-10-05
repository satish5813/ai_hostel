-- Mess operations, checklists and grievances demo (dev only; run after migration 119). Invented records, marked "Demo".
--   * a Mess Storekeeper login (S-MK)
--   * both messes: provisions received on 1 Sep, 15 Sep and 1 Oct; daily issues to the kitchen per meal, sized by the
--     mess's strength; daily records (planned, served, wastage); meal scans for 1-4 Oct
--   * mess complaints, one meal (BH1 lunch, 24 Sep) significant; student grievances; checklist submissions
-- Safe to run again: the demo rows are removed first.
BEGIN;
SELECT set_config('app.actor', 'S-MK', true);

INSERT INTO ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email)
VALUES ('S-MK', 'Mr.', 'Mess', 'Storekeeper', 'Male', 'HOSTELS', 'Mess Storekeeper', '9000000019', 'Mess', 'messstore@kluniversity.in') ON CONFLICT (staff_id) DO NOTHING;
INSERT INTO portal.app_user (staff_id, full_name, email, title, home_dept) SELECT staff_id, full_name, official_email, designation, dept_code FROM ref.staff_master WHERE staff_id = 'S-MK' ON CONFLICT DO NOTHING;
INSERT INTO portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref) SELECT user_id, 'Mess_Storekeeper', 'HOSTELS', 'S-AD', 'HO/2026/ROLES/05' FROM portal.app_user WHERE staff_id = 'S-MK' ON CONFLICT DO NOTHING;
INSERT INTO portal.demo_login (username, password_hash, role_code, user_ref, display_name, description, group_name, sort_order)
VALUES ('S-MK', crypt('Demo@2026', gen_salt('bf', 8)), 'Mess_Storekeeper', 'S-MK', 'Mess Storekeeper', 'Mess store: goods received, issues to the kitchen, stock', 'Mess', 33)
ON CONFLICT (username) DO UPDATE SET role_code = excluded.role_code, display_name = excluded.display_name, description = excluded.description, active = true;

-- remove earlier demo rows
DELETE FROM hostel.mess_issue_line WHERE issue_id IN (SELECT issue_id FROM hostel.mess_issue WHERE remarks LIKE 'Demo%');
DELETE FROM hostel.mess_issue WHERE remarks LIKE 'Demo%';
DELETE FROM hostel.mess_store_receipt WHERE remarks LIKE 'Demo%';
DELETE FROM hostel.mess_daily_record WHERE deviation_reason LIKE 'Demo%' OR created_by = 'demo';
DELETE FROM hostel.meal_attendance WHERE created_by = 'demo';
DELETE FROM hostel.mess_grievance_summary WHERE created_by = 'demo';
DELETE FROM hostel.mess_feedback WHERE details LIKE 'Demo:%';
DELETE FROM hostel.student_grievance WHERE description LIKE 'Demo:%';
DELETE FROM hostel.checklist_response WHERE submission_id IN (SELECT submission_id FROM hostel.checklist_submission WHERE created_by = 'demo');
DELETE FROM hostel.checklist_submission WHERE created_by = 'demo';

-- how much of each provision a student takes per meal
CREATE TEMP TABLE _use (sku text, meal text, per_head numeric, days int[]) ON COMMIT DROP;   -- days: ISO weekdays it is used (null = every day)
INSERT INTO _use VALUES
  ('PRV-IDLI', 'Breakfast', 0, null),
  ('PRV-RICE-ID', 'Breakfast', 0.05, null), ('PRV-URAD', 'Breakfast', 0.02, null), ('PRV-RAVA', 'Breakfast', 0.04, '{2,5}'), ('PRV-POHA', 'Breakfast', 0.04, '{1,3,6}'),
  ('PRV-MILK', 'Breakfast', 0.15, null), ('PRV-TEA', 'Breakfast', 0.003, null), ('PRV-COFFEE', 'Breakfast', 0.002, null), ('PRV-SUGAR', 'Breakfast', 0.02, null),
  ('PRV-EGG', 'Breakfast', 0.0333, '{1,3,5}'), ('PRV-OIL-SF', 'Breakfast', 0.01, null),
  ('PRV-RICE-SN', 'Lunch', 0.15, null), ('PRV-TOOR', 'Lunch', 0.03, null), ('PRV-CURD', 'Lunch', 0.08, null), ('PRV-TAMARIND', 'Lunch', 0.004, null),
  ('PRV-VEG-MIX', 'Lunch', 0.08, null), ('PRV-ONION', 'Lunch', 0.03, null), ('PRV-TOMATO', 'Lunch', 0.03, null), ('PRV-OIL-SF', 'Lunch', 0.02, null),
  ('PRV-SALT', 'Lunch', 0.005, null), ('PRV-CHILLI', 'Lunch', 0.002, null), ('PRV-TURMERIC', 'Lunch', 0.001, null),
  ('PRV-ATTA', 'Dinner', 0.08, null), ('PRV-RICE-SN', 'Dinner', 0.10, null), ('PRV-MOONG', 'Dinner', 0.02, null), ('PRV-CHANA', 'Dinner', 0.01, null),
  ('PRV-POTATO', 'Dinner', 0.04, null), ('PRV-VEG-MIX', 'Dinner', 0.06, null), ('PRV-ONION', 'Dinner', 0.03, null), ('PRV-OIL-SF', 'Dinner', 0.02, null),
  ('PRV-CHICKEN', 'Dinner', 0.08, '{3,7}'), ('PRV-GHEE', 'Dinner', 0.002, null), ('PRV-SALT', 'Dinner', 0.005, null), ('PRV-CHILLI', 'Dinner', 0.002, null);
DELETE FROM _use WHERE per_head = 0;

DO $$
DECLARE m record; d date; ml text; iss bigint; rec bigint; strength int; r record; k int;
BEGIN
  PERFORM setseed(0.119);
  FOR m IN SELECT mm.mess_id, (SELECT count(*) FROM hostel.mess_subscription s WHERE s.mess_id = mm.mess_id AND s.status = 'Active')::int AS n FROM hostel.mess_master mm LOOP
    strength := greatest(m.n, 1);
    -- receipts: three deliveries per supplier group, enough for the period with a margin
    FOR k IN 1..3 LOOP
      FOR r IN SELECT g.supplier, g.skus FROM (VALUES
          ('Sri Lakshmi Traders, Vijayawada', ARRAY['PRV-RICE-SN','PRV-RICE-ID','PRV-ATTA','PRV-RAVA','PRV-POHA','PRV-TOOR','PRV-MOONG','PRV-URAD','PRV-CHANA','PRV-OIL-SF','PRV-GHEE','PRV-SUGAR','PRV-SALT','PRV-TEA','PRV-COFFEE','PRV-CHILLI','PRV-TURMERIC','PRV-TAMARIND']),
          ('Vijaya Dairy', ARRAY['PRV-MILK','PRV-CURD']),
          ('Fresh Farms Vegetables', ARRAY['PRV-ONION','PRV-TOMATO','PRV-POTATO','PRV-VEG-MIX']),
          ('Andhra Poultry', ARRAY['PRV-EGG','PRV-CHICKEN'])) g(supplier, skus) LOOP
        INSERT INTO hostel.mess_store_receipt (mess_id, received_on, supplier, bill_no, received_by, remarks, created_by)
        VALUES (m.mess_id, (ARRAY['2026-09-01','2026-09-15','2026-10-01']::date[])[k], r.supplier, 'DEMO-' || m.mess_id || '-' || k || '-' || left(md5(r.supplier), 4), 'S-MK', 'Demo delivery', 'demo')
        RETURNING receipt_id INTO rec;
        INSERT INTO hostel.mess_store_receipt_line (receipt_id, sku, qty, rate, expiry_date)
        SELECT rec, u.sku, round(sum(u.per_head * coalesce(array_length(u.days, 1), 7) / 7.0) * strength * 16 * (ARRAY[1.0, 0.95, 0.5])[k], 2),
               round(mt.standard_cost * (0.95 + random()::numeric * 0.1), 2),
               CASE WHEN mt.use_expiry THEN (ARRAY['2026-09-01','2026-09-15','2026-10-01']::date[])[k] + CASE WHEN u.sku IN ('PRV-MILK','PRV-CURD','PRV-CHICKEN') THEN 3 WHEN u.sku IN ('PRV-ONION','PRV-TOMATO','PRV-POTATO','PRV-VEG-MIX','PRV-EGG') THEN 10 ELSE 120 END END
        FROM _use u JOIN portal.material mt ON mt.sku = u.sku WHERE u.sku = ANY (r.skus) GROUP BY u.sku, mt.standard_cost, mt.use_expiry;
      END LOOP;
    END LOOP;
    -- daily issues per meal, daily records, and scans for the last days
    FOR d IN SELECT generate_series('2026-09-01'::date, '2026-10-04'::date, '1 day')::date LOOP
      FOREACH ml IN ARRAY ARRAY['Breakfast','Lunch','Dinner'] LOOP
        INSERT INTO hostel.mess_issue (mess_id, issue_date, meal, student_strength, issued_by, acknowledged_by, acknowledged_at, remarks, created_by)
        VALUES (m.mess_id, d, ml, strength, 'S-MK', CASE WHEN d < '2026-10-04' THEN 'S-MU' END, CASE WHEN d < '2026-10-04' THEN d + time '06:30' END, 'Demo issue', 'demo')
        RETURNING issue_id INTO iss;
        INSERT INTO hostel.mess_issue_line (issue_id, sku, qty, created_by)
        SELECT iss, u.sku, round(sum(u.per_head) * strength * (0.9 + random()::numeric * 0.15), 2), 'demo'
        FROM _use u WHERE u.meal = ml AND (u.days IS NULL OR extract(isodow FROM d)::int = ANY (u.days)) GROUP BY u.sku;
      END LOOP;
      INSERT INTO hostel.mess_daily_record (mess_id, record_date, meal, meals_planned, meals_served, prep_wastage_kg, plate_wastage_kg, menu_followed, deviation_reason, recorded_by, created_by)
      SELECT m.mess_id, d, x.meal, strength, round(strength * (x.att + random() * 0.08)), round((0.4 + random() * 1.2)::numeric * strength / 30, 1), round((0.8 + random() * 2.0)::numeric * strength / 30, 1),
             NOT (d = '2026-09-18' AND x.meal = 'Dinner') AND NOT (d = '2026-09-24' AND x.meal = 'Lunch'),
             CASE WHEN d = '2026-09-18' AND x.meal = 'Dinner' THEN 'Demo: paneer not delivered; served mixed-vegetable curry'
                  WHEN d = '2026-09-24' AND x.meal = 'Lunch' THEN 'Demo: gas supply cut for an hour; sambar replaced by dal fry' END,
             'S-MU', 'demo'
      FROM (VALUES ('Breakfast', 0.78), ('Lunch', 0.88), ('Evening_Snacks', 0.62), ('Dinner', 0.90)) x(meal, att);
    END LOOP;
  END LOOP;
END $$;

-- scans: 1-4 Oct lunch and dinner, and this morning's breakfast so far, for the students of each mess
INSERT INTO hostel.meal_attendance (student_id, meal_date, meal, mess_id, scanned_at, created_by)
SELECT s.student_id, d::date, x.meal, s.mess_id, d::date + x.t + (random() * interval '50 minutes'), 'demo'
FROM hostel.mess_subscription s CROSS JOIN generate_series('2026-10-01'::date, '2026-10-04'::date, '1 day') d
CROSS JOIN (VALUES ('Breakfast', time '07:30'), ('Lunch', time '12:30'), ('Dinner', time '19:30')) x(meal, t)
WHERE s.status = 'Active' AND random() < 0.85
ON CONFLICT DO NOTHING;
UPDATE hostel.mess_daily_record r SET meals_served = a.n
  FROM (SELECT mess_id, meal_date, meal, count(*) AS n FROM hostel.meal_attendance WHERE created_by = 'demo' GROUP BY 1, 2, 3) a
 WHERE r.mess_id = a.mess_id AND r.record_date = a.meal_date AND r.meal = a.meal AND r.created_by = 'demo';

-- mess complaints: a few through the month, six about BH1 lunch on 24 Sep (significant)
INSERT INTO hostel.mess_feedback (entry_type, student_id, mess_id, meal_date, slot, aspect, rating, details, status, action_taken, action_by, closed_at, created_by)
SELECT 'Grievance', s.student_id, s.mess_id, v.d::date, v.slot, v.aspect, v.rating, 'Demo: ' || v.txt, v.st,
       CASE WHEN v.st <> 'Open' THEN v.reply END, CASE WHEN v.st <> 'Open' THEN 'S-MS' END, CASE WHEN v.st = 'Closed' THEN v.d::date + 1 END, s.student_id
FROM (VALUES
  (1, '2026-09-24', 'Lunch', 'Quality', 1, 'Sambar was missing and the dal was watery', 'Closed', 'Gas supply was cut for an hour; we served dal fry. Backup cylinder now kept ready.'),
  (2, '2026-09-24', 'Lunch', 'Quality', 2, 'Dal had no salt and rice was undercooked', 'Closed', 'Gas supply was cut for an hour; we served dal fry. Backup cylinder now kept ready.'),
  (3, '2026-09-24', 'Lunch', 'Quantity', 2, 'Curd ran out by 1:15 pm', 'Replied', 'Curd is now ordered for the full strength.'),
  (4, '2026-09-24', 'Lunch', 'Quality', 1, 'Rice was half cooked', 'Replied', 'Gas supply was cut; cooking was rushed. Sorry.'),
  (5, '2026-09-24', 'Lunch', 'Both', 2, 'Less dal and it was cold', 'Open', null),
  (6, '2026-09-24', 'Lunch', 'Quality', 2, 'No sambar; poor taste overall', 'Open', null),
  (7, '2026-09-30', 'Dinner', 'Quality', 2, 'Chapatis were hard', 'Closed', 'Told the cooks to make them closer to serving time.'),
  (8, '2026-10-03', 'Breakfast', 'Quantity', 3, 'Idli ran out before 8:30', 'Open', null),
  (9, '2026-10-04', 'Lunch', 'Quality', 2, 'Found a hair in the curry', 'Open', null)) v(k, d, slot, aspect, rating, txt, st, reply)
JOIN (SELECT student_id, mess_id, row_number() OVER (ORDER BY student_id) AS k FROM hostel.mess_subscription WHERE status = 'Active' AND mess_id = 1) s ON s.k = v.k;
INSERT INTO hostel.mess_grievance_summary (mess_id, meal_date, slot, students_count, mess_strength, is_significant, main_aspect, raised_to_management_at, action_summary, status, created_by)
SELECT mess_id, meal_date, slot, students, strength, significant, main_aspect, '2026-09-24 16:00+05:30', 'Demo: backup gas cylinder now kept; menu substitutions announced on the notice board', 'Action_Taken', 'demo'
FROM hostel.v_mess_grievance_day WHERE mess_id = 1 AND meal_date = '2026-09-24' AND slot = 'Lunch' ON CONFLICT DO NOTHING;

-- student grievances (not repairs)
INSERT INTO hostel.student_grievance (student_id, category, description, is_confidential, status, assigned_to, action_taken, closed_at, created_by)
SELECT b.student_id, v.cat, 'Demo: ' || v.txt, v.conf, v.st, v.who, v.act, CASE WHEN v.st = 'Closed' THEN now() - interval '2 days' END, b.student_id
FROM (VALUES
  (1, 'Room_Mate', 'My room-mate plays music loudly after midnight every day', false, 'In_Review', 'S-FW', null),
  (2, 'Staff_Conduct', 'The night security guard spoke rudely when I came back at 9:40 pm', false, 'Open', null, null),
  (3, 'Ragging', 'Seniors on the third floor make first-years do their laundry', true, 'Escalated', 'S-CW', null),
  (4, 'Other', 'The reading room closes at 10 pm; exams start next week', false, 'Closed', 'S-CW', 'Reading room open till midnight during exam weeks.'),
  (5, 'Safety', 'The window latch in the corridor near room 204 is broken; anyone can climb in', true, 'Open', null, null)) v(k, cat, txt, conf, st, who, act)
JOIN (SELECT student_id, row_number() OVER (ORDER BY bed_label) AS k FROM hostel.v_bed WHERE facility_id = 'H-BH1' AND student_id IS NOT NULL) b ON b.k = v.k;

-- checklists: three days of the floor check (BH1) and of the mess kitchen hygiene check
INSERT INTO hostel.checklist_submission (template_id, facility_id, zone_id, period_date, submitted_by, submitted_at, overall_status, status, reviewed_by, reviewed_at, review_remarks, created_by)
SELECT t.template_id, 'H-BH1', z.zone_id, d::date, t.who, d::date + time '09:30',
       CASE WHEN d::date = '2026-10-03' THEN 'Minor_Corrections' ELSE 'Satisfactory' END,
       CASE WHEN d::date < '2026-10-04' THEN 'Reviewed' ELSE 'Submitted' END,
       CASE WHEN d::date < '2026-10-04' THEN t.rev END, CASE WHEN d::date < '2026-10-04' THEN d::date + time '17:00' END,
       CASE WHEN d::date < '2026-10-04' THEN 'Demo: seen' END, 'demo'
FROM (SELECT template_id, 'S-FW' AS who, 'S-CW' AS rev, 'BH1-F1' AS zone FROM hostel.checklist_template WHERE template_name = 'Daily floor check'
      UNION ALL SELECT template_id, 'S-MU', 'S-MS', null FROM hostel.checklist_template WHERE template_name = 'Mess kitchen hygiene') t
LEFT JOIN infra.zone z ON z.zone_id = t.zone
CROSS JOIN generate_series('2026-10-02'::date, '2026-10-04'::date, '1 day') d
ON CONFLICT DO NOTHING;
INSERT INTO hostel.checklist_response (submission_id, item_no, answer, remarks, created_by)
SELECT s.submission_id, i.item_no,
       CASE WHEN s.period_date = '2026-10-03' AND i.item_no IN (5, 7) THEN CASE t.answer_type WHEN 'Yes_No' THEN 'No' ELSE 'Not_OK' END
            ELSE CASE t.answer_type WHEN 'Yes_No' THEN 'Yes' ELSE 'OK' END END,
       CASE WHEN s.period_date = '2026-10-03' AND i.item_no IN (5, 7) THEN 'Demo: noted on the round' END, 'demo'
FROM hostel.checklist_submission s JOIN hostel.checklist_template t USING (template_id) JOIN hostel.checklist_item i ON i.template_id = s.template_id
WHERE s.created_by = 'demo';

COMMIT;
