-- 134: the boys' counterpart of Ladies_Hostels_Head (133): the executive dashboard narrowed to the hostels given to
-- the login in staff_space_assignment (the boys' residencies), read-only.
insert into portal.role (role_code, name, module) values
  ('Boys_Hostels_Head', 'Head, Boys Hostels (dashboard of own hostels)', 'hostel')
on conflict (role_code) do nothing;
