-- =====================================================================
-- 056  hostel — Workflow F: Sick leave (NEW)
--      Apply > Floor Warden verifies in person > Chief Warden approves > Mess sick list > Food to the room > Leave ends
--      Tables F1 Sick_Leave, F2 Sick_Meal_Delivery.  Approvals: shared.approval_step (request_type = Sick_Leave, 2 levels)
-- =====================================================================

CREATE TYPE hostel.sick_leave_status AS ENUM ('Applied','Recommended','Approved','Rejected','Closed');
CREATE TYPE hostel.meal_slot         AS ENUM ('Breakfast','Lunch','Evening_Snacks','Dinner');
CREATE TYPE hostel.delivery_status   AS ENUM ('Pending','Delivered','Not_Required','Missed');

-- ---------- F1 Sick_Leave: sick leave request of a student ----------
CREATE TABLE hostel.sick_leave (
  sick_leave_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id          varchar(20) NOT NULL REFERENCES ref.student_master,
  illness_details     text NOT NULL,                         -- what the student reports
  from_date           date NOT NULL,
  to_date             date NOT NULL,
  applied_on          timestamptz NOT NULL DEFAULT now(),
  medical_doc_id      uuid REFERENCES shared.document,       -- doctor's note, if any
  visited_by          varchar(20) REFERENCES ref.staff_master,   -- Floor Warden who visited (to recommend)
  visited_at          timestamptz,
  visit_remarks       text,                                  -- what the Floor Warden found
  room_meals_required boolean NOT NULL DEFAULT false,        -- Yes once approved; puts the student on the mess sick list
  extended_from_id    bigint REFERENCES hostel.sick_leave,   -- earlier leave, when this one is an extension
  approved_by         varchar(20) REFERENCES ref.staff_master,   -- Chief Warden only
  closed_on           date,                                  -- day the leave ended
  status              hostel.sick_leave_status NOT NULL DEFAULT 'Applied',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (to_date >= from_date),
  -- rule: cannot be Recommended (or beyond) without the Floor Warden's visit
  CHECK (status IN ('Applied','Rejected') OR (visited_by IS NOT NULL AND visited_at IS NOT NULL AND visit_remarks IS NOT NULL)),
  CHECK (status <> 'Approved' OR approved_by IS NOT NULL),
  CHECK (status <> 'Closed' OR closed_on IS NOT NULL)
);
CREATE INDEX ix_sick_leave_student ON hostel.sick_leave (student_id, from_date DESC);
CREATE INDEX ix_sick_leave_active  ON hostel.sick_leave (from_date, to_date) WHERE status = 'Approved';

-- ---------- F2 Sick_Meal_Delivery: meal taken to a sick student's room (one row per slot per day of the leave) ----------
CREATE TABLE hostel.sick_meal_delivery (
  sick_leave_id bigint NOT NULL REFERENCES hostel.sick_leave ON DELETE CASCADE,
  meal_date     date NOT NULL,
  slot          hostel.meal_slot NOT NULL,
  delivered_by  varchar(20) REFERENCES ref.staff_master,     -- who took the food (required when Delivered)
  delivered_at  timestamptz,
  status        hostel.delivery_status NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  PRIMARY KEY (sick_leave_id, meal_date, slot),
  CHECK (status <> 'Delivered' OR (delivered_by IS NOT NULL AND delivered_at IS NOT NULL))
);
