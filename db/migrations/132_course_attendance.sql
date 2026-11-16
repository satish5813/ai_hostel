-- 132: class attendance per course for the running semester, from the university ERP attendance exports
-- (B.Tech_<n>_YEAR / MHS_ALL, one row per student per course). term_result keeps the student's overall % for the
-- semester; this keeps the course-wise figures behind it, so the student and the wardens see which course is short.
create table if not exists acad.course_attendance (
  student_id       varchar(20)  not null references ref.student_master(student_id),
  academic_year    varchar(9)   not null,               -- 2026-27
  term             varchar(10)  not null check (term in ('Odd', 'Even', 'Summer')),
  course_code      varchar(30)  not null,
  course_name      varchar(200),
  -- classes counted by the ERP (after exemptions) and attended, per component: lecture, tutorial, practical, skill
  l_held numeric(6,1) not null default 0, l_attended numeric(6,1) not null default 0,
  t_held numeric(6,1) not null default 0, t_attended numeric(6,1) not null default 0,
  p_held numeric(6,1) not null default 0, p_attended numeric(6,1) not null default 0,
  s_held numeric(6,1) not null default 0, s_attended numeric(6,1) not null default 0,
  attendance_pct   numeric(5,2) check (attendance_pct between 0 and 100),   -- the ERP's own % for the course
  as_of            date         not null,               -- date of the export
  source           varchar(200),
  loaded_at        timestamptz  not null default now(),
  primary key (student_id, academic_year, term, course_code)
);
comment on table acad.course_attendance is 'Class attendance per student per course per semester, from the ERP attendance exports; the overall semester % is in acad.term_result.attendance_pct.';
