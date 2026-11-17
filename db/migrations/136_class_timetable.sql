-- 136: each hostel student's class timetable for the running semester, from the university ERP timetable export
-- (STUDENT_TIMETABLES_<year>_<term>, sheet "Timetable Long": one row per student, day and teaching hour).
-- Floor managers and chief wardens open a student's week by university ID; students see today's classes on their home.
create table if not exists acad.class_timetable (
  student_id    varchar(20) not null references ref.student_master(student_id),
  academic_year varchar(9)  not null,                                     -- 2026-27
  term          varchar(10) not null check (term in ('Odd', 'Even', 'Summer')),
  day_no        smallint    not null check (day_no between 1 and 7),      -- 1 Monday ... 7 Sunday (ISO)
  hour_no       smallint    not null check (hour_no between 1 and 24),    -- the ERP's teaching hour
  course_code   varchar(30) not null,
  ltps          char(1)     not null check (ltps in ('L', 'T', 'P', 'S')), -- lecture, tutorial, practical, skill
  section       varchar(30),
  class_room    varchar(40),
  source        varchar(200),
  loaded_at     timestamptz not null default now(),
  primary key (student_id, academic_year, term, day_no, hour_no)
);
create index if not exists class_timetable_term_day on acad.class_timetable (academic_year, term, day_no);
comment on table acad.class_timetable is 'Class timetable per hostel student per semester, one row per day and teaching hour, from the ERP timetable export.';

-- clock times of the ERP teaching hours; empty until the academic office confirms them (screens then show "Hour 3")
create table if not exists acad.class_hour (
  hour_no    smallint primary key check (hour_no between 1 and 24),
  start_time time,
  end_time   time,
  check (end_time is null or start_time is null or end_time > start_time)
);
insert into acad.class_hour (hour_no) select g from generate_series(1, 24) g on conflict do nothing;
comment on table acad.class_hour is 'Clock time of each ERP teaching hour; fill start_time / end_time when the academic office gives the bell timings.';
