-- READ-ONLY check of staff logins and student mapping per residency (counts and IDs only, no names or phones).
-- Run on the master: ~/hq.sh -f hostel-mapping-check.sql  (or psql -f against hostel-prod)
begin transaction read only;
\pset footer off
\echo '== 1. Residencies: active students, floors, staff with an active assignment'
select hp.hostel_code, f.facility_name, hp.hostel_gender as gender,
  (select count(*) from hostel.hostel_allocation a join infra.subspace ss on ss.subspace_id = a.subspace_id join infra.space s on s.space_id = ss.space_id
     join infra.zone z on z.zone_id = s.zone_id where z.facility_id = f.facility_id and a.status = 'Active' and a.occupant_type::text = 'Student') as students,
  (select count(*) from infra.zone z where z.facility_id = f.facility_id and z.zone_type::text = 'Floor') as floors,
  (select count(distinct staff_id) from hostel.staff_space_assignment x where x.facility_id = f.facility_id and x.status::text = 'Active') as staff
from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id order by 1;

\echo '== 2. Staff logins per residency (staff with an active assignment): Active = password set, Invited = link not used yet'
select hp.hostel_code, count(distinct x.staff_id) as staff,
  count(distinct x.staff_id) filter (where la.status = 'Active') as login_active,
  count(distinct x.staff_id) filter (where la.status = 'Invited') as login_waiting,
  count(distinct x.staff_id) filter (where la.status = 'Disabled') as login_disabled,
  count(distinct x.staff_id) filter (where la.account_id is null) as no_login,
  count(distinct x.staff_id) filter (where la.status = 'Invited' and la.invite_expires < now()) as link_expired
from hostel.staff_space_assignment x join hostel.hostel_profile hp on hp.facility_id = x.facility_id
left join portal.login_account la on la.kind = 'staff' and la.user_ref = x.staff_id
where x.status::text = 'Active' and x.hostel_role not in ('Sweeper', 'Scavenger', 'Security_Guard')
group by 1 order by 1;

\echo '== 3. Key roles per residency (number of staff)'
select hp.hostel_code,
  count(distinct staff_id) filter (where hostel_role = 'Chief_Warden') as chief_warden,
  count(distinct staff_id) filter (where hostel_role = 'Warden') as warden,
  count(distinct staff_id) filter (where hostel_role = 'Floor_Warden') as floor_warden,
  count(distinct staff_id) filter (where hostel_role = 'Office_Staff') as office,
  count(distinct staff_id) filter (where hostel_role = 'Mess_Incharge') as mess,
  count(distinct staff_id) filter (where hostel_role in ('Sweeper', 'Scavenger')) as sweepers
from hostel.staff_space_assignment x join hostel.hostel_profile hp on hp.facility_id = x.facility_id
where x.status::text = 'Active' group by 1 order by 1;

\echo '== 4. Floors that have students but NO floor warden (neither for that floor nor for the whole residency)'
with floor_students as (
  select z.facility_id, z.zone_id, z.zone_name, count(*) n from hostel.hostel_allocation a join infra.subspace ss on ss.subspace_id = a.subspace_id
  join infra.space s on s.space_id = ss.space_id join infra.zone z on z.zone_id = s.zone_id
  where a.status = 'Active' and a.occupant_type::text = 'Student' group by 1, 2, 3)
select hp.hostel_code, fs.zone_name as floor, fs.n as students from floor_students fs join hostel.hostel_profile hp on hp.facility_id = fs.facility_id
where not exists (select 1 from hostel.staff_space_assignment x where x.status::text = 'Active' and x.hostel_role = 'Floor_Warden'
                  and x.facility_id = fs.facility_id and (x.zone_id = fs.zone_id or x.zone_id is null))
order by 1, 2;

\echo '== 5. Student mapping problems (should all be 0)'
with act as (
  select a.*, z.facility_id from hostel.hostel_allocation a join infra.subspace ss on ss.subspace_id = a.subspace_id
  join infra.space s on s.space_id = ss.space_id join infra.zone z on z.zone_id = s.zone_id
  where a.status = 'Active' and a.occupant_type::text = 'Student')
select 'boy in a girls residency or girl in a boys residency' as problem, count(*) from act join ref.student_master sm on sm.student_id = act.student_id
  join hostel.hostel_profile hp on hp.facility_id = act.facility_id
  where (hp.hostel_gender::text = 'Boys' and sm.gender::text = 'Female') or (hp.hostel_gender::text = 'Girls' and sm.gender::text = 'Male')
union all select 'student with 2+ active beds', count(*) from (select student_id from act group by 1 having count(*) > 1) t
union all select 'bed with 2+ active students', count(*) from (select subspace_id from act group by 1 having count(*) > 1) t
union all select 'room over its capacity', count(*) from (select s.space_id from act join infra.subspace ss on ss.subspace_id = act.subspace_id join infra.space s on s.space_id = ss.space_id
  group by s.space_id, s.capacity having s.capacity > 0 and count(*) > s.capacity) t
union all select 'allocated student not in the student master', count(*) from act where not exists (select 1 from ref.student_master sm where sm.student_id = act.student_id)
union all select 'allocated student whose status is not Active', count(*) from act join ref.student_master sm on sm.student_id = act.student_id where sm.status::text <> 'Active'
union all select 'allocated but is_hosteller = false', count(*) from act join ref.student_master sm on sm.student_id = act.student_id where not coalesce(sm.is_hosteller, false)
union all select 'is_hosteller = true but no active bed', count(*) from ref.student_master sm where sm.is_hosteller and sm.status::text = 'Active'
  and not exists (select 1 from act where act.student_id = sm.student_id)
union all select 'residency with no gender set', count(*) from hostel.hostel_profile where hostel_gender is null;

\echo '== 6. First 15 student IDs per problem (IDs only)'
with act as (
  select a.*, z.facility_id from hostel.hostel_allocation a join infra.subspace ss on ss.subspace_id = a.subspace_id
  join infra.space s on s.space_id = ss.space_id join infra.zone z on z.zone_id = s.zone_id
  where a.status = 'Active' and a.occupant_type::text = 'Student')
select 'gender mismatch' p, hp.hostel_code, string_agg(act.student_id, ' ' order by act.student_id) filter (where true) ids
  from act join ref.student_master sm on sm.student_id = act.student_id join hostel.hostel_profile hp on hp.facility_id = act.facility_id
  where (hp.hostel_gender::text = 'Boys' and sm.gender::text = 'Female') or (hp.hostel_gender::text = 'Girls' and sm.gender::text = 'Male')
  group by 2 having count(*) > 0
union all select '2+ beds', null, (select string_agg(student_id, ' ') from (select student_id from act group by 1 having count(*) > 1 order by 1 limit 15) t)
union all select 'no active bed (is_hosteller)', null, (select string_agg(student_id, ' ') from (select student_id from ref.student_master sm where sm.is_hosteller and sm.status::text = 'Active'
  and not exists (select 1 from act where act.student_id = sm.student_id) order by 1 limit 15) t);

\echo '== 7. Student logins (residents with a password login)'
select count(*) as active_residents,
  count(la.account_id) filter (where la.status = 'Active') as login_active,
  count(la.account_id) filter (where la.status = 'Invited') as login_waiting,
  count(*) filter (where la.account_id is null) as no_login
from (select distinct student_id from hostel.hostel_allocation where status = 'Active' and occupant_type::text = 'Student') r
left join portal.login_account la on la.kind = 'student' and la.user_ref = r.student_id;
rollback;
