-- =====================================================================
-- 103  Weekly food choice, 3 Oct 2026.
--   A student may change their food (South Indian, North Indian, or their country for foreign students) and diet
--   (Veg, Non-veg) every week. A change asked for during the week applies from the next Monday, so the mess knows
--   next week's numbers in advance; until then the student may change it again or withdraw it.
--   Each Friday every resident gets a reminder with next week's choice; on Monday the changes are applied.
--   Local or foreign: a student is foreign when their nationality is not Indian, or they live in an apartment.
-- =====================================================================

CREATE TABLE hostel.food_choice_change (
  change_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  region           varchar(15) NOT NULL CHECK (region IN ('South', 'North', 'International')),
  diet             varchar(10) NOT NULL CHECK (diet IN ('Veg', 'Non_Veg')),
  country          varchar(60),
  effective_from   date NOT NULL CHECK (extract(isodow FROM effective_from) = 1),
  status           varchar(10) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Applied', 'Withdrawn')),
  requested_at     timestamptz NOT NULL DEFAULT now(),
  applied_at       timestamptz,
  created_by       varchar(20),
  CONSTRAINT ck_food_change_country CHECK ((region = 'International') = (country IS NOT NULL))
);
COMMENT ON TABLE hostel.food_choice_change IS 'A student''s change of food style or diet; applies from the Monday after it is asked for';
CREATE UNIQUE INDEX ux_food_change_pending ON hostel.food_choice_change (student_id) WHERE status = 'Pending';
CREATE TRIGGER trg_audit_food_choice_change AFTER INSERT OR UPDATE OR DELETE ON hostel.food_choice_change FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('change_id');

-- Local or foreign student
CREATE OR REPLACE FUNCTION hostel.fn_is_foreign(p_nationality text, p_accommodation text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(p_accommodation = 'Apartment', false)
      OR (p_nationality IS NOT NULL AND trim(p_nationality) <> '' AND lower(trim(p_nationality)) NOT IN ('indian', 'india'));
$$;

-- The approved menu for one kind of student: own mess before all messes, own hostel gender before 'Any'.
CREATE OR REPLACE FUNCTION hostel.fn_match_menu(p_gender text, p_region text, p_diet text, p_country text, p_mess bigint, p_on date DEFAULT current_date)
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT c.cycle_id FROM hostel.menu_cycle c
   WHERE c.status = 'Approved' AND c.effective_from <= p_on AND c.region = p_region AND c.diet = p_diet
     AND c.country IS NOT DISTINCT FROM (CASE WHEN p_region = 'International' THEN p_country END)
     AND c.hostel_gender IN (p_gender, 'Any') AND (c.mess_id IS NULL OR c.mess_id = p_mess)
   ORDER BY (c.mess_id IS NOT NULL) DESC, (c.hostel_gender = p_gender) DESC, c.effective_from DESC LIMIT 1;
$$;

-- Each resident with this week's choice and menu, and next week's (after a pending change, if any).
DROP VIEW IF EXISTS hostel.v_student_menu;
CREATE VIEW hostel.v_student_menu AS
WITH s AS (
  SELECT a.student_id, b.facility_id, b.hostel_code, hp.hostel_gender::text AS hostel_gender, hp.accommodation_type,
         coalesce(ms.mess_id, hp.default_mess_id) AS mess_id, ms.subscription_id,
         coalesce(ms.region, 'South') AS region, coalesce(ms.diet, 'Veg') AS diet, ms.country, sm.nationality,
         hostel.fn_is_foreign(sm.nationality, hp.accommodation_type) AS is_foreign
    FROM hostel.hostel_allocation a
    JOIN hostel.v_bed b ON b.subspace_id = a.subspace_id
    JOIN hostel.hostel_profile hp ON hp.facility_id = b.facility_id
    JOIN ref.student_master sm ON sm.student_id = a.student_id
    LEFT JOIN LATERAL (
      SELECT x.* FROM hostel.mess_subscription x
       WHERE x.student_id = a.student_id AND x.status = 'Active'
       ORDER BY (x.academic_year = (SELECT academic_year FROM hostel.academic_year WHERE is_current)) DESC, x.from_date DESC LIMIT 1) ms ON true
   WHERE a.status = 'Active' AND a.occupant_type = 'Student')
SELECT s.*, c.cycle_id, c.title AS menu_title,
       p.change_id AS pending_change_id, p.effective_from AS change_from,
       coalesce(p.region, s.region) AS next_region, coalesce(p.diet, s.diet) AS next_diet,
       CASE WHEN p.change_id IS NOT NULL THEN p.country ELSE s.country END AS next_country,
       hostel.fn_match_menu(s.hostel_gender, coalesce(p.region, s.region), coalesce(p.diet, s.diet),
                            CASE WHEN p.change_id IS NOT NULL THEN p.country ELSE s.country END, s.mess_id,
                            coalesce(p.effective_from, current_date)) AS next_cycle_id
  FROM s
  LEFT JOIN hostel.menu_cycle c ON c.cycle_id = hostel.fn_match_menu(s.hostel_gender, s.region, s.diet, s.country, s.mess_id)
  LEFT JOIN hostel.food_choice_change p ON p.student_id = s.student_id AND p.status = 'Pending';
COMMENT ON VIEW hostel.v_student_menu IS 'Each resident: local or foreign, food choice and menu this week, and next week after a pending change';

-- Monday: pending changes take effect on the student''s active mess subscriptions.
CREATE OR REPLACE FUNCTION hostel.fn_apply_food_choices() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer := 0; r record;
BEGIN
  FOR r IN SELECT * FROM hostel.food_choice_change WHERE status = 'Pending' AND effective_from <= current_date FOR UPDATE LOOP
    UPDATE hostel.mess_subscription SET region = r.region, diet = r.diet, country = r.country,
           cuisine = (CASE r.region WHEN 'North' THEN 'North_Indian' WHEN 'South' THEN 'South_Indian' ELSE 'Special_Diet' END)::hostel.cuisine,
           updated_by = 'system'
     WHERE student_id = r.student_id AND status = 'Active';
    UPDATE hostel.food_choice_change SET status = 'Applied', applied_at = now() WHERE change_id = r.change_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Friday: every resident is reminded of next week's food, and that they may change it until Sunday night.
CREATE OR REPLACE FUNCTION hostel.fn_queue_menu_reminders() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
  SELECT 'Student', v.student_id, 'In_App', 'MENU_WEEKLY', 'Next week''s mess menu',
         'From Monday ' || to_char(current_date + (8 - extract(isodow FROM current_date))::int, 'DD Mon') || ' you eat '
         || coalesce(nc.title, 'the hostel''s menu') || '. Want something else? Change your food choice by Sunday night.',
         'menu_cycle', v.next_cycle_id::text
    FROM hostel.v_student_menu v LEFT JOIN hostel.menu_cycle nc ON nc.cycle_id = v.next_cycle_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
