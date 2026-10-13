-- =====================================================================
-- 125  What a student studied before KL, 13 Oct 2026.
--   A first-year student has no semester results yet: the academic page shows the qualifications they came with
--   (10th and Intermediate for UG; the degree as well for PG), from the admission record or entered by the student
--   with a photo of the certificate. A Warden verifies an entry the student added, as with certificates.
-- =====================================================================
CREATE TABLE IF NOT EXISTS acad.prior_education (
  prior_id        bigserial PRIMARY KEY,
  student_id      varchar(20) NOT NULL REFERENCES ref.student_master,
  level           varchar(14) NOT NULL CHECK (level IN ('SSC', 'Intermediate', 'Diploma', 'Degree', 'PG')),
  board           varchar(120),                        -- board or university
  institution     varchar(160),
  group_name      varchar(80),                         -- MPC, BiPC, B.Tech CSE…
  year_passed     smallint CHECK (year_passed BETWEEN 1990 AND 2100),
  marks_pct       numeric(5, 2) CHECK (marks_pct BETWEEN 0 AND 100),
  cgpa            numeric(4, 2) CHECK (cgpa BETWEEN 0 AND 10),
  roll_no         varchar(40),
  certificate     text,                                -- data URL of the certificate photo or PDF, as receipts are stored
  source          varchar(10) NOT NULL DEFAULT 'Student' CHECK (source IN ('ERP', 'Student')),
  verified_by     varchar(20) REFERENCES ref.staff_master,
  verified_on     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, level)
);
COMMENT ON TABLE acad.prior_education IS 'Qualifications before KL: shown to a fresher instead of semester results.';

-- demo: the two new students of 2026-27 came with 10th and Intermediate
INSERT INTO acad.prior_education (student_id, level, board, institution, group_name, year_passed, marks_pct, cgpa, roll_no, source, verified_on)
SELECT v.* FROM (VALUES
  ('2600041011', 'SSC',          'Board of Secondary Education, AP',     'Sri Chaitanya School, Guntur',          NULL,  2024, NULL,  9.5::numeric, '2412345678', 'ERP', now()),
  ('2600041011', 'Intermediate', 'Board of Intermediate Education, AP', 'Narayana Junior College, Vijayawada',   'MPC', 2026, 96.3::numeric, NULL, '2608765432', 'ERP', now()),
  ('2600040011', 'SSC',          'CBSE',                                 'Kendriya Vidyalaya, Vijayawada',        NULL,  2024, 92.0::numeric, NULL, 'KV2411223', 'ERP', now()),
  ('2600040011', 'Intermediate', 'Board of Intermediate Education, AP', 'Sri Chaitanya Junior College, Guntur',  'MPC', 2026, 94.8::numeric, NULL, '2609988776', 'ERP', now())
) AS v(student_id, level, board, institution, group_name, year_passed, marks_pct, cgpa, roll_no, source, verified_on)
WHERE EXISTS (SELECT 1 FROM ref.student_master s WHERE s.student_id = v.student_id)
ON CONFLICT (student_id, level) DO NOTHING;

-- demo: the two 2026-27 freshers had sample semester and CRT rows; a first-year student has none yet
DELETE FROM acad.term_result    WHERE student_id IN ('2600041011', '2600040011');
DELETE FROM acad.crt_assessment WHERE student_id IN ('2600041011', '2600040011');
DELETE FROM acad.crt_attendance WHERE student_id IN ('2600041011', '2600040011');
