-- Smoke test for Workflows A–F. Runs inside one transaction and rolls back; every RAISE NOTICE 'PASS' is a checked rule.
-- Usage: psql -v ON_ERROR_STOP=1 -d klu_hostel -f db/tests/smoke_a_to_f.sql
BEGIN;
SET LOCAL app.actor = 'test';

-- ---------- fixtures: campus, hostel, floor, 2 rooms x 2 beds, staff, students ----------
INSERT INTO ref.department (dept_code, dept_name) VALUES ('CSE','Computer Science & Engg.') ON CONFLICT DO NOTHING;
INSERT INTO infra.campus (campus_id, campus_name) VALUES ('KLVZA','KL Vaddeswaram');
INSERT INTO ref.staff_master (staff_id, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type) VALUES
  ('S-CW','Chief','Warden','Male','HOSTELS','Chief Warden','9000000001','Warden'),
  ('S-FW','Floor','Warden','Male','HOSTELS','Floor Warden','9000000002','Warden'),
  ('S-OF','Office','Staff','Female','HOSTELS','Office Assistant','9000000003','Admin'),
  ('S-AC','Accounts','Clerk','Male','FIN','Accountant','9000000004','Admin'),
  ('S-DN','Dean','Students','Male','ADMIN','Dean Students Affairs','9000000005','Admin');
-- the Dean has no hostel login; the role grant is how the system knows whom to send the outing link to (D3)
INSERT INTO portal.app_user (staff_id, full_name, title, home_dept) VALUES ('S-DN', 'Dean Students', 'Dean Students Affairs', 'ADMIN');
INSERT INTO portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref) SELECT user_id, 'Dean_Students_Affairs', 'HOSTELS', 'S-AD', 'SMOKE' FROM portal.app_user WHERE staff_id = 'S-DN';
INSERT INTO infra.facility (facility_id, campus_id, facility_name, facility_type, no_of_floors) VALUES ('H-BH1','KLVZA','Boys Hostel 1','Hostel',3);
INSERT INTO hostel.hostel_profile (facility_id, hostel_code, hostel_gender, dept_code, gate_close_time) VALUES ('H-BH1','BH1','Boys','HOSTELS','21:30');
INSERT INTO infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no) VALUES ('BH1-F1','H-BH1','Floor 1','Floor',1);
INSERT INTO infra.space (space_id, zone_id, space_code, space_name, space_category, capacity) VALUES
  ('BH1-101','BH1-F1','101','Room 101','Hostel_Room',2), ('BH1-102','BH1-F1','102','Room 102','Hostel_Room',2), ('BH1-GATE','BH1-F1','GATE','Hostel gate','Gate',0);
INSERT INTO hostel.room_profile (space_id, room_type_id) SELECT s, room_type_id FROM unnest(ARRAY['BH1-101','BH1-102']) s, hostel.room_type WHERE type_name = '2-sharing AC';
INSERT INTO infra.subspace (subspace_id, space_id, subspace_code, subspace_type) VALUES
  ('BH1-101-B1','BH1-101','Bed-1','Bed'), ('BH1-101-B2','BH1-101','Bed-2','Bed'), ('BH1-102-B1','BH1-102','Bed-1','Bed'), ('BH1-102-B2','BH1-102','Bed-2','Bed');
INSERT INTO infra.asset_master (asset_id, space_id, asset_name, asset_category) VALUES ('AST-COT-1','BH1-101','Cot','Furniture'), ('AST-FAN-1','BH1-101','Fan','Electrical');
INSERT INTO hostel.room_type_fee (room_type_id, facility_id, academic_year, registration_fee, hostel_fee, instalment_1_pct, instalment_2_due_date)
  SELECT room_type_id, 'H-BH1', '2026-27', 5000, 120000, 60, '2026-12-15' FROM hostel.room_type WHERE type_name = '2-sharing AC';
INSERT INTO hostel.electricity_tariff (room_type_id, included_units_per_month, rate_per_unit, effective_from)
  SELECT room_type_id, 60, 8.50, '2026-07-01' FROM hostel.room_type WHERE type_name = '2-sharing AC';
INSERT INTO hostel.room_meter (space_id, meter_no, meter_type, device_ref, installed_on) VALUES ('BH1-101','MTR-101','Smart_Prepaid','DEV-101','2026-06-01');
INSERT INTO hostel.staff_space_assignment (staff_id, hostel_role, facility_id, zone_id, show_on_qr) VALUES
  ('S-CW','Chief_Warden','H-BH1',NULL,true), ('S-FW','Floor_Warden','H-BH1','BH1-F1',true), ('S-OF','Office_Staff','H-BH1',NULL,false);
INSERT INTO hostel.space_qr (space_id) VALUES ('BH1-101');
INSERT INTO hostel.capture_point (point_name, point_type, facility_id, zone_id, device_type) VALUES
  ('Main campus gate','Campus_Gate','H-BH1',NULL,'QR_Scanner'), ('BH1 gate','Hostel_Gate','H-BH1',NULL,'Card_Reader'), ('BH1 floor 1 corridor','Room_Corridor','H-BH1','BH1-F1','Camera');
INSERT INTO ref.student_master (student_id, full_name, student_type, programme, gender, date_of_birth, personal_email, dept_code) VALUES
  ('2600040010','RAVI KUMAR','UG','Btech CSE','Male','2008-03-04','ravi@example.com','CSE'),
  ('2600040011','PRIYA DEVI','UG','Btech CSE','Female','2008-05-06','priya@example.com','CSE');
INSERT INTO hostel.student_contact (student_id, relation, contact_name, mobile_no, is_verified, verified_on, is_outpass_approver) VALUES
  ('2600040010','Father','K RAO','9440000001',true,now(),true), ('2600040010','Self','RAVI KUMAR','9440000002',true,now(),false);

-- ---------- A: gender rule ----------
DO $$ BEGIN
  INSERT INTO hostel.hostel_registration (student_id, academic_year, facility_id, room_type_id, rules_accepted)
    SELECT '2600040011','2026-27','H-BH1', room_type_id, true FROM hostel.room_type WHERE type_name='2-sharing AC';
  RAISE EXCEPTION 'FAIL: female student registered for boys hostel';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS A: gender must match hostel gender (%)', SQLERRM; END $$;

-- ---------- A: apply -> registration fee demand is auto-raised ----------
INSERT INTO hostel.hostel_registration (student_id, academic_year, facility_id, room_type_id, rules_accepted, created_by)
  SELECT '2600040010','2026-27','H-BH1', room_type_id, true, 'S-OF' FROM hostel.room_type WHERE type_name='2-sharing AC';
DO $$ DECLARE r record; BEGIN
  SELECT r1.registration_no, d.amount_due, d.fee_head INTO r FROM hostel.hostel_registration r1 JOIN hostel.fee_demand d ON d.demand_id = r1.reg_demand_id WHERE r1.student_id='2600040010';
  IF r.registration_no LIKE 'HR-2026-%' AND r.amount_due = 5000 AND r.fee_head = 'Registration' THEN RAISE NOTICE 'PASS A: registration % raised registration fee demand of %', r.registration_no, r.amount_due;
  ELSE RAISE EXCEPTION 'FAIL: registration demand %', r; END IF; END $$;

-- ---------- A: offer before fee paid is refused ----------
DO $$ BEGIN
  INSERT INTO hostel.room_offer (registration_id, subspace_id) SELECT registration_id, 'BH1-101-B1' FROM hostel.hostel_registration WHERE student_id='2600040010';
  RAISE EXCEPTION 'FAIL: offer created before registration fee paid';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS A: no offer until registration fee is paid'; END $$;

-- ---------- A: pay registration fee (UPI) -> demand Paid, registration Fee_Paid ----------
INSERT INTO hostel.fee_receipt (demand_id, amount, payment_mode, gateway_ref, gateway_status)
  SELECT reg_demand_id, 5000, 'UPI', 'rzp_test_001', 'Success' FROM hostel.hostel_registration WHERE student_id='2600040010';
DO $$ DECLARE s hostel.registration_status; d hostel.demand_status; p numeric; refundable boolean; BEGIN
  SELECT r.status, fd.status, fd.amount_paid, fr.is_refundable INTO s, d, p, refundable FROM hostel.hostel_registration r JOIN hostel.fee_demand fd ON fd.demand_id = r.reg_demand_id JOIN hostel.fee_receipt fr ON fr.demand_id = fd.demand_id WHERE r.student_id='2600040010';
  IF s='Fee_Paid' AND d='Paid' AND p=5000 AND NOT refundable THEN RAISE NOTICE 'PASS A: receipt paid demand (amount_paid derived), registration Fee_Paid, registration fee non-refundable';
  ELSE RAISE EXCEPTION 'FAIL: after payment status=% demand=% paid=% refundable=%', s, d, p, refundable; END IF; END $$;

-- ---------- A: offer bed -> bed Held, registration Allotted, hold_until set ----------
INSERT INTO hostel.room_offer (registration_id, subspace_id, created_by) SELECT registration_id, 'BH1-101-B1', 'S-OF' FROM hostel.hostel_registration WHERE student_id='2600040010';
DO $$ DECLARE b infra.subspace_status; s hostel.registration_status; h timestamptz; n int; BEGIN
  SELECT status INTO b FROM infra.subspace WHERE subspace_id='BH1-101-B1';
  SELECT r.status, o.hold_until, o.offer_no INTO s, h, n FROM hostel.room_offer o JOIN hostel.hostel_registration r USING (registration_id) WHERE r.student_id='2600040010';
  IF b='Held' AND s='Allotted' AND h > now() + interval '47 hours' AND n=1 THEN RAISE NOTICE 'PASS A: offer holds the bed (Held), registration Allotted, hold_until = +48h, offer_no 1';
  ELSE RAISE EXCEPTION 'FAIL: bed=% reg=% hold=% n=%', b, s, h, n; END IF; END $$;
-- second pending offer for the same bed / registration is refused by the partial unique index
DO $$ BEGIN
  INSERT INTO hostel.room_offer (registration_id, subspace_id) SELECT registration_id, 'BH1-101-B2' FROM hostel.hostel_registration WHERE student_id='2600040010';
  RAISE EXCEPTION 'FAIL: two pending offers for one registration';
EXCEPTION WHEN unique_violation OR check_violation THEN RAISE NOTICE 'PASS A: a registration has only one Pending offer'; END $$;

-- ---------- A: fee plan before acceptance refused; accept; plan with two instalments -> two Hostel demands ----------
DO $$ BEGIN
  INSERT INTO hostel.fee_plan (registration_id, plan_type, fee_id) SELECT r.registration_id, 'Two_Instalments', f.fee_id FROM hostel.hostel_registration r JOIN hostel.room_type_fee f ON f.facility_id=r.facility_id AND f.room_type_id=r.room_type_id AND f.academic_year=r.academic_year WHERE r.student_id='2600040010';
  RAISE EXCEPTION 'FAIL: fee plan before the offer is accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS A: fee plan only after the offer is Accepted'; END $$;
UPDATE hostel.room_offer SET student_decision='Accepted' WHERE registration_id = (SELECT registration_id FROM hostel.hostel_registration WHERE student_id='2600040010');
INSERT INTO hostel.fee_plan (registration_id, plan_type, fee_id, created_by)
  SELECT r.registration_id, 'Two_Instalments', f.fee_id, 'S-AC' FROM hostel.hostel_registration r JOIN hostel.room_type_fee f ON f.facility_id=r.facility_id AND f.room_type_id=r.room_type_id AND f.academic_year=r.academic_year WHERE r.student_id='2600040010';
DO $$ DECLARE n int; a1 numeric; a2 numeric; BEGIN
  SELECT count(*), min(amount_due) FILTER (WHERE instalment_no=1), min(amount_due) FILTER (WHERE instalment_no=2) INTO n, a1, a2 FROM hostel.fee_demand WHERE student_id='2600040010' AND fee_head='Hostel';
  IF n=2 AND a1=72000 AND a2=48000 THEN RAISE NOTICE 'PASS A: Two_Instalments created exactly two hostel demands (% + %)', a1, a2;
  ELSE RAISE EXCEPTION 'FAIL: hostel demands n=% a1=% a2=%', n, a1, a2; END IF; END $$;

-- ---------- A: check-in -> allocation, bed Occupied, student hosteller, Checked_In, meter map opened (C) ----------
-- 094: check-in is refused until a Warden has verified the fees
DO $$ BEGIN
  BEGIN
    INSERT INTO hostel.hostel_allocation (student_id, subspace_id, offer_id, academic_year, key_no, checked_in_by, created_by)
      SELECT '2600040010', o.subspace_id, o.offer_id, '2026-27', 'K-X', 'S-OF', 'S-OF' FROM hostel.room_offer o JOIN hostel.hostel_registration r USING (registration_id) WHERE r.student_id='2600040010';
    RAISE EXCEPTION 'FAIL: check-in allowed before the fee check';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS A: check-in refused before the Warden fee check';
  END; END $$;
UPDATE hostel.hostel_registration SET fee_check_status = 'Verified', fee_checked_by = 'S-CW', fee_checked_on = now(), cw_status = 'Approved', cw_by = 'S-CW', cw_on = now() WHERE student_id = '2600040010';
INSERT INTO hostel.hostel_allocation (student_id, subspace_id, offer_id, academic_year, key_no, checked_in_by, approved_by, created_by)
  SELECT '2600040010', o.subspace_id, o.offer_id, '2026-27', 'K-101-1', 'S-OF', 'S-CW', 'S-OF' FROM hostel.room_offer o JOIN hostel.hostel_registration r USING (registration_id) WHERE r.student_id='2600040010';
DO $$ DECLARE b infra.subspace_status; s hostel.registration_status; h boolean; m int; cs hostel.current_status; BEGIN
  SELECT status INTO b FROM infra.subspace WHERE subspace_id='BH1-101-B1';
  SELECT status INTO s FROM hostel.hostel_registration WHERE student_id='2600040010';
  SELECT is_hosteller INTO h FROM ref.student_master WHERE student_id='2600040010';
  SELECT count(*) INTO m FROM hostel.meter_student_map mm JOIN hostel.hostel_allocation a USING (hostel_alloc_id) WHERE a.student_id='2600040010' AND mm.to_datetime IS NULL;
  SELECT current_status INTO cs FROM hostel.student_current_status WHERE student_id='2600040010';
  IF b='Occupied' AND s='Checked_In' AND h AND m=1 AND cs='In_Hostel' THEN RAISE NOTICE 'PASS A/C: check-in occupied the bed, registration Checked_In, student is hosteller, meter map opened, status In_Hostel';
  ELSE RAISE EXCEPTION 'FAIL: bed=% reg=% hosteller=% maps=% status=%', b, s, h, m, cs; END IF; END $$;
-- handover at check-in records the opening meter reading
INSERT INTO hostel.room_handover (hostel_alloc_id, handover_type, meter_reading, done_by, occupant_acknowledged, created_by)
  SELECT hostel_alloc_id, 'Check_In', 1000, 'S-FW', true, 'S-FW' FROM hostel.hostel_allocation WHERE student_id='2600040010';
INSERT INTO hostel.room_handover_line (handover_id, line_no, asset_id, condition) SELECT handover_id, 1, 'AST-COT-1', 'Good' FROM hostel.room_handover;
INSERT INTO hostel.room_handover_line (handover_id, line_no, asset_id, condition) SELECT handover_id, 2, 'AST-FAN-1', 'Good' FROM hostel.room_handover;
DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM hostel.meter_reading WHERE source='Handover' AND reading_kwh=1000; IF n=1 THEN RAISE NOTICE 'PASS A/C: check-in handover wrote the opening meter reading'; ELSE RAISE EXCEPTION 'FAIL handover reading'; END IF; END $$;

-- ---------- C: a reading lower than the previous is refused; meter map cannot be edited by hand; recharge derives units ----------
DO $$ BEGIN
  INSERT INTO hostel.meter_reading (meter_id, reading_at, reading_kwh, source) SELECT meter_id, now() + interval '1 hour', 999, 'Auto' FROM hostel.room_meter WHERE meter_no='MTR-101';
  RAISE EXCEPTION 'FAIL: lower reading accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS C: a reading cannot be lower than the previous reading'; END $$;
INSERT INTO hostel.meter_reading (meter_id, reading_at, reading_kwh, source) SELECT meter_id, now() + interval '1 hour', 1042.5, 'Auto' FROM hostel.room_meter WHERE meter_no='MTR-101';
DO $$ BEGIN
  INSERT INTO hostel.meter_student_map (meter_id, hostel_alloc_id) SELECT meter_id, 999 FROM hostel.room_meter LIMIT 1;
  RAISE EXCEPTION 'FAIL: meter map edited by hand';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS C: Meter_Student_Map is opened and closed by check-in/out only'; END $$;
INSERT INTO hostel.fee_demand (student_id, fee_head, amount_due, due_date, reference_type) VALUES ('2600040010','Electricity', 425, current_date, 'meter_recharge');
INSERT INTO hostel.fee_receipt (demand_id, amount, payment_mode, gateway_ref, gateway_status) SELECT demand_id, 425, 'UPI', 'rzp_test_002', 'Success' FROM hostel.fee_demand WHERE fee_head='Electricity' AND student_id='2600040010';
INSERT INTO hostel.meter_recharge (meter_id, student_id, receipt_id, units_credited) SELECT m.meter_id, '2600040010', r.receipt_id, 0 FROM hostel.room_meter m, hostel.fee_receipt r WHERE m.meter_no='MTR-101' AND r.gateway_ref='rzp_test_002';
DO $$ DECLARE u numeric; BEGIN SELECT units_credited INTO u FROM hostel.meter_recharge; IF u = 50 THEN RAISE NOTICE 'PASS C: Units_Credited derived = 425 / 8.50 = %', u; ELSE RAISE EXCEPTION 'FAIL units %', u; END IF; END $$;

-- ---------- D: no movement without consent; then consent; Out at campus gate without pass -> alert ----------
DO $$ BEGIN
  INSERT INTO hostel.movement_event (student_id, point_id, direction, source) SELECT '2600040010', point_id, 'In', 'Scan' FROM hostel.capture_point WHERE point_type='Hostel_Gate';
  RAISE EXCEPTION 'FAIL: movement stored without consent';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS D: no Movement_Event without a current Tracking_Consent'; END $$;
INSERT INTO hostel.tracking_consent (student_id, given_by, contact_id, policy_version, recorded_by)
  SELECT '2600040010', 'Parent', contact_id, 'v2.1-2026', 'S-OF' FROM hostel.student_contact WHERE student_id='2600040010' AND relation='Father';
INSERT INTO hostel.movement_event (student_id, point_id, direction, source) SELECT '2600040010', point_id, 'Out', 'Scan' FROM hostel.capture_point WHERE point_type='Campus_Gate';
DO $$ DECLARE a int; cs hostel.current_status; who varchar; BEGIN
  SELECT count(*), max(assigned_to) INTO a, who FROM hostel.hostel_alert WHERE alert_type='No_Pass_Exit' AND student_id='2600040010';
  SELECT current_status INTO cs FROM hostel.student_current_status WHERE student_id='2600040010';
  IF a=1 AND cs='Outside_No_Pass' AND who='S-FW' THEN RAISE NOTICE 'PASS D: exit without pass raised No_Pass_Exit to the Floor Warden (found via Staff_Space_Assignment); status Outside_No_Pass';
  ELSE RAISE EXCEPTION 'FAIL: alerts=% status=% assigned=%', a, cs, who; END IF; END $$;
DO $$ BEGIN
  UPDATE hostel.movement_event SET direction='In';
  RAISE EXCEPTION 'FAIL: movement event changed';
EXCEPTION WHEN integrity_constraint_violation THEN RAISE NOTICE 'PASS D: Movement_Event rows cannot be changed'; END $$;
INSERT INTO hostel.movement_event (student_id, point_id, direction, source) SELECT '2600040010', point_id, 'In', 'Scan' FROM hostel.capture_point WHERE point_type='Campus_Gate';

-- ---------- E: outpass (122): Floor Warden, then Chief Warden; no parent or Dean step, also for a day or more ----------
INSERT INTO hostel.outpass (student_id, reason, destination, leave_from, return_by, contact_during_leave, created_by)
  VALUES ('2600040010','Family function','Guntur', '2026-10-10 08:00+05:30', '2026-10-12 20:00+05:30', '9440000001', '2600040010');
DO $$ DECLARE o hostel.outpass%ROWTYPE; r text; BEGIN
  SELECT * INTO o FROM hostel.outpass;
  SELECT string_agg(approver_role::text, ',' ORDER BY level) INTO r FROM shared.approval_step WHERE request_type='Outpass' AND request_id=o.outpass_id;
  IF o.outing_category='Day_Or_More' AND r='Floor_Warden,Chief_Warden' AND o.levels_required=2 AND o.outpass_no LIKE 'OP-%' AND o.qr_token IS NULL THEN RAISE NOTICE 'PASS E: Day_Or_More -> Floor Warden, Chief Warden only; no QR yet';
  ELSE RAISE EXCEPTION 'FAIL: cat=% levels=% steps=% no=%', o.outing_category, o.levels_required, r, o.outpass_no; END IF; END $$;
DO $$ BEGIN
  UPDATE shared.approval_step SET decision='Approved', acted_by='S-CW' WHERE request_type='Outpass' AND level=2;
  RAISE EXCEPTION 'FAIL: level 2 taken before level 1';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS E: levels are taken in order'; END $$;
DO $$ BEGIN
  UPDATE shared.approval_step SET decision='Approved', acted_by='S-DN' WHERE request_type='Outpass' AND level=1;
  RAISE EXCEPTION 'FAIL: someone other than the Floor Warden took level 1';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS E: level 1 must be a Floor Warden of the student''s hostel'; END $$;
UPDATE shared.approval_step SET decision='Approved', acted_by='S-FW' WHERE request_type='Outpass' AND level=1;
DO $$ BEGIN
  UPDATE shared.approval_step SET decision='Approved', acted_by='S-FW' WHERE request_type='Outpass' AND level=2;
  RAISE EXCEPTION 'FAIL: floor warden acted as chief warden';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS E: level 2 must be the Chief Warden of the student''s hostel'; END $$;
UPDATE shared.approval_step SET decision='Approved', acted_by='S-CW' WHERE request_type='Outpass' AND level=2;
DO $$ DECLARE o hostel.outpass%ROWTYPE; n int; BEGIN SELECT * INTO o FROM hostel.outpass;
  SELECT count(*) INTO n FROM shared.notification WHERE template_code='OUTPASS_ISSUED' AND related_id=o.outpass_id::text;
  IF o.status='Approved' AND o.qr_token IS NOT NULL AND n>=2 THEN RAISE NOTICE 'PASS E: approved by the Chief Warden (a day or more too), QR token issued, parent and student told'; ELSE RAISE EXCEPTION 'FAIL: status=% qr=% notif=%', o.status, o.qr_token, n; END IF; END $$;
-- gate out and late return
INSERT INTO hostel.movement_event (student_id, point_id, direction, source, event_at) SELECT '2600040010', point_id, 'Out', 'Scan', '2026-10-10 08:10+05:30' FROM hostel.capture_point WHERE point_type='Campus_Gate';
INSERT INTO hostel.movement_event (student_id, point_id, direction, source, event_at) SELECT '2600040010', point_id, 'In',  'Scan', '2026-10-12 20:45+05:30' FROM hostel.capture_point WHERE point_type='Campus_Gate';
DO $$ DECLARE o hostel.outpass%ROWTYPE; a int; BEGIN SELECT * INTO o FROM hostel.outpass; SELECT count(*) INTO a FROM hostel.hostel_alert WHERE alert_type='Pass_Overdue';
  IF o.status='Returned' AND o.late_by_minutes=45 AND o.actual_out_at IS NOT NULL AND a=1 THEN RAISE NOTICE 'PASS E/D: gate events wrote the pass: Returned, Late_By_Minutes = %, Pass_Overdue alert raised', o.late_by_minutes;
  ELSE RAISE EXCEPTION 'FAIL: status=% late=% alerts=%', o.status, o.late_by_minutes, a; END IF; END $$;
-- a refusal ends the request and closes the later levels
INSERT INTO hostel.outpass (student_id, reason, destination, leave_from, return_by, contact_during_leave, created_by)
  VALUES ('2600040010','Shopping','Vijayawada', '2026-10-09 10:00+05:30', '2026-10-09 18:00+05:30', '9440000001', '2600040010');
UPDATE shared.approval_step s SET decision='Rejected', acted_by='S-FW', remarks='Not this week'
 WHERE s.request_type='Outpass' AND s.level=1 AND s.request_id=(SELECT max(outpass_id) FROM hostel.outpass);
DO $$ DECLARE st text; sk text; BEGIN
  SELECT status INTO st FROM hostel.outpass WHERE outpass_id=(SELECT max(outpass_id) FROM hostel.outpass);
  SELECT string_agg(decision::text, ',' ORDER BY level) INTO sk FROM shared.approval_step WHERE request_type='Outpass' AND request_id=(SELECT max(outpass_id) FROM hostel.outpass);
  IF st='Rejected' AND sk LIKE 'Rejected,%' AND sk NOT LIKE '%Pending%' THEN RAISE NOTICE 'PASS E: a refusal ends the request; the later levels are skipped'; ELSE RAISE EXCEPTION 'FAIL: status=% steps=%', st, sk; END IF; END $$;
-- punishment bars a new outpass
INSERT INTO hostel.discipline_case (student_id, incident_on, description) VALUES ('2600040010', now(), 'Late return');
INSERT INTO hostel.discipline_punishment (case_id, student_id, punishment_type, bars_outings, from_date, to_date) SELECT case_id, '2600040010', 'Outing_Ban', true, '2026-10-13', '2026-11-13' FROM hostel.discipline_case;
DO $$ BEGIN
  INSERT INTO hostel.outpass (student_id, reason, destination, leave_from, return_by, contact_during_leave) VALUES ('2600040010','x','y','2026-10-20 08:00+05:30','2026-10-20 18:00+05:30','9440000001');
  RAISE EXCEPTION 'FAIL: outpass while banned';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS E: a student with a punishment that bars outings cannot apply'; END $$;

-- ---------- F: sick leave (121): Floor Warden visits, sets the diet and approves; then the building in-charge ----------
INSERT INTO hostel.sick_leave (student_id, illness_details, from_date, to_date) VALUES ('2600040010','Fever','2026-10-14','2026-10-15');
DO $$ DECLARE n int; r text; BEGIN SELECT count(*), string_agg(approver_role, '>' ORDER BY level) INTO n, r FROM shared.approval_step WHERE request_type='Sick_Leave';
  IF n=2 AND r LIKE 'Floor_Warden>%' THEN RAISE NOTICE 'PASS F: two levels (%)', r; ELSE RAISE EXCEPTION 'FAIL: % sick-leave steps (%)', n, r; END IF; END $$;
DO $$ BEGIN
  UPDATE shared.approval_step SET decision='Approved', acted_by='S-FW' WHERE request_type='Sick_Leave' AND level=1;
  RAISE EXCEPTION 'FAIL: approved without visit';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS F: Sick_Leave cannot be recommended without Visited_By, Visited_At and Visit_Remarks'; END $$;
UPDATE hostel.sick_leave SET visited_by='S-FW', visited_at=now(), visit_remarks='Student has fever, needs rest', diet='Liquid', diet_note='No spice';
DO $$ BEGIN
  UPDATE shared.approval_step SET decision='Approved', acted_by='S-CW' WHERE request_type='Sick_Leave' AND level=2;
  RAISE EXCEPTION 'FAIL: building in-charge approved before the Floor Warden';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS F: the building in-charge approves only after the Floor Warden'; END $$;
UPDATE shared.approval_step SET decision='Approved', acted_by='S-FW' WHERE request_type='Sick_Leave' AND level=1;
DO $$ DECLARE st text; BEGIN SELECT status INTO st FROM hostel.sick_leave;
  IF st='Recommended' THEN RAISE NOTICE 'PASS F: Floor Warden approval recommends; no room meals yet'; ELSE RAISE EXCEPTION 'FAIL: status % after the Floor Warden', st; END IF; END $$;
UPDATE shared.approval_step s SET decision='Approved',
  acted_by = CASE s.approver_role WHEN 'Chief_Warden' THEN 'S-CW'
             ELSE (SELECT a.staff_id FROM hostel.staff_space_assignment a WHERE a.hostel_role IN ('Warden','Hostel_Incharge') AND a.status='Active' AND a.facility_id='H-BH1' LIMIT 1) END
 WHERE s.request_type='Sick_Leave' AND s.level=2;
DO $$ DECLARE s hostel.sick_leave%ROWTYPE; n int; liq int; cs hostel.current_status; BEGIN SELECT * INTO s FROM hostel.sick_leave; SELECT count(*), count(*) FILTER (WHERE diet='Liquid') INTO n, liq FROM hostel.sick_meal_delivery; SELECT current_status INTO cs FROM hostel.student_current_status WHERE student_id='2600040010';
  IF s.status='Approved' AND s.room_meals_required AND n=8 AND liq=8 AND cs='On_Sick_Leave' THEN RAISE NOTICE 'PASS F: approved by the building in-charge, 2 days x 4 slots = % liquid-diet room meals, status On_Sick_Leave', n;
  ELSE RAISE EXCEPTION 'FAIL: status=% meals=% rows=% liquid=% cs=%', s.status, s.room_meals_required, n, liq, cs; END IF; END $$;
DO $$ BEGIN
  INSERT INTO hostel.sick_leave (student_id, illness_details, from_date, to_date) VALUES ('2600040010','Same fever again','2026-10-15','2026-10-16');
  RAISE EXCEPTION 'FAIL: overlapping sick leave accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS F: a second sick leave may not overlap an open one'; END $$;
UPDATE hostel.sick_leave SET diet='Light';
DO $$ DECLARE l int; BEGIN SELECT count(*) INTO l FROM hostel.sick_meal_delivery WHERE diet='Light' AND status='Pending';
  IF l=8 THEN RAISE NOTICE 'PASS F: a new diet reaches every meal not yet served'; ELSE RAISE EXCEPTION 'FAIL: % light meals', l; END IF; END $$;

-- ---------- B: QR page and floors-without-warden report ----------
DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM hostel.v_space_qr_page WHERE space_id='BH1-101'; IF n=2 THEN RAISE NOTICE 'PASS B: QR page for room 101 shows 2 responsible people (Chief Warden, Floor Warden)'; ELSE RAISE EXCEPTION 'FAIL qr page rows %', n; END IF; END $$;
UPDATE hostel.staff_space_assignment SET status='Ended', to_date=current_date WHERE hostel_role='Floor_Warden';
DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM hostel.v_floors_without_warden; IF n=1 THEN RAISE NOTICE 'PASS B: floor with occupied beds and no Floor Warden is reported'; ELSE RAISE EXCEPTION 'FAIL floors %', n; END IF; END $$;

-- ---------- audit chain ----------
DO $$ DECLARE n int; bad int; BEGIN
  SELECT count(*) INTO n FROM shared.audit_log;
  SELECT count(*) INTO bad FROM (SELECT hash, lead(prev_hash) OVER (ORDER BY audit_id) AS next_prev FROM shared.audit_log) x WHERE next_prev IS NOT NULL AND next_prev <> hash;
  IF n > 20 AND bad = 0 THEN RAISE NOTICE 'PASS audit: % hash-chained audit rows, chain intact', n; ELSE RAISE EXCEPTION 'FAIL audit n=% broken=%', n, bad; END IF; END $$;

ROLLBACK;
