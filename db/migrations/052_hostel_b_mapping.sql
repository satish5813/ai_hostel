-- =====================================================================
-- 052  hostel — Workflow B: Mapping people to rooms
--      Rooms and beds > Wardens to hostels > Floor Wardens to floors > Cleaners and In-charges to areas > QR labels
--      Tables B1 Staff_Space_Assignment, B2 Space_QR
-- =====================================================================

CREATE TYPE hostel.shift             AS ENUM ('Morning','Evening','Night','General');
CREATE TYPE hostel.assignment_status AS ENUM ('Active','Ended');
CREATE TYPE hostel.qr_status         AS ENUM ('Active','Replaced');

-- ---------- B1 Staff_Space_Assignment: staff member responsible for a hostel, floor or area, for a period ----------
CREATE TABLE hostel.staff_space_assignment (
  assignment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id      varchar(20) NOT NULL REFERENCES ref.staff_master,
  hostel_role   varchar(30) NOT NULL REFERENCES portal.role,   -- Chief_Warden, Warden, Floor_Warden, Office_Staff, Housekeeping, Security, Mess_Incharge, Facility_Incharge ...
  facility_id   varchar(30) NOT NULL REFERENCES hostel.hostel_profile,   -- hostel
  zone_id       varchar(30) REFERENCES infra.zone,           -- floor; empty when responsible for the whole hostel
  space_id      varchar(30) REFERENCES infra.space,          -- a single area, for example a toilet block
  shift         hostel.shift NOT NULL DEFAULT 'General',
  from_date     date NOT NULL DEFAULT current_date,
  to_date       date,                                        -- empty while current
  show_on_qr    boolean NOT NULL DEFAULT false,              -- Yes shows the name and phone on the QR page
  status        hostel.assignment_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (to_date IS NULL OR to_date >= from_date),
  CHECK (status = 'Active' OR to_date IS NOT NULL),
  -- the same person cannot hold the same role for the same place and shift twice in overlapping periods
  EXCLUDE USING gist (staff_id WITH =, hostel_role WITH =, facility_id WITH =,
                      coalesce(zone_id,'') WITH =, coalesce(space_id,'') WITH =, shift WITH =,
                      daterange(from_date, coalesce(to_date, 'infinity'::date), '[]') WITH &&)
);
COMMENT ON TABLE hostel.staff_space_assignment IS 'B1 — Level 1 and Level 2 approvers are found by looking up this table for the student''s floor and hostel; no approver name is stored on the student';
CREATE INDEX ix_assignment_lookup ON hostel.staff_space_assignment (facility_id, zone_id, hostel_role) WHERE status = 'Active';

-- ---------- B2 Space_QR: QR label issued for a room, toilet block, common area or store ----------
CREATE TABLE hostel.space_qr (
  qr_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id     varchar(30) NOT NULL REFERENCES infra.space,
  qr_token     varchar(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),   -- random code inside the QR; reveals nothing if photographed
  generated_on timestamptz NOT NULL DEFAULT now(),
  printed_on   timestamptz,
  status       hostel.qr_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20)
);
CREATE UNIQUE INDEX ux_space_qr_active ON hostel.space_qr (space_id) WHERE status = 'Active';   -- rule: one Active label per space
