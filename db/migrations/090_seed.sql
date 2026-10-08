-- =====================================================================
-- 090  seed — reference rows the application needs on day one
--      roles (organogram), approval rules (Workflows E, F, N), policy settings, indent steps,
--      room types, academic year, report visibility. Campus / hostel / room rows come from the Infrastructure import.
-- =====================================================================

-- ---------- roles: portal roles + hostel organogram ----------
INSERT INTO portal.role (role_code, name, module) VALUES
  ('admin','Data Administrator','portal'), ('indentor','Indentor','portal'), ('hod','Head of Department','portal'),
  ('storekeeper','Stores General Manager','portal'), ('stockentry','Stock Data Entry Operator','portal'), ('purchase','Purchase Officer','portal'),
  ('purchasegm','Purchase General Manager','portal'), ('approver','Finance Approving Officer','portal'), ('authority','Pro-VC Finance','portal'),
  ('auditor','Internal Auditor','portal'), ('security','Security (gate register)','portal'), ('accounts','Accounts Section','portal'), ('viewer','Read-only','portal'),
  ('Vice_Chancellor','Vice-Chancellor','hostel'), ('Pro_VC','Pro-Vice Chancellor (Residential Life & Student Success)','hostel'),
  ('Dean_Students_Affairs','Dean – Students Affairs','hostel'), ('Director_Hostels','Director – Hostels','hostel'),
  ('Chief_Warden','Chief Warden (Head – University Hostels / Boys / Girls)','hostel'), ('Hostel_Incharge','Hostel In-charge','hostel'),
  ('Warden','Resident Warden','hostel'), ('Assistant_Warden','Assistant Warden','hostel'), ('Floor_Warden','Floor Warden','hostel'),
  ('Office_Staff','Hostel Office Staff','hostel'), ('Room_Allotment','Room Allotment Section','hostel'), ('Accounts_Section','Hostel Accounts Section','hostel'),
  ('Student_Grievances','Student Grievances Desk','hostel'), ('Mess_Manager','Mess Manager','hostel'), ('Mess_Incharge','Mess In-charge','hostel'),
  ('Cook','Cook / Chef','hostel'), ('Catering','Catering staff','hostel'), ('Maintenance_Supervisor','Maintenance Supervisor','hostel'),
  ('Electrician','Electrician','hostel'), ('Housekeeping_Supervisor','Housekeeping Supervisor','hostel'), ('Cleaner','Housekeeping cleaner','hostel'),
  ('Security_Officer','Security Officer','hostel'), ('Security_Guard','Security guard','hostel'), ('Counsellor','Counsellor','hostel'),
  ('Dispensary','Dispensary / first aid','hostel'), ('Facility_Incharge','Facility In-charge (library, activity centre, play room, court)','hostel'),
  ('Faculty_Counsellor','Faculty Counsellor','hostel'), ('HOD','Head of Department (discipline summary)','hostel'),
  ('Student','Student (hostel resident)','hostel'), ('Parent','Parent / Guardian','hostel');

-- ---------- approval rules ----------
INSERT INTO shared.approval_rule (request_type, level, approver_role, condition_key, condition_value, is_mandatory, sla_hours) VALUES
  ('Outpass', 0, 'Parent',               NULL, NULL, true, 12),
  ('Outpass', 1, 'Floor_Warden',         NULL, NULL, true, 6),
  ('Outpass', 2, 'Chief_Warden',         NULL, NULL, true, 6),
  ('Outpass', 3, 'Dean_Students_Affairs','outing_category','Day_Or_More', true, 24),
  ('Sick_Leave', 1, 'Floor_Warden', NULL, NULL, true, 4),
  ('Sick_Leave', 2, 'Chief_Warden', NULL, NULL, true, 8),
  ('Vacate', 1, 'Floor_Warden', NULL, NULL, true, 24),
  ('Vacate', 2, 'Chief_Warden', NULL, NULL, true, 24),
  ('Vacate', 3, 'Accounts_Section', NULL, NULL, true, 48),
  ('Vacate', 4, 'Director_Hostels', NULL, NULL, true, 48);

-- ---------- policy settings ----------
INSERT INTO shared.policy_setting (setting_key, module, amount, value_text, meaning) VALUES
  ('finance_limit',           'portal', 50000,  NULL, 'Pro-VC Finance approves up to this value; above it Finance recommends and the Vice President or President approves'),
  ('store_posting_limit',     'portal', 250000, NULL, 'Stock entries and deployments above this value need Level 2 approval'),
  ('offer_hold_hours',        'hostel', 48,     NULL, 'Hours a room offer is held for the student''s decision (Room_Offer.Hold_Until)'),
  ('movement_retention_days', 'hostel', 180,    NULL, 'Movement_Event rows older than this are deleted by the scheduled job'),
  ('registration_fee_due_days','hostel', 7,     NULL, 'Days allowed to pay the registration fee after applying'),
  ('instalment_1_due_days',   'hostel', 7,      NULL, 'Days allowed to pay the first hostel instalment after accepting the room'),
  ('meter_low_units',         'hostel', 10,     NULL, 'Units left at which the student is warned (Meter_Low alert)'),
  ('ticket_deadline_hours',   'hostel', 24,     NULL, 'Hours within which a hostel maintenance ticket must be done'),
  ('tracking_policy_version', 'hostel', NULL,   'v2.1-2026', 'Version of the tracking policy shown at consent'),
  ('parent_consent_age',      'hostel', 18,     NULL, 'Students below this age need parent consent for tracking');

-- ---------- indent steps (portal) ----------
INSERT INTO portal.indent_step (step, name) VALUES
  (0,'Indenter'), (1,'HOD'), (2,'Central Stores verification'), (3,'Stores General Manager'), (4,'Reservation and issue'),
  (5,'Purchase'), (6,'Department acknowledgement'), (7,'Closed');

-- ---------- room types ----------
INSERT INTO hostel.room_type (type_name, sharing_count, is_ac, attached_bath) VALUES
  ('1-sharing AC', 1, true, true), ('2-sharing AC', 2, true, true), ('2-sharing non-AC', 2, false, true),
  ('3-sharing AC', 3, true, true), ('3-sharing non-AC', 3, false, false), ('4-sharing AC', 4, true, false), ('4-sharing non-AC', 4, false, false),
  ('6-sharing non-AC', 6, false, false);

-- ---------- academic year ----------
INSERT INTO hostel.academic_year (academic_year, start_date, end_date, is_current) VALUES
  ('2025-26', '2025-07-01', '2026-06-30', false), ('2026-27', '2026-07-01', '2027-06-30', true);

-- ---------- report visibility (SH3) ----------
INSERT INTO shared.report_visibility (report_code, role_code, scope) VALUES
  ('occupancy','Chief_Warden','Hostel'), ('occupancy','Director_Hostels','All'), ('occupancy','Dean_Students_Affairs','All'), ('occupancy','Floor_Warden','Floor'),
  ('fee_dues','Accounts_Section','All'), ('fee_dues','Chief_Warden','Hostel'), ('fee_dues','Student','Own'),
  ('meter_usage','Student','Own'), ('meter_usage','Maintenance_Supervisor','All'), ('meter_usage','Accounts_Section','All'),
  ('student_location','Floor_Warden','Floor'), ('student_location','Chief_Warden','Hostel'), ('student_location','Security_Officer','All'),
  ('location_access_log','Chief_Warden','Hostel'), ('location_access_log','Dean_Students_Affairs','All'),
  ('outpass','Floor_Warden','Floor'), ('outpass','Chief_Warden','Hostel'), ('outpass','Dean_Students_Affairs','All'), ('outpass','Security_Guard','All'), ('outpass','Student','Own'), ('outpass','Parent','Own'),
  ('sick_list','Mess_Incharge','All'), ('sick_list','Floor_Warden','Floor'), ('sick_list','Chief_Warden','Hostel'),
  ('alerts','Floor_Warden','Floor'), ('alerts','Chief_Warden','Hostel'), ('alerts','Security_Officer','All'),
  ('floors_without_warden','Chief_Warden','Hostel'), ('floors_without_warden','Director_Hostels','All');

-- ---------- departments used by the hostel module when it raises indents ----------
INSERT INTO ref.department (dept_code, dept_name) VALUES ('ALL','Whole university'), ('ADMIN','Administration'), ('HOSTELS','University Hostels'), ('STORES','Central Stores'), ('FIN','Finance & Accounts')
ON CONFLICT DO NOTHING;
