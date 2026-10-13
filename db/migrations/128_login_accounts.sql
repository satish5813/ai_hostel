-- =====================================================================
-- 128  Logins for production, 13 Oct 2026.
--   One row per person who signs in with a password: a student (username = university ID) or a staff member
--   (username = employee ID). The administrator creates them one at a time or in bulk; each person gets an e-mail
--   with a one-time link to set their own password, so no password is ever typed, stored in clear or mailed.
--   What a staff login may do still comes from portal.user_role and the hostels in hostel.staff_space_assignment.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS portal.login_account (
  account_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username        varchar(40)  NOT NULL,
  kind            varchar(8)   NOT NULL CHECK (kind IN ('student', 'staff')),
  user_ref        varchar(20)  NOT NULL,                    -- student_id or staff_id
  email           varchar(160),
  password_hash   text,                                     -- bcrypt (pgcrypto); null until the person sets it
  status          varchar(10)  NOT NULL DEFAULT 'Invited' CHECK (status IN ('Invited', 'Active', 'Disabled')),
  invite_hash     char(64),                                 -- sha-256 of the one-time link token
  invite_expires  timestamptz,
  mail_status     varchar(14)  NOT NULL DEFAULT 'Not_Sent' CHECK (mail_status IN ('Not_Sent', 'Queued', 'Sent', 'Failed', 'No_Email')),
  mail_error      varchar(300),
  mailed_on       timestamptz,
  token_version   int          NOT NULL DEFAULT 1,          -- raised to sign every device out (disable, password change)
  failed_count    smallint     NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  last_login      timestamptz,
  password_set_on timestamptz,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  created_by      varchar(20),
  updated_at      timestamptz,
  updated_by      varchar(20)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_login_account_username ON portal.login_account (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS ux_login_account_person   ON portal.login_account (kind, user_ref);
CREATE INDEX        IF NOT EXISTS ix_login_account_invite   ON portal.login_account (invite_hash) WHERE invite_hash IS NOT NULL;
COMMENT ON TABLE portal.login_account IS 'Password logins made by the administrator; the person sets the password from a one-time e-mail link.';
