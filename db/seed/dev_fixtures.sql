-- Development fixtures: one boys' hostel with a floor, three rooms, six beds, a meter, staff with duties,
-- two students with verified contacts. Safe to run once on a fresh klu_hostel (after 090_seed.sql).
-- psql -v ON_ERROR_STOP=1 -d klu_hostel -f db/seed/dev_fixtures.sql
BEGIN;
INSERT INTO ref.department (dept_code, dept_name) VALUES ('CSE','Computer Science & Engg.'), ('ECE','Electronics & Communication') ON CONFLICT DO NOTHING;
INSERT INTO infra.campus (campus_id, campus_name, address) VALUES ('KLVZA','KL Vaddeswaram','Green Fields, Vaddeswaram, Guntur') ON CONFLICT DO NOTHING;

INSERT INTO ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email) VALUES
  ('S-CW','Dr.','Chief','Warden','Male','HOSTELS','Chief Warden – Boys','9000000001','Warden','chiefwarden@kluniversity.in'),
  ('S-FW','Mr.','Floor','Warden','Male','HOSTELS','Floor Warden','9000000002','Warden','floorwarden1@kluniversity.in'),
  ('S-OF','Ms.','Office','Staff','Female','HOSTELS','Office Assistant','9000000003','Admin','hosteloffice@kluniversity.in'),
  ('S-AC','Mr.','Accounts','Clerk','Male','FIN','Accountant','9000000004','Admin','hostelaccounts@kluniversity.in'),
  ('S-DN','Dr.','Dean','Students','Male','ADMIN','Dean – Students Affairs','9000000005','Admin','dean.sa@kluniversity.in'),
  ('S-SG','Mr.','Gate','Guard','Male','HOSTELS','Security Guard','9000000006','Security',NULL),
  ('S-MS','Mr.','Mess','Incharge','Male','HOSTELS','Mess In-charge','9000000007','Mess',NULL),
  ('S-MT','Mr.','Maint','Supervisor','Male','HOSTELS','Maintenance Supervisor','9000000008','Maintenance',NULL)
ON CONFLICT DO NOTHING;

INSERT INTO infra.facility (facility_id, campus_id, facility_name, facility_type, no_of_floors, incharge_id) VALUES ('H-BH1','KLVZA','Boys Hostel 1','Hostel',3,'S-CW') ON CONFLICT DO NOTHING;
INSERT INTO hostel.mess_master (mess_name, facility_id, incharge_id, capacity, annual_fee) VALUES ('BH1 Mess','H-BH1','S-MS',600,48000);
INSERT INTO hostel.hostel_profile (facility_id, hostel_code, hostel_gender, default_mess_id, dept_code, gate_close_time)
  VALUES ('H-BH1','BH1','Boys',(SELECT mess_id FROM hostel.mess_master WHERE mess_name='BH1 Mess'),'HOSTELS','21:30') ON CONFLICT DO NOTHING;
INSERT INTO infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no) VALUES ('BH1-F1','H-BH1','Floor 1','Floor',1), ('BH1-F2','H-BH1','Floor 2','Floor',2) ON CONFLICT DO NOTHING;
INSERT INTO infra.space (space_id, zone_id, space_code, space_name, space_category, capacity, has_ac) VALUES
  ('BH1-101','BH1-F1','101','Room 101','Hostel_Room',2,true), ('BH1-102','BH1-F1','102','Room 102','Hostel_Room',2,true),
  ('BH1-201','BH1-F2','201','Room 201','Hostel_Room',4,false), ('BH1-T1','BH1-F1','T1','Floor 1 toilet block','Toilet_Block',0,false)
ON CONFLICT DO NOTHING;
INSERT INTO hostel.room_profile (space_id, room_type_id)
  SELECT s, (SELECT room_type_id FROM hostel.room_type WHERE type_name = CASE WHEN s LIKE 'BH1-2%' THEN '4-sharing non-AC' ELSE '2-sharing AC' END)
  FROM unnest(ARRAY['BH1-101','BH1-102','BH1-201']) s ON CONFLICT DO NOTHING;
INSERT INTO infra.subspace (subspace_id, space_id, subspace_code, subspace_type) VALUES
  ('BH1-101-B1','BH1-101','A','Bed'), ('BH1-101-B2','BH1-101','B','Bed'), ('BH1-102-B1','BH1-102','A','Bed'), ('BH1-102-B2','BH1-102','B','Bed'),
  ('BH1-201-B1','BH1-201','A','Bed'), ('BH1-201-B2','BH1-201','B','Bed'), ('BH1-201-B3','BH1-201','C','Bed'), ('BH1-201-B4','BH1-201','D','Bed')
ON CONFLICT DO NOTHING;
INSERT INTO infra.asset_master (asset_id, space_id, asset_name, asset_category) VALUES
  ('AST-101-COT1','BH1-101','Cot','Furniture'), ('AST-101-COT2','BH1-101','Cot','Furniture'), ('AST-101-FAN','BH1-101','Ceiling fan','Electrical'),
  ('AST-101-TBL1','BH1-101','Study table','Furniture'), ('AST-101-CHR1','BH1-101','Chair','Furniture'), ('AST-101-CUP1','BH1-101','Cupboard','Furniture'),
  ('AST-102-COT1','BH1-102','Cot','Furniture'), ('AST-102-FAN','BH1-102','Ceiling fan','Electrical')
ON CONFLICT DO NOTHING;
INSERT INTO hostel.room_type_fee (room_type_id, facility_id, academic_year, registration_fee, hostel_fee, instalment_1_pct, instalment_2_due_date)
  SELECT room_type_id, 'H-BH1', '2026-27', 5000, CASE type_name WHEN '2-sharing AC' THEN 120000 ELSE 80000 END, 60, '2026-12-15'
  FROM hostel.room_type WHERE type_name IN ('2-sharing AC','4-sharing non-AC') ON CONFLICT DO NOTHING;
INSERT INTO hostel.electricity_tariff (room_type_id, included_units_per_month, rate_per_unit, effective_from, approved_by)
  SELECT room_type_id, CASE WHEN is_ac THEN 60 ELSE 30 END, 8.50, '2026-07-01', 'S-AC' FROM hostel.room_type WHERE type_name IN ('2-sharing AC','4-sharing non-AC');
INSERT INTO hostel.room_meter (space_id, meter_no, meter_type, device_ref, installed_on) VALUES
  ('BH1-101','MTR-101','Smart_Prepaid','DEV-101','2026-06-01'), ('BH1-102','MTR-102','Smart_Prepaid','DEV-102','2026-06-01'), ('BH1-201','MTR-201','Manual',NULL,'2026-06-01');
INSERT INTO hostel.staff_space_assignment (staff_id, hostel_role, facility_id, zone_id, space_id, show_on_qr) VALUES
  ('S-CW','Chief_Warden','H-BH1',NULL,NULL,true), ('S-FW','Floor_Warden','H-BH1','BH1-F1',NULL,true), ('S-FW','Floor_Warden','H-BH1','BH1-F2',NULL,true),
  ('S-OF','Office_Staff','H-BH1',NULL,NULL,false), ('S-SG','Security_Guard','H-BH1',NULL,NULL,false), ('S-MS','Mess_Incharge','H-BH1',NULL,NULL,false),
  ('S-MT','Maintenance_Supervisor','H-BH1',NULL,NULL,true);
INSERT INTO hostel.space_qr (space_id) VALUES ('BH1-101'), ('BH1-102'), ('BH1-T1');
INSERT INTO hostel.capture_point (point_name, point_type, facility_id, zone_id, device_type, device_ref) VALUES
  ('Main campus gate','Campus_Gate','H-BH1',NULL,'QR_Scanner','GATE-MAIN'), ('BH1 entrance','Hostel_Gate','H-BH1',NULL,'Card_Reader','BH1-DOOR'),
  ('BH1 floor 1 corridor','Room_Corridor','H-BH1','BH1-F1','Camera','CAM-BH1-F1');

INSERT INTO ref.student_master (student_id, full_name, student_type, programme, gender, date_of_birth, personal_email, dept_code, blood_group) VALUES
  ('2600040010','RAVI KUMAR','UG','Btech CSE','Male','2008-03-04','ravi.kumar@example.com','CSE','B+ve'),
  ('2600040012','ARJUN REDDY','UG','Btech ECE','Male','2007-11-20','arjun.reddy@example.com','ECE','O+ve'),
  ('2600040011','PRIYA DEVI','UG','Btech CSE','Female','2008-05-06','priya.devi@example.com','CSE','A+ve')
ON CONFLICT DO NOTHING;
INSERT INTO hostel.student_contact (student_id, relation, contact_name, mobile_no, is_verified, verified_on, is_outpass_approver) VALUES
  ('2600040010','Father','K RAO','9440000001',true,now(),true), ('2600040010','Self','RAVI KUMAR','9440000002',true,now(),false),
  ('2600040012','Mother','L REDDY','9440000003',true,now(),true), ('2600040012','Self','ARJUN REDDY','9440000004',true,now(),false);
COMMIT;

-- roles added by 091 (Roles, Screens and Access Rights): more staff, and portal users so ADM-01 has rows
INSERT INTO ref.department (dept_code, dept_name) VALUES ('HOSTELS','University Hostels'), ('FIN','Finance'), ('ADMIN','Administration'), ('IT','Information Technology') ON CONFLICT DO NOTHING;
INSERT INTO ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email) VALUES
  ('S-WD','Mr.','Hostel','Warden','Male','HOSTELS','Warden – BH1','9000000009','Warden','warden.bh1@kluniversity.in'),
  ('S-SO','Mr.','Security','Officer','Male','HOSTELS','Security Officer','9000000010','Security','security@kluniversity.in'),
  ('S-MU','Mr.','Mess','Supervisor','Male','HOSTELS','Mess Supervisor','9000000011','Mess',NULL),
  ('S-DP','Dr.','Dean','Progression','Female','ADMIN','Dean – Students Progression','9000000012','Admin','dean.sp@kluniversity.in'),
  ('S-PV','Dr.','ProVC','Finance','Male','ADMIN','Pro-VC Finance','9000000013','Admin','provc.finance@kluniversity.in'),
  ('S-AD','Mr.','Data','Administrator','Male','IT','Data Administrator','9000000014','Admin','erp.admin@kluniversity.in')
ON CONFLICT DO NOTHING;
INSERT INTO hostel.staff_space_assignment (staff_id, hostel_role, facility_id, zone_id, space_id, show_on_qr) VALUES
  ('S-WD','Warden','H-BH1',NULL,NULL,true), ('S-SO','Security_Officer','H-BH1',NULL,NULL,false), ('S-MU','Mess_Supervisor','H-BH1',NULL,NULL,false);
INSERT INTO portal.app_user (staff_id, full_name, email, title, home_dept) SELECT staff_id, full_name, official_email, designation, dept_code FROM ref.staff_master WHERE staff_id LIKE 'S-%' ON CONFLICT DO NOTHING;
INSERT INTO portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
  SELECT u.user_id, r.role_code, 'HOSTELS', 'S-AD', 'HO/2026/ROLES/01' FROM portal.app_user u
  JOIN (VALUES ('S-CW','Chief_Warden'),('S-FW','Floor_Warden'),('S-WD','Warden'),('S-OF','Office_Staff'),('S-AC','Accounts_Section'),('S-DN','Dean_Students_Affairs'),
               ('S-SG','Security_Guard'),('S-SO','Security_Officer'),('S-MS','Mess_Incharge'),('S-MU','Mess_Supervisor'),('S-MT','Maintenance_Supervisor'),
               ('S-DP','Dean_Students_Progression'),('S-PV','Pro_VC_Finance'),('S-AD','admin')) r(staff_id, role_code) ON r.staff_id = u.staff_id
ON CONFLICT DO NOTHING;
