-- Development fixtures for the duty roster (094): sweepers, scavengers and one more guard and Floor Warden for BH1 and BH2,
-- mapped to floors and washroom blocks, so the roster has regular people, absentees and covers to show.
-- Needs db/seed/dev_fixtures.sql and scripts/demo-seed.sh first (BH1 floor 3, BH2 floors and washroom blocks).
INSERT INTO ref.staff_master (staff_id, first_name, last_name, gender, dept_code, designation, staff_type, mobile_no) VALUES
  ('H4001', 'Ramulu', 'K',       'Male',   'HOSTELS', 'Sweeper',       'Housekeeping', '9000040001'),
  ('H4002', 'Venkatesh', 'B',    'Male',   'HOSTELS', 'Sweeper',       'Housekeeping', '9000040002'),
  ('H4003', 'Sailu', 'M',        'Female', 'HOSTELS', 'Sweeper',       'Housekeeping', '9000040003'),
  ('H4004', 'Yadaiah', 'P',      'Male',   'HOSTELS', 'Scavenger',     'Housekeeping', '9000040004'),
  ('H4005', 'Kondaiah', 'S',     'Male',   'HOSTELS', 'Scavenger',     'Housekeeping', '9000040005'),
  ('H4006', 'Narsimha', 'R',     'Male',   'HOSTELS', 'Sweeper',       'Housekeeping', '9000040006'),
  ('H4007', 'Mallesh', 'T',      'Male',   'HOSTELS', 'Sweeper',       'Housekeeping', '9000040007'),
  ('H4008', 'Balaraju', 'G',     'Male',   'HOSTELS', 'Scavenger',     'Housekeeping', '9000040008'),
  ('H4009', 'Anjaiah', 'V',      'Male',   'HOSTELS', 'Scavenger',     'Housekeeping', '9000040009'),
  ('H4010', 'Srinu', 'D',        'Male',   'HOSTELS', 'Security guard','Security',     '9000040010'),
  ('H4011', 'Kiran', 'Babu',     'Male',   'HOSTELS', 'Floor warden',  'Warden',       '9000040011')
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO hostel.staff_space_assignment (staff_id, hostel_role, facility_id, zone_id, space_id, shift, show_on_qr, created_by) VALUES
  ('H4001', 'Sweeper',   'H-BH1', 'BH1-F1', NULL,     'Morning', true, 'S-CW'),
  ('H4002', 'Sweeper',   'H-BH1', 'BH1-F2', NULL,     'Morning', true, 'S-CW'),
  ('H4003', 'Sweeper',   'H-BH1', 'BH1-F3', NULL,     'Morning', true, 'S-CW'),
  ('H4004', 'Scavenger', 'H-BH1', 'BH1-F1', 'BH1-T1', 'Morning', true, 'S-CW'),
  ('H4005', 'Scavenger', 'H-BH1', 'BH1-F3', 'BH1-T3', 'Morning', true, 'S-CW'),
  ('H4010', 'Security_Guard', 'H-BH1', NULL, NULL,    'Night',   false, 'S-CW'),
  ('H4011', 'Floor_Warden',   'H-BH1', 'BH1-F2', NULL, 'General', true, 'S-CW'),
  ('H4006', 'Sweeper',   'H-BH2', 'BH2-F1', NULL,     'Morning', true, 'E2001'),
  ('H4006', 'Sweeper',   'H-BH2', 'BH2-F2', NULL,     'Morning', true, 'E2001'),
  ('H4007', 'Sweeper',   'H-BH2', 'BH2-F3', NULL,     'Morning', true, 'E2001'),
  ('H4007', 'Sweeper',   'H-BH2', 'BH2-F4', NULL,     'Morning', true, 'E2001'),
  ('H4008', 'Scavenger', 'H-BH2', 'BH2-F1', 'BH2-T1', 'Morning', true, 'E2001'),
  ('H4008', 'Scavenger', 'H-BH2', 'BH2-F2', 'BH2-T2', 'Morning', true, 'E2001'),
  ('H4009', 'Scavenger', 'H-BH2', 'BH2-F3', 'BH2-T3', 'Morning', true, 'E2001'),
  ('H4009', 'Scavenger', 'H-BH2', 'BH2-F4', 'BH2-T4', 'Morning', true, 'E2001')
ON CONFLICT DO NOTHING;
