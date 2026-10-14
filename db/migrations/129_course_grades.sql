-- 129: per-course letter grades from the university grade sheets (program_result_analysis_report exports).
-- term_result keeps the per-semester CGPA/backlog count; this keeps which course got which grade, so a backlog
-- can be named (F = failed, DT = detained) and a student's grade sheet can be shown.
create table if not exists acad.course_grade (
  student_id   varchar(20)  not null references ref.student_master(student_id),
  course_code  varchar(20)  not null,
  grade        varchar(10)  not null,               -- O, A+, A, B+, B, C, P, F, DT, GP, or "B+ / F" (re-attempt history)
  credits      numeric(4,1),
  kind         varchar(20),                          -- 1-mandatory, 2-elective ... as exported
  is_backlog   boolean generated always as (grade ~ '(^|/\s*)(F|DT)\s*$') stored,
  source       varchar(60),                          -- which export folder the row came from
  loaded_at    timestamptz not null default now(),
  primary key (student_id, course_code)
);
create index if not exists ix_course_grade_backlog on acad.course_grade (student_id) where is_backlog;
comment on table acad.course_grade is 'Letter grade per course per student, from the university grade-sheet exports; is_backlog names the failed/detained courses behind term_result.backlogs.';
