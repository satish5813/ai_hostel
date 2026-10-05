-- =====================================================================
-- 112  The photo a student adds to their profile, 4 Oct 2026.
--   ref.student_master.photo is the ERP's link to the official photo (200 characters). Until the document store is
--   connected, a student's own photo is kept here as a small JPEG data URL (the browser shrinks it to 320 px first);
--   the profile shows this one, or the ERP's when there is none.
-- =====================================================================
CREATE TABLE hostel.student_photo (
  student_id  varchar(20) PRIMARY KEY REFERENCES ref.student_master(student_id),
  image       text NOT NULL CHECK (image ~ '^data:image/(jpeg|png|webp);base64,' AND length(image) <= 300000),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE hostel.student_photo IS 'A student''s own profile photo (small data URL), shown on the profile and in the menu';
