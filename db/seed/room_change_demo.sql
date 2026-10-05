-- Room change demo (115): a login for the Floor Warden of Boys Hostel 2, floors 1-2 (E2002), who takes the first
-- approval for students there; BH2 has free 2-sharing and 3-sharing AC beds to try room changes with.
INSERT INTO portal.demo_login (username, password_hash, role_code, user_ref, display_name, description, group_name, sort_order)
VALUES ('E2002', crypt('Demo@2026', gen_salt('bf')), 'Floor_Warden', 'E2002', 'Naveen Kumar, Floor Warden BH2', 'Floors 1-2 of Boys Hostel 2: approves room changes first', 'Wardens', 36)
ON CONFLICT (username) DO NOTHING;
