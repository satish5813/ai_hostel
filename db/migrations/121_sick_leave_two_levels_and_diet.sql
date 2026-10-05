-- =====================================================================
-- 121  Sick leave: Floor Warden then building in-charge, and a sick diet to the room, 5 Oct 2026.
--   level 1  Floor Warden of the student's floor visits, records what they found, sets the diet and approves
--   level 2  the building in-charge (Warden of the hostel) approves; meals then go to the room
--   A hostel without a Floor Warden on that floor, or without a Warden, has the Chief Warden take that step,
--   so no request waits for nobody. Requests already in approval keep the steps they were created with.
--   Sick diet: Light (khichdi, idli, curd rice, soup), Liquid (soups, juice, buttermilk, ORS) or Normal.
--   It is set on the leave and copied to every room meal not yet served, so the Floor Warden or Warden can move a
--   student from liquid to light to normal as they recover; the mess sick list shows each student's diet.
-- =====================================================================
BEGIN;

-- the two levels
UPDATE shared.approval_rule SET status = 'Inactive' WHERE request_type = 'Sick_Leave' AND approver_role = 'Chief_Warden';
UPDATE shared.approval_rule SET status = 'Active', level = 1, step_name = 'Floor Warden visits and approves', is_final = false
 WHERE request_type = 'Sick_Leave' AND approver_role = 'Floor_Warden';
INSERT INTO shared.approval_rule (request_type, level, approver_role, step_name, is_final, status)
SELECT 'Sick_Leave', 2, 'Warden', 'Building in-charge approves', true, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM shared.approval_rule WHERE request_type = 'Sick_Leave' AND approver_role = 'Warden');

-- the diet
ALTER TABLE hostel.sick_leave ADD COLUMN IF NOT EXISTS diet varchar(6) NOT NULL DEFAULT 'Light' CHECK (diet IN ('Light', 'Liquid', 'Normal'));
ALTER TABLE hostel.sick_leave ADD COLUMN IF NOT EXISTS diet_note text;
ALTER TABLE hostel.sick_meal_delivery ADD COLUMN IF NOT EXISTS diet varchar(6) NOT NULL DEFAULT 'Light' CHECK (diet IN ('Light', 'Liquid', 'Normal'));
COMMENT ON COLUMN hostel.sick_leave.diet IS 'Food sent to the room: Light (khichdi, idli, curd rice, soup), Liquid (soups, juice, buttermilk, ORS) or Normal';
COMMENT ON COLUMN hostel.sick_leave.diet_note IS 'Anything the kitchen should know: no spice, no milk, what the doctor said';
COMMENT ON COLUMN hostel.sick_meal_delivery.diet IS 'Diet for this meal; follows the leave''s diet until the meal is served';

-- steps for the people who are actually there: the Chief Warden stands in for a missing Floor Warden or Warden
CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_after_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st record; has_fw boolean; has_wd boolean;
BEGIN
  SELECT * INTO st FROM hostel.fn_student_stay(NEW.student_id);
  has_fw := EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.hostel_role = 'Floor_Warden' AND a.status = 'Active'
                     AND a.facility_id = st.facility_id AND (a.zone_id IS NULL OR a.zone_id = st.zone_id));
  has_wd := EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.hostel_role IN ('Warden', 'Hostel_Incharge') AND a.status = 'Active' AND a.facility_id = st.facility_id);
  INSERT INTO shared.approval_step (request_type, request_id, level, rule_id, approver_role)
  SELECT 'Sick_Leave', NEW.sick_leave_id, r.level, r.rule_id,
         CASE WHEN r.approver_role = 'Floor_Warden' AND NOT has_fw THEN 'Chief_Warden'
              WHEN r.approver_role = 'Warden' AND NOT has_wd THEN 'Chief_Warden'
              ELSE r.approver_role END
  FROM shared.approval_rule r WHERE r.request_type = 'Sick_Leave' AND r.status = 'Active' ORDER BY r.level;
  RETURN NULL;
END $$;

-- approved by whoever took the last step: the Warden of the hostel, or the Chief Warden / Director standing in
CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_before_update() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_facility varchar;
BEGIN
  IF NEW.status = 'Approved' AND OLD.status <> 'Approved' THEN
    SELECT facility_id INTO v_facility FROM hostel.fn_student_stay(NEW.student_id);
    IF NEW.approved_by IS NULL OR NOT (hostel.fn_staff_has_role(NEW.approved_by, 'Warden', v_facility) OR hostel.fn_staff_has_role(NEW.approved_by, 'Hostel_Incharge', v_facility)
        OR hostel.fn_staff_has_role(NEW.approved_by, 'Chief_Warden', v_facility)
        OR EXISTS (SELECT 1 FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id WHERE u.staff_id = NEW.approved_by AND ur.role_code = 'Director_Hostels')) THEN
      RAISE EXCEPTION 'Only the building in-charge of hostel % can approve a sick leave', v_facility USING ERRCODE = 'check_violation';
    END IF;
    NEW.room_meals_required := true;
  END IF;
  -- a new diet applies to every room meal not yet served
  IF NEW.diet IS DISTINCT FROM OLD.diet AND NEW.status IN ('Applied', 'Recommended', 'Approved') THEN
    UPDATE hostel.sick_meal_delivery SET diet = NEW.diet, updated_by = NEW.updated_by WHERE sick_leave_id = NEW.sick_leave_id AND status = 'Pending';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sick_leave_before_update ON hostel.sick_leave;
CREATE TRIGGER trg_sick_leave_before_update BEFORE UPDATE OF status, diet ON hostel.sick_leave FOR EACH ROW EXECUTE FUNCTION hostel.fn_sick_leave_before_update();

-- one sick leave at a time: a new one (or an extension) may not overlap a leave still open, so no meal goes to the room twice
CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_no_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o hostel.sick_leave%ROWTYPE;
BEGIN
  SELECT * INTO o FROM hostel.sick_leave l WHERE l.student_id = NEW.student_id AND l.status IN ('Applied', 'Recommended', 'Approved')
     AND l.from_date <= NEW.to_date AND l.to_date >= NEW.from_date LIMIT 1;
  IF o.sick_leave_id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have sick leave from % to %; ask for an extension from %', to_char(o.from_date, 'DD Mon'), to_char(o.to_date, 'DD Mon'), to_char(o.to_date + 1, 'DD Mon')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sick_leave_no_overlap ON hostel.sick_leave;
CREATE TRIGGER trg_sick_leave_no_overlap BEFORE INSERT ON hostel.sick_leave FOR EACH ROW EXECUTE FUNCTION hostel.fn_sick_leave_no_overlap();

-- room meals carry the leave's diet from the start
CREATE OR REPLACE FUNCTION hostel.fn_sick_leave_after_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status <> 'Approved' THEN
    INSERT INTO hostel.sick_meal_delivery (sick_leave_id, meal_date, slot, diet, created_by)
    SELECT NEW.sick_leave_id, d::date, s, NEW.diet, NEW.updated_by
    FROM generate_series(NEW.from_date, NEW.to_date, interval '1 day') d CROSS JOIN unnest(enum_range(NULL::hostel.meal_slot)) s
    ON CONFLICT DO NOTHING;
    INSERT INTO hostel.student_current_status (student_id, current_status) VALUES (NEW.student_id, 'On_Sick_Leave')
      ON CONFLICT (student_id) DO UPDATE SET current_status = 'On_Sick_Leave', updated_at = now();
  END IF;
  IF NEW.status = 'Closed' AND OLD.status <> 'Closed' THEN
    UPDATE hostel.sick_meal_delivery SET status = 'Not_Required' WHERE sick_leave_id = NEW.sick_leave_id AND status = 'Pending' AND meal_date > NEW.closed_on;
    UPDATE hostel.student_current_status SET current_status = 'In_Hostel', updated_at = now() WHERE student_id = NEW.student_id AND current_status = 'On_Sick_Leave';
  END IF;
  RETURN NULL;
END $$;

-- 111 again, sick leave part only: approved when the last step is approved, recommended before that
DO $do$
DECLARE s text; a text; b text;
BEGIN
  s := pg_get_functiondef('hostel.fn_approval_step_after()'::regprocedure);
  a := $a$    ELSIF NEW.approver_role = 'Chief_Warden' THEN
      UPDATE hostel.sick_leave SET status = 'Approved', approved_by = NEW.acted_by, updated_at = now() WHERE sick_leave_id = NEW.request_id;
    ELSE
      UPDATE hostel.sick_leave SET status = 'Recommended', updated_at = now() WHERE sick_leave_id = NEW.request_id AND status = 'Applied';
    END IF;$a$;
  b := $b$    ELSIF NOT EXISTS (SELECT 1 FROM shared.approval_step p WHERE p.request_type = 'Sick_Leave' AND p.request_id = NEW.request_id AND p.decision = 'Pending') THEN
      UPDATE hostel.sick_leave SET status = 'Approved', approved_by = NEW.acted_by, updated_by = NEW.acted_by, updated_at = now() WHERE sick_leave_id = NEW.request_id;
    ELSE
      UPDATE hostel.sick_leave SET status = 'Recommended', updated_at = now() WHERE sick_leave_id = NEW.request_id AND status = 'Applied';
    END IF;$b$;
  IF position(a IN s) = 0 THEN RAISE EXCEPTION 'fn_approval_step_after: sick leave branch not found'; END IF;
  EXECUTE replace(s, a, b);
END $do$;

-- the mess sick list shows the diet and the kitchen's note
CREATE OR REPLACE VIEW hostel.v_mess_sick_list AS
SELECT d.meal_date, d.slot, sl.sick_leave_id, sl.student_id, sm.full_name, st.facility_id, st.space_id, ms.mess_id, ms.cuisine,
       d.status, d.delivered_by, d.delivered_at, d.diet, sl.diet_note
FROM hostel.sick_meal_delivery d
JOIN hostel.sick_leave sl ON sl.sick_leave_id = d.sick_leave_id AND sl.status = 'Approved'
JOIN ref.student_master sm ON sm.student_id = sl.student_id
LEFT JOIN LATERAL hostel.fn_student_stay(sl.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true
LEFT JOIN hostel.mess_subscription ms ON ms.student_id = sl.student_id AND ms.status = 'Active';

-- the SMS sick list names each student's diet instead of their cuisine
DO $do$
DECLARE s text;
BEGIN
  s := pg_get_functiondef('hostel.fn_queue_sick_lists(hostel.meal_slot)'::regprocedure);
  s := replace(s, $x$coalesce(' (' || l.cuisine::text || ')', '')$x$, $x$' (' || lower(l.diet) || coalesce(', ' || l.diet_note, '') || ')'$x$);
  EXECUTE s;
END $do$;

COMMIT;
