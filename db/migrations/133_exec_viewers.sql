-- 133: two read-only roles for the executive dashboard (EXE-01).
--   Senior_Management    : the whole dashboard, every hostel, nothing to approve (Director, Advisor, ...).
--   Ladies_Hostels_Head  : the same dashboard narrowed to the hostels given to the login in staff_space_assignment
--                          (the ladies' residencies), like a Chief Manager's hostels.
insert into portal.role (role_code, name, module) values
  ('Senior_Management',   'Senior management (dashboard, read-only)', 'hostel'),
  ('Ladies_Hostels_Head', 'Head, Ladies Hostels (dashboard of own hostels)', 'hostel')
on conflict (role_code) do nothing;
