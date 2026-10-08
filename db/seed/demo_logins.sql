-- Demo sign-in accounts for training and review (dev only; the API serves them when DEMO_LOGIN=1).
-- Every account has the same demo password, stored as a bcrypt hash: Demo@2026
-- Run after scripts/demo-rich.py, which creates the students and the hostel logins these accounts use.
CREATE TABLE IF NOT EXISTS portal.demo_login (
  username       varchar(40) PRIMARY KEY,
  password_hash  text NOT NULL,
  role_code      varchar(40) NOT NULL,
  user_ref       varchar(20) NOT NULL,
  display_name   varchar(80) NOT NULL,
  description    varchar(200),
  group_name     varchar(40) NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  active         boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE portal.demo_login IS 'Demo sign-in accounts (training only). The live system signs in with the KL University account.';

INSERT INTO portal.demo_login (username, password_hash, role_code, user_ref, display_name, description, group_name, sort_order)
SELECT v.u, crypt('Demo@2026', gen_salt('bf', 8)), v.r, v.u, v.n, v.d, v.g, v.o FROM (VALUES
  ('admin',      'admin',                 'Administrator',                  'Masters, room builder, logins, menus, renewal window', 'Administration', 10),
  ('S-CW',       'Chief_Warden',          'Chief Warden, Boys Hostel 1',    'Approvals, exceptions, discipline inquiry, weekly report', 'Chief Warden', 20),
  ('S-GW',       'Chief_Warden',          'Lakshmi Devi, Girls Hostel 1',   'A girls hostel: outings waiting, fee checks', 'Chief Warden', 21),
  ('E2001',      'Chief_Warden',          'Suresh Rao, Boys Hostel 2',      'Foreign students; a property-damage case', 'Chief Warden', 22),
  ('E2006',      'Chief_Warden',          'Padma Sri, Girls Hostel 2',      'One allotment waiting for approval', 'Chief Warden', 23),
  ('S-OF',       'Room_Allotment',        'Hostel office, BH1 GH1 GH2',     'Fee checks, offers, check-in, renewals', 'Room Allotment', 30),
  ('E2004',      'Room_Allotment',        'Anitha Devi, Boys Hostel 2',     'An offer the student has not answered', 'Room Allotment', 31),
  ('S-DN',       'Dean_Students_Affairs', 'Dean, Students Affairs',         'Every report: absence, discipline, weekly floors, careers', 'Dean', 40),
  ('2600040012', 'Student',               'Arjun Reddy, BH1',               'Approved gate pass with QR; a warning on record', 'Student', 50),
  ('2600042001', 'Student',               'Ananya Sharma, GH1',             'Outing waiting for the warden; renewing her room', 'Student', 51),
  ('2600042205', 'Student',               'Nabin Shrestha, BH2 (Nepal)',    'Foreign student eating the Nepal menu', 'Student', 52),
  ('2600042102', 'Student',               'Kiran Kumar, BH1',               'Two discipline cases; needs career guidance', 'Student', 53),
  ('2600042011', 'Student',               'Tejaswini Kumar, GH1',           'Room accepted, hostel fees still to pay', 'Student', 54),
  ('2600040011', 'Student',               'New student',                    'Has not applied for a room yet', 'Student', 55)
) AS v(u, r, n, d, g, o)
ON CONFLICT (username) DO UPDATE SET role_code = excluded.role_code, user_ref = excluded.user_ref, display_name = excluded.display_name,
  description = excluded.description, group_name = excluded.group_name, sort_order = excluded.sort_order, active = true;
