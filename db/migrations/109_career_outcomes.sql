-- =====================================================================
-- 109  Career tracking for hostellers, 4 Oct 2026.
--   Second year: progress towards the career each student chose (acad.career_goal) is read from their record by the
--   API (career-rules.ts): milestones of the path met, and On track / Watch / Needs guidance.
--   Final year: what happened. One row per placement offer, higher-studies application, competitive examination or
--   venture, moved through its stages (applied ... joined; prelims ... selected; idea ... funded). The Chief Warden
--   sees it student by student; the President, Vice President and Pro-VCs building by building (EXE-01).
-- =====================================================================

CREATE TABLE acad.outcome_stage (
  outcome_type  varchar(20) NOT NULL CHECK (outcome_type IN ('Placement', 'Higher_Studies', 'Competitive_Exam', 'Entrepreneurship')),
  stage         varchar(20) NOT NULL,
  stage_no      smallint NOT NULL,
  is_success    boolean NOT NULL DEFAULT false,
  label         varchar(60) NOT NULL,
  PRIMARY KEY (outcome_type, stage)
);
COMMENT ON TABLE acad.outcome_stage IS 'The stages of each kind of final-year outcome, in order; is_success = counts as achieved';
INSERT INTO acad.outcome_stage (outcome_type, stage, stage_no, is_success, label) VALUES
  ('Placement', 'Applied', 1, false, 'Applied'), ('Placement', 'Shortlisted', 2, false, 'Shortlisted'), ('Placement', 'Interview', 3, false, 'Interviewed'),
  ('Placement', 'Offer', 4, true, 'Offer received'), ('Placement', 'Joined', 5, true, 'Joined'), ('Placement', 'Rejected', 0, false, 'Not selected'), ('Placement', 'Declined', 0, false, 'Offer declined'),
  ('Higher_Studies', 'Preparing', 1, false, 'Preparing'), ('Higher_Studies', 'Test_Taken', 2, false, 'Entrance test taken'), ('Higher_Studies', 'Applied', 3, false, 'Applied'),
  ('Higher_Studies', 'Admitted', 4, true, 'Admit received'), ('Higher_Studies', 'Joined', 5, true, 'Joined'), ('Higher_Studies', 'Rejected', 0, false, 'Not admitted'),
  ('Competitive_Exam', 'Preparing', 1, false, 'Preparing'), ('Competitive_Exam', 'Appeared', 2, false, 'Appeared'), ('Competitive_Exam', 'Qualified', 3, true, 'Qualified / prelims cleared'),
  ('Competitive_Exam', 'Final_Stage', 4, true, 'Mains or interview'), ('Competitive_Exam', 'Selected', 5, true, 'Selected'), ('Competitive_Exam', 'Not_Qualified', 0, false, 'Not qualified'),
  ('Entrepreneurship', 'Idea', 1, false, 'Idea'), ('Entrepreneurship', 'Incubated', 2, false, 'In incubation'), ('Entrepreneurship', 'Registered', 3, true, 'Company registered'),
  ('Entrepreneurship', 'Funded', 4, true, 'Funded'), ('Entrepreneurship', 'Revenue', 5, true, 'Earning revenue'), ('Entrepreneurship', 'Closed', 0, false, 'Closed');

CREATE TABLE acad.career_outcome (
  outcome_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id     varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  outcome_type   varchar(20) NOT NULL,
  stage          varchar(20) NOT NULL,
  organisation   varchar(120) NOT NULL CHECK (length(trim(organisation)) > 0),
  detail         varchar(120),
  ctc_lpa        numeric(6,2) CHECK (ctc_lpa > 0 AND ctc_lpa < 500),
  country        varchar(60),
  score          varchar(40),
  funding_inr    numeric(14,2) CHECK (funding_inr >= 0),
  stage_on       date NOT NULL DEFAULT current_date,
  source         varchar(20) NOT NULL DEFAULT 'Staff' CHECK (source IN ('Placement_Cell', 'Staff', 'Student', 'Import')),
  verified       boolean NOT NULL DEFAULT false,
  notes          varchar(300),
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     varchar(20),
  updated_at     timestamptz,
  updated_by     varchar(20),
  FOREIGN KEY (outcome_type, stage) REFERENCES acad.outcome_stage (outcome_type, stage),
  CONSTRAINT ck_outcome_ctc CHECK (ctc_lpa IS NULL OR outcome_type = 'Placement'),
  CONSTRAINT ck_outcome_funding CHECK (funding_inr IS NULL OR outcome_type = 'Entrepreneurship')
);
COMMENT ON TABLE acad.career_outcome IS 'A final-year student''s placement offer, higher-studies application, competitive exam or venture, at its latest stage';
COMMENT ON COLUMN acad.career_outcome.organisation IS 'Company, university, examination (GATE, UPSC CSE, ...) or the venture''s name';
COMMENT ON COLUMN acad.career_outcome.detail IS 'Role, course (MS Computer Science), post, or what the venture does';
COMMENT ON COLUMN acad.career_outcome.ctc_lpa IS 'Placement: cost to company, lakh rupees a year';
COMMENT ON COLUMN acad.career_outcome.score IS 'Competitive exam or entrance test: score, percentile or rank as published';
CREATE INDEX ix_career_outcome_student ON acad.career_outcome (student_id);
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON acad.career_outcome FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();
CREATE TRIGGER trg_audit_career_outcome AFTER INSERT OR UPDATE OR DELETE ON acad.career_outcome FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('outcome_id');

-- The year a student is in: from the ERP's "N Year / Sem M", else from the last term result.
CREATE OR REPLACE FUNCTION acad.fn_study_year(p_student text) RETURNS int LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT substring(year_semester FROM '(\d)\s*Year')::int FROM ref.student_master WHERE student_id = p_student),
                  (SELECT ceil((max(semester_no) + 1) / 2.0)::int FROM acad.term_result WHERE student_id = p_student));
$$;

-- Each student's best result of each kind: the furthest stage reached, and for placements the highest package.
CREATE OR REPLACE VIEW acad.v_outcome_best AS
SELECT DISTINCT ON (o.student_id, o.outcome_type) o.student_id, o.outcome_type, o.stage, s.label AS stage_label, s.stage_no, s.is_success,
       o.organisation, o.detail, o.ctc_lpa, o.country, o.score, o.funding_inr, o.stage_on
  FROM acad.career_outcome o JOIN acad.outcome_stage s USING (outcome_type, stage)
 ORDER BY o.student_id, o.outcome_type, s.is_success DESC, o.ctc_lpa DESC NULLS LAST, s.stage_no DESC, o.stage_on DESC;
COMMENT ON VIEW acad.v_outcome_best IS 'Per student and kind of outcome: the best one so far (success first, then the highest package, then the furthest stage)';
