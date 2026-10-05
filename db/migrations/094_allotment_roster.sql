-- =====================================================================
-- 094  Room blocking, student room choice, warden fee check, staff attendance and the daily duty roster
--      (2 Oct 2026, from the Chief Warden / allotment / mapping review)
--
--   * The Chief Warden blocks rooms by hand (quota, sports, guests, medical ...). Blocked rooms are hidden from the
--     students' room choice and from automatic allotment; only a named staff member can still offer a bed in them.
--   * After the registration fee is paid the student sees the remaining rooms of the hostel and room type chosen,
--     picks a bed, and pays the hostel and mess fees.
--   * A Warden checks the fees against the receipts before check-in (fee_check_status on the registration).
--   * Wardens, Floor Wardens, sweepers, scavengers and guards are marked present each day; the roster then gives
--     every floor and washroom a person, covering an absent person from those present.
-- =====================================================================

-- roles for the people the roster schedules
INSERT INTO portal.role (role_code, name, module) VALUES
  ('Sweeper',   'Sweeper (floors and corridors)', 'hostel'),
  ('Scavenger', 'Scavenger (washrooms)',          'hostel')
ON CONFLICT (role_code) DO NOTHING;

-- ---------- Room blocking ----------
CREATE TYPE hostel.block_reason AS ENUM ('Management_Quota','Sports','International','Medical','Staff','Guest','Maintenance','Other');
CREATE TYPE hostel.block_status AS ENUM ('Blocked','Released');

CREATE TABLE hostel.room_block (
  block_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id      varchar(30) NOT NULL REFERENCES infra.space,    -- the room; all its beds are blocked
  reason        hostel.block_reason NOT NULL,
  remarks       text,
  blocked_by    varchar(20) NOT NULL REFERENCES ref.staff_master,
  blocked_on    timestamptz NOT NULL DEFAULT now(),
  until_date    date,                                          -- empty: until released
  released_by   varchar(20) REFERENCES ref.staff_master,
  released_on   timestamptz,
  status        hostel.block_status NOT NULL DEFAULT 'Blocked',
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK (status = 'Blocked' OR (released_by IS NOT NULL AND released_on IS NOT NULL)),
  CHECK (reason <> 'Other' OR remarks IS NOT NULL)
);
CREATE UNIQUE INDEX ux_room_block_active ON hostel.room_block (space_id) WHERE status = 'Blocked';
COMMENT ON TABLE hostel.room_block IS 'Rooms the Chief Warden keeps out of the students'' choice and automatic allotment';

-- v_bed gains the block (columns appended; dependants keep working)
CREATE OR REPLACE VIEW hostel.v_bed AS
SELECT ss.subspace_id, ss.subspace_code AS bed_code, ss.status AS bed_status,
       s.space_id, s.space_code AS room_code, s.space_name AS room_name, s.status AS room_status,
       z.zone_id, z.zone_name AS floor_name, z.sequence_no AS floor_no,
       f.facility_id, f.facility_name AS hostel_name, hp.hostel_code, hp.hostel_gender,
       rp.room_type_id, rt.type_name, rt.sharing_count, rt.is_ac, rp.is_accessible, rp.reserved_for,
       a.hostel_alloc_id, a.occupant_type, a.student_id, a.staff_id, a.allocation_date,
       (k.block_id IS NOT NULL) AS is_blocked, k.reason AS block_reason
FROM infra.subspace ss
JOIN infra.space s ON s.space_id = ss.space_id
JOIN infra.zone z ON z.zone_id = s.zone_id
JOIN infra.facility f ON f.facility_id = z.facility_id
JOIN hostel.hostel_profile hp ON hp.facility_id = f.facility_id
LEFT JOIN hostel.room_profile rp ON rp.space_id = s.space_id
LEFT JOIN hostel.room_type rt ON rt.room_type_id = rp.room_type_id
LEFT JOIN hostel.hostel_allocation a ON a.subspace_id = ss.subspace_id AND a.status = 'Active'
LEFT JOIN hostel.room_block k ON k.space_id = s.space_id AND k.status = 'Blocked'
WHERE ss.subspace_type = 'Bed' AND s.space_category = 'Hostel_Room';

CREATE OR REPLACE VIEW hostel.v_vacancy AS
SELECT facility_id, hostel_name, hostel_code, hostel_gender, room_type_id, type_name,
       count(*) FILTER (WHERE bed_status = 'Vacant' AND room_status <> 'Under_Maintenance' AND reserved_for = 'None' AND NOT is_blocked) AS vacant_beds,
       count(*) FILTER (WHERE bed_status = 'Held') AS held_beds,
       count(*) FILTER (WHERE bed_status = 'Occupied') AS occupied_beds,
       count(*) AS total_beds,
       count(*) FILTER (WHERE is_blocked AND bed_status = 'Vacant') AS blocked_beds
FROM hostel.v_bed GROUP BY 1,2,3,4,5,6;

-- ---------- Warden fee check ----------
ALTER TABLE hostel.hostel_registration
  ADD COLUMN fee_check_status varchar(10) NOT NULL DEFAULT 'Pending' CHECK (fee_check_status IN ('Pending','Verified','Query')),
  ADD COLUMN fee_checked_by   varchar(20) REFERENCES ref.staff_master,
  ADD COLUMN fee_checked_on   timestamptz,
  ADD COLUMN fee_check_remarks text,
  ADD CONSTRAINT ck_fee_check CHECK (fee_check_status = 'Pending' OR (fee_checked_by IS NOT NULL AND fee_checked_on IS NOT NULL)),
  ADD CONSTRAINT ck_fee_query CHECK (fee_check_status <> 'Query' OR fee_check_remarks IS NOT NULL);
-- students already in a room were checked under the old flow
UPDATE hostel.hostel_registration SET fee_check_status = 'Verified', fee_checked_by = (SELECT checked_in_by FROM hostel.hostel_allocation a JOIN hostel.room_offer o ON o.offer_id = a.offer_id WHERE o.registration_id = hostel_registration.registration_id LIMIT 1),
  fee_checked_on = now(), fee_check_remarks = 'Checked in before the fee check existed'
WHERE status = 'Checked_In';

-- A: a room offer needs the registration fee Paid (or Waived for a mapped resident); a blocked room is offered only by a named staff member
CREATE OR REPLACE FUNCTION hostel.fn_room_offer_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; d hostel.demand_status; loc record; v_hours numeric;
BEGIN
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  SELECT status INTO d FROM hostel.fee_demand WHERE demand_id = r.reg_demand_id;
  IF d IS DISTINCT FROM 'Paid' AND d IS DISTINCT FROM 'Waived' THEN
    RAISE EXCEPTION 'Registration % : registration fee is not paid (demand status %)', r.registration_no, d USING ERRCODE = 'check_violation';
  END IF;
  IF r.status NOT IN ('Fee_Paid','Waitlisted','Allotted') THEN
    RAISE EXCEPTION 'Registration % is % and cannot receive an offer', r.registration_no, r.status USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO loc FROM hostel.fn_bed_location(NEW.subspace_id);
  IF loc.space_status = 'Under_Maintenance' THEN RAISE EXCEPTION 'Bed % is in a room under maintenance', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.bed_status <> 'Vacant' THEN RAISE EXCEPTION 'Bed % is % and cannot be offered', NEW.subspace_id, loc.bed_status USING ERRCODE = 'check_violation'; END IF;
  IF loc.facility_id <> r.facility_id THEN RAISE EXCEPTION 'Bed % is not in hostel %', NEW.subspace_id, r.facility_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.room_type_id IS DISTINCT FROM r.room_type_id THEN RAISE EXCEPTION 'Bed % is not of the room type chosen', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF NEW.offered_by IS NULL AND EXISTS (SELECT 1 FROM hostel.room_block k WHERE k.space_id = loc.space_id AND k.status = 'Blocked') THEN
    RAISE EXCEPTION 'Room % is blocked by the Chief Warden', loc.space_id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE subspace_id = NEW.subspace_id AND status = 'Active') THEN
    RAISE EXCEPTION 'Bed % has an active allocation', NEW.subspace_id USING ERRCODE = 'check_violation';
  END IF;
  NEW.offer_no := coalesce((SELECT max(offer_no) FROM hostel.room_offer WHERE registration_id = NEW.registration_id), 0) + 1;
  SELECT amount INTO v_hours FROM shared.policy_setting WHERE setting_key = 'offer_hold_hours';
  NEW.hold_until := NEW.offered_on + make_interval(hours => coalesce(v_hours, 48)::int);
  UPDATE infra.subspace SET status = 'Held' WHERE subspace_id = NEW.subspace_id;
  UPDATE hostel.hostel_registration SET status = 'Allotted', waitlist_no = NULL WHERE registration_id = NEW.registration_id AND status <> 'Allotted';
  RETURN NEW;
END $$;

-- A: check-in needs the Warden's fee check
CREATE OR REPLACE FUNCTION hostel.fn_allocation_fee_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_check varchar; v_no varchar;
BEGIN
  IF NEW.occupant_type = 'Student' AND NEW.offer_id IS NOT NULL THEN
    SELECT r.fee_check_status, r.registration_no INTO v_check, v_no FROM hostel.room_offer o JOIN hostel.hostel_registration r ON r.registration_id = o.registration_id WHERE o.offer_id = NEW.offer_id;
    IF v_check IS DISTINCT FROM 'Verified' THEN
      RAISE EXCEPTION 'Registration %: the Warden has not verified the fees yet', v_no USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_allocation_fee_check BEFORE INSERT ON hostel.hostel_allocation FOR EACH ROW EXECUTE FUNCTION hostel.fn_allocation_fee_check();

-- Mapping from a file: a student already living in a bed (first go-live, or a correction) becomes a registration,
-- an accepted offer and an active stay in one step. The registration fee is Waived, the fee check is Verified.
CREATE OR REPLACE FUNCTION hostel.fn_map_student_bed(p_student varchar, p_bed varchar, p_year varchar, p_key varchar, p_date date, p_by varchar)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE loc record; v_reg bigint; v_offer bigint; v_alloc bigint;
BEGIN
  SELECT * INTO loc FROM hostel.fn_bed_location(p_bed);
  IF loc.facility_id IS NULL THEN RAISE EXCEPTION 'Bed % does not exist', p_bed USING ERRCODE = 'check_violation'; END IF;
  IF loc.room_type_id IS NULL THEN RAISE EXCEPTION 'Room of bed % has no room type', p_bed USING ERRCODE = 'check_violation'; END IF;
  IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = p_student AND status = 'Active') THEN
    RAISE EXCEPTION 'Student % already has a bed', p_student USING ERRCODE = 'check_violation';
  END IF;
  SELECT registration_id INTO v_reg FROM hostel.hostel_registration WHERE student_id = p_student AND academic_year = p_year;
  IF v_reg IS NULL THEN
    INSERT INTO hostel.hostel_registration (student_id, academic_year, facility_id, room_type_id, rules_accepted, remarks, created_by)
    VALUES (p_student, p_year, loc.facility_id, loc.room_type_id, true, 'Mapped from a file', p_by) RETURNING registration_id INTO v_reg;
  ELSE
    UPDATE hostel.hostel_registration SET facility_id = loc.facility_id, room_type_id = loc.room_type_id, updated_by = p_by WHERE registration_id = v_reg AND status IN ('Applied','Fee_Paid','Waitlisted');
  END IF;
  UPDATE hostel.fee_demand d SET status = 'Waived', updated_by = p_by FROM hostel.hostel_registration r
    WHERE r.registration_id = v_reg AND d.demand_id = r.reg_demand_id AND d.status IN ('Pending','Overdue');
  UPDATE hostel.hostel_registration SET status = 'Fee_Paid' WHERE registration_id = v_reg AND status = 'Applied';
  INSERT INTO hostel.room_offer (registration_id, subspace_id, offer_no, hold_until, offered_by, created_by)
  VALUES (v_reg, p_bed, 0, now() + interval '1 day', p_by, p_by) RETURNING offer_id INTO v_offer;
  UPDATE hostel.room_offer SET student_decision = 'Accepted', updated_by = p_by WHERE offer_id = v_offer;
  UPDATE hostel.hostel_registration SET fee_check_status = 'Verified', fee_checked_by = p_by, fee_checked_on = now(), fee_check_remarks = 'Mapped from a file' WHERE registration_id = v_reg;
  INSERT INTO hostel.hostel_allocation (occupant_type, student_id, subspace_id, offer_id, academic_year, allocation_date, key_no, checked_in_by, created_by)
  VALUES ('Student', p_student, p_bed, v_offer, p_year, coalesce(p_date, current_date), coalesce(nullif(p_key, ''), 'NA'), p_by, p_by) RETURNING hostel_alloc_id INTO v_alloc;
  RETURN v_alloc;
END $$;

-- ---------- Staff attendance and the daily duty roster ----------
CREATE TYPE hostel.staff_day_status AS ENUM ('Present','Absent','Leave','Half_Day','Week_Off');
CREATE TYPE hostel.duty_source      AS ENUM ('Regular','Cover','Manual','Open');

CREATE TABLE hostel.staff_attendance (
  att_date    date NOT NULL,
  staff_id    varchar(20) NOT NULL REFERENCES ref.staff_master,
  facility_id varchar(30) NOT NULL REFERENCES hostel.hostel_profile,   -- hostel where the person reported
  status      hostel.staff_day_status NOT NULL,
  in_time     time,                                          -- when marked present
  remarks     text,
  marked_by   varchar(20) NOT NULL REFERENCES ref.staff_master,
  marked_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (att_date, staff_id)
);
CREATE INDEX ix_staff_attendance_hostel ON hostel.staff_attendance (facility_id, att_date);

CREATE TABLE hostel.daily_duty (
  duty_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  duty_date   date NOT NULL,
  facility_id varchar(30) NOT NULL REFERENCES hostel.hostel_profile,
  zone_id     varchar(30) REFERENCES infra.zone,             -- floor; empty for the whole hostel
  space_id    varchar(30) REFERENCES infra.space,            -- a washroom block or other area
  hostel_role varchar(30) NOT NULL REFERENCES portal.role,
  shift       hostel.shift NOT NULL DEFAULT 'General',
  staff_id    varchar(20) REFERENCES ref.staff_master,       -- empty: nobody available (Open)
  regular_staff_id varchar(20) REFERENCES ref.staff_master,  -- the person mapped to this place (MAP-02)
  source      hostel.duty_source NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20), updated_at timestamptz, updated_by varchar(20),
  CHECK ((source = 'Open') = (staff_id IS NULL))
);
CREATE UNIQUE INDEX ux_daily_duty_slot ON hostel.daily_duty (duty_date, facility_id, coalesce(zone_id, ''), coalesce(space_id, ''), hostel_role, shift);
CREATE INDEX ix_daily_duty_staff ON hostel.daily_duty (staff_id, duty_date);

-- audit like the other operational tables
CREATE TRIGGER trg_audit_room_block AFTER INSERT OR UPDATE OR DELETE ON hostel.room_block FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('block_id');
CREATE TRIGGER trg_audit_daily_duty AFTER INSERT OR UPDATE OR DELETE ON hostel.daily_duty FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('duty_id');

-- the upload sources for the two new files
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Hostel_Bed_Map';

-- v_registration carries the fee check (columns appended)
CREATE OR REPLACE VIEW hostel.v_registration AS
SELECT r.registration_id, r.registration_no, r.student_id, sm.full_name, sm.gender, sm.programme, r.academic_year,
       r.facility_id, hp.hostel_code, r.room_type_id, rt.type_name, r.status, r.applied_on, r.waitlist_no,
       rd.status AS registration_fee_status, rd.amount_due AS registration_fee,
       fp.fee_plan_id, fp.plan_type, fp.status AS plan_status,
       (SELECT coalesce(sum(amount_due),0) FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_due,
       (SELECT coalesce(sum(amount_paid),0) FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_paid,
       o.offer_id, o.subspace_id, o.student_decision, o.hold_until,
       a.hostel_alloc_id, a.allocation_date, a.key_no,
       r.fee_check_status, r.fee_check_remarks, f.facility_name AS hostel_name, (o.offer_id IS NOT NULL AND o.offered_by IS NULL) AS self_chosen
FROM hostel.hostel_registration r
JOIN ref.student_master sm ON sm.student_id = r.student_id
JOIN hostel.hostel_profile hp ON hp.facility_id = r.facility_id
JOIN infra.facility f ON f.facility_id = r.facility_id
JOIN hostel.room_type rt ON rt.room_type_id = r.room_type_id
LEFT JOIN hostel.fee_demand rd ON rd.demand_id = r.reg_demand_id
LEFT JOIN hostel.fee_plan fp ON fp.registration_id = r.registration_id
LEFT JOIN hostel.room_offer o ON o.registration_id = r.registration_id AND o.student_decision IN ('Pending','Accepted')
LEFT JOIN hostel.hostel_allocation a ON a.offer_id = o.offer_id;
