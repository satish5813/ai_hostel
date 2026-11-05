-- =====================================================================
-- 131  Students create their own login, 5 Nov 2026.
--   A resident opens /register (web or app), types the university ID and gets a 6-digit code at
--   <id>@kluniversity.in. With the code they choose a password; the login (portal.login_account, kind 'student')
--   is made or, if it exists, its password is reset ("forgot password" is the same flow).
--   One row per student: only the latest code works. Codes are stored hashed, live 10 minutes and allow 5 tries;
--   a student can ask for a new code once a minute and at most 6 times a day.
-- =====================================================================
CREATE TABLE IF NOT EXISTS portal.register_code (
  student_id    varchar(20) PRIMARY KEY,
  code_hash     char(64)    NOT NULL,
  sent_to       varchar(160) NOT NULL,
  expires_at    timestamptz NOT NULL,
  attempts      smallint    NOT NULL DEFAULT 0,
  sends_today   smallint    NOT NULL DEFAULT 1,
  sent_on       date        NOT NULL DEFAULT current_date,
  last_sent_at  timestamptz NOT NULL DEFAULT now(),
  used_at       timestamptz
);
COMMENT ON TABLE portal.register_code IS 'The latest e-mailed code a student uses to create or reset their own login (hashed, 10 minutes, 5 tries)';
