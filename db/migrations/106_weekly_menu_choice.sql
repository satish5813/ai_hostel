-- =====================================================================
-- 106  Weekly menu with the student's choice of dishes, 4 Oct 2026.
--   Every week the Mess In-charge or the Chef (Cook) writes next week's menu for a mess. Each meal has
--     * fixed items everyone gets, by food style: breakfast idli (South) or poha (North) every day; lunch and
--       dinner South Indian white rice and curd, North Indian pulka, white rice and curd (masters below, copied
--       into each week so a later change does not alter old weeks);
--     * courses with a choice of dishes: at breakfast two or three live-counter items (dosa, vada, puri ...),
--       made to order, so only what students choose is made; at lunch and dinner one curry with gravy, one stir
--       fry or deep fry, a ground chutney, a dal, and rasam or sambar. Each dish is North or South Indian (or
--       both) and Veg or Non-veg, so a student picks the style and diet per course.
--   The Mess In-charge publishes the week; students choose dish by dish until choices close, by default when
--   the Friday before the week begins. At closing, a student who did not choose a course gets the dish that fits
--   their food choice (food style and diet on the mess subscription; a veg student is never given non-veg),
--   except a live-counter item, which is not made for a student who did not ask for one.
--   The counts per dish are what the kitchen cooks and what the Pro-VC Finance and the mess see in the report.
-- =====================================================================

-- ---------- courses ----------
CREATE TABLE hostel.menu_course (
  course_code  varchar(20) PRIMARY KEY,
  course_name  varchar(60) NOT NULL,
  meals        hostel.meal_slot[] NOT NULL CHECK (cardinality(meals) > 0),
  can_skip     boolean NOT NULL DEFAULT false,
  default_on_close varchar(5) NOT NULL DEFAULT 'Match' CHECK (default_on_close IN ('Match', 'Skip')),
  min_options  smallint NOT NULL DEFAULT 1 CHECK (min_options >= 0),
  max_options  smallint CHECK (max_options >= min_options),
  sort_no      smallint NOT NULL,
  hint         varchar(200),
  active       boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_menu_course_skip CHECK (default_on_close = 'Match' OR can_skip)
);
COMMENT ON TABLE hostel.menu_course IS 'A course a student chooses a dish for, and the meals it is served at; can_skip = the student may say no to it';
COMMENT ON COLUMN hostel.menu_course.default_on_close IS 'Not chosen by closing: Match = the dish that fits the student''s food choice; Skip = none (made to order)';
COMMENT ON COLUMN hostel.menu_course.min_options IS 'Dishes a published week must offer for this course at each meal; max_options the most it may offer';
INSERT INTO hostel.menu_course (course_code, course_name, meals, can_skip, default_on_close, sort_no, hint) VALUES
  ('LIVE',         'Live counter',         '{Breakfast}',    true,  'Skip',  10, 'Made to order (dosa, vada, puri ...): only what students choose is made'),
  ('GRAVY',        'Curry with gravy',     '{Lunch,Dinner}', false, 'Match', 20, 'One curry: veg or non-veg, North or South Indian style'),
  ('FRY',          'Stir fry or deep fry', '{Lunch,Dinner}', false, 'Match', 30, 'One dry item: veg or non-veg'),
  ('DAL',          'Dal',                  '{Lunch,Dinner}', false, 'Match', 40, 'North Indian dal or South Indian pappu'),
  ('CHUTNEY',      'Ground chutney',       '{Lunch,Dinner}', true,  'Match', 50, 'Pachadi or chutney ground fresh; may be skipped'),
  ('RASAM_SAMBAR', 'Rasam or sambar',      '{Lunch,Dinner}', true,  'Match', 60, 'Choose rasam or sambar, or skip');
UPDATE hostel.menu_course SET min_options = 2, max_options = 3 WHERE course_code = 'LIVE';

-- ---------- fixed items (everyone of a food style gets them) ----------
CREATE TABLE hostel.menu_fixed_item (
  meal        hostel.meal_slot NOT NULL,
  cuisine     varchar(10) NOT NULL CHECK (cuisine IN ('South', 'North')),
  items       text NOT NULL CHECK (length(trim(items)) > 0),
  updated_at  timestamptz,
  updated_by  varchar(20),
  PRIMARY KEY (meal, cuisine)
);
COMMENT ON TABLE hostel.menu_fixed_item IS 'Standing items of a meal for a food style, copied into each new weekly menu';
INSERT INTO hostel.menu_fixed_item (meal, cuisine, items) VALUES
  ('Breakfast', 'South', 'Idli, Sambar, Coconut chutney, Tea, Coffee, Milk'), ('Breakfast', 'North', 'Poha, Tea, Coffee, Milk'),
  ('Lunch', 'South', 'White rice, Curd'),      ('Lunch', 'North', 'Pulka, White rice, Curd'),
  ('Dinner', 'South', 'White rice, Curd'),     ('Dinner', 'North', 'Pulka, White rice, Curd');

-- ---------- the week ----------
CREATE TABLE hostel.weekly_menu (
  week_id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mess_id           bigint NOT NULL REFERENCES hostel.mess_master(mess_id),
  week_start        date NOT NULL CHECK (extract(isodow FROM week_start) = 1),
  status            varchar(10) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Closed')),
  choices_close_at  timestamptz NOT NULL,
  notes             text,
  prepared_by       varchar(20) REFERENCES ref.staff_master(staff_id),
  published_by      varchar(20) REFERENCES ref.staff_master(staff_id),
  published_at      timestamptz,
  closed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        varchar(20),
  updated_at        timestamptz,
  updated_by        varchar(20),
  UNIQUE (mess_id, week_start),
  CONSTRAINT ck_weekly_menu_close CHECK (choices_close_at <= (week_start::timestamp AT TIME ZONE 'Asia/Kolkata')),
  CONSTRAINT ck_weekly_menu_published CHECK (status = 'Draft' OR published_at IS NOT NULL)
);
COMMENT ON TABLE hostel.weekly_menu IS 'One mess''s menu for one week (Monday to Sunday); students choose dishes until choices_close_at';
COMMENT ON COLUMN hostel.weekly_menu.choices_close_at IS 'Last moment students may choose; by default the start of the Friday before the week';

CREATE TABLE hostel.weekly_menu_fixed (
  week_id  bigint NOT NULL REFERENCES hostel.weekly_menu(week_id) ON DELETE CASCADE,
  meal     hostel.meal_slot NOT NULL,
  cuisine  varchar(10) NOT NULL CHECK (cuisine IN ('South', 'North')),
  items    text NOT NULL CHECK (length(trim(items)) > 0),
  PRIMARY KEY (week_id, meal, cuisine)
);
COMMENT ON TABLE hostel.weekly_menu_fixed IS 'Fixed items of one week''s meal for a food style (white rice and curd; pulka ...)';

CREATE TABLE hostel.weekly_menu_option (
  option_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_id      bigint NOT NULL REFERENCES hostel.weekly_menu(week_id) ON DELETE CASCADE,
  day_no       smallint NOT NULL CHECK (day_no BETWEEN 1 AND 7),
  meal         hostel.meal_slot NOT NULL,
  course_code  varchar(20) NOT NULL REFERENCES hostel.menu_course(course_code),
  dish         varchar(80) NOT NULL CHECK (length(trim(dish)) > 0),
  cuisine      varchar(10) NOT NULL CHECK (cuisine IN ('South', 'North', 'Both')),
  diet         varchar(10) NOT NULL CHECK (diet IN ('Veg', 'Non_Veg')),
  sort_no      smallint NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   varchar(20),
  updated_at   timestamptz,
  updated_by   varchar(20),
  UNIQUE (week_id, day_no, meal, course_code, dish),
  UNIQUE (option_id, week_id, day_no, meal, course_code)
);
COMMENT ON TABLE hostel.weekly_menu_option IS 'One dish a student may choose for a course of one meal on one day of a weekly menu';

CREATE TABLE hostel.weekly_menu_choice (
  week_id      bigint NOT NULL REFERENCES hostel.weekly_menu(week_id) ON DELETE CASCADE,
  student_id   varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  day_no       smallint NOT NULL CHECK (day_no BETWEEN 1 AND 7),
  meal         hostel.meal_slot NOT NULL,
  course_code  varchar(20) NOT NULL REFERENCES hostel.menu_course(course_code),
  option_id    bigint,
  source       varchar(10) NOT NULL DEFAULT 'Student' CHECK (source IN ('Student', 'Default')),
  chosen_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_id, student_id, day_no, meal, course_code),
  -- the dish must be one offered for this very course, meal and day of this week; NULL = skipped
  CONSTRAINT fk_choice_option FOREIGN KEY (option_id, week_id, day_no, meal, course_code)
    REFERENCES hostel.weekly_menu_option (option_id, week_id, day_no, meal, course_code)
);
COMMENT ON TABLE hostel.weekly_menu_choice IS 'A student''s dish for one course of one meal; option_id NULL = skipped; source Default = filled at closing';
CREATE INDEX ix_weekly_choice_option ON hostel.weekly_menu_choice (option_id);

CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON hostel.weekly_menu FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON hostel.weekly_menu_option FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON hostel.menu_fixed_item FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();
CREATE TRIGGER trg_audit_weekly_menu AFTER INSERT OR UPDATE OR DELETE ON hostel.weekly_menu FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('week_id');
CREATE TRIGGER trg_audit_weekly_menu_option AFTER INSERT OR UPDATE OR DELETE ON hostel.weekly_menu_option FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('option_id');

-- ---------- rules ----------
-- A closed week is history. A dish students already chose keeps its style and diet, and is not removed.
CREATE OR REPLACE FUNCTION hostel.fn_weekly_option_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st varchar; n integer;
BEGIN
  SELECT status INTO st FROM hostel.weekly_menu WHERE week_id = coalesce(NEW.week_id, OLD.week_id);
  IF st = 'Closed' THEN
    RAISE EXCEPTION 'Choices for this week are closed; its menu can no longer be changed' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP <> 'DELETE' AND NOT EXISTS (SELECT 1 FROM hostel.menu_course c WHERE c.course_code = NEW.course_code AND NEW.meal = ANY (c.meals) AND c.active) THEN
    RAISE EXCEPTION '% is not served at %', NEW.course_code, NEW.meal USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO n FROM hostel.weekly_menu_option o WHERE o.week_id = NEW.week_id AND o.day_no = NEW.day_no AND o.meal = NEW.meal AND o.course_code = NEW.course_code;
    IF n >= (SELECT max_options FROM hostel.menu_course WHERE course_code = NEW.course_code) THEN
      RAISE EXCEPTION 'At most % dishes for % at one meal', n, (SELECT lower(course_name) FROM hostel.menu_course WHERE course_code = NEW.course_code) USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    SELECT count(*) INTO n FROM hostel.weekly_menu_choice WHERE option_id = OLD.option_id;
    IF n > 0 AND TG_OP = 'DELETE' THEN
      RAISE EXCEPTION '% student(s) chose %; it cannot be removed', n, OLD.dish USING ERRCODE = 'P0001';
    END IF;
    IF n > 0 AND (NEW.cuisine <> OLD.cuisine OR NEW.diet <> OLD.diet OR NEW.day_no <> OLD.day_no OR NEW.meal <> OLD.meal OR NEW.course_code <> OLD.course_code) THEN
      RAISE EXCEPTION '% student(s) chose %; only its name can be corrected', n, OLD.dish USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER trg_weekly_option_guard BEFORE INSERT OR UPDATE OR DELETE ON hostel.weekly_menu_option FOR EACH ROW EXECUTE FUNCTION hostel.fn_weekly_option_guard();

CREATE OR REPLACE FUNCTION hostel.fn_weekly_fixed_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT status FROM hostel.weekly_menu WHERE week_id = coalesce(NEW.week_id, OLD.week_id)) = 'Closed' THEN
    RAISE EXCEPTION 'Choices for this week are closed; its menu can no longer be changed' USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER trg_weekly_fixed_guard BEFORE INSERT OR UPDATE OR DELETE ON hostel.weekly_menu_fixed FOR EACH ROW EXECUTE FUNCTION hostel.fn_weekly_fixed_guard();

-- Publishing needs enough dishes for every course on every day (min_options); it opens the week for choice.
CREATE OR REPLACE FUNCTION hostel.fn_weekly_menu_status() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE missing text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'Draft' AND NEW.status = 'Published' THEN
    IF NEW.choices_close_at <= now() THEN
      RAISE EXCEPTION 'The closing time for choices has passed; set a later one before publishing' USING ERRCODE = 'P0001';
    END IF;
    SELECT string_agg(to_char(DATE '2026-01-05' + d - 1, 'Dy') || ' ' || lower(m::text) || ' ' || lower(c.course_name)
                      || CASE WHEN c.min_options > 1 THEN ' (' || c.min_options || ')' ELSE '' END, ', ' ORDER BY d, m, c.sort_no) INTO missing
      FROM generate_series(1, 7) d CROSS JOIN hostel.menu_course c CROSS JOIN LATERAL unnest(c.meals) m
     WHERE c.active AND c.min_options > 0
       AND (SELECT count(*) FROM hostel.weekly_menu_option o WHERE o.week_id = NEW.week_id AND o.day_no = d AND o.meal = m AND o.course_code = c.course_code) < c.min_options;
    IF missing IS NOT NULL THEN
      RAISE EXCEPTION 'Add a dish for: %', left(missing, 300) USING ERRCODE = 'P0001';
    END IF;
    NEW.published_at := coalesce(NEW.published_at, now());
  ELSIF OLD.status = 'Published' AND NEW.status = 'Closed' THEN
    NEW.closed_at := coalesce(NEW.closed_at, now());
  ELSE
    RAISE EXCEPTION 'A weekly menu goes Draft, Published, Closed; not % to %', OLD.status, NEW.status USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_weekly_menu_status BEFORE UPDATE OF status ON hostel.weekly_menu FOR EACH ROW EXECUTE FUNCTION hostel.fn_weekly_menu_status();

-- A student chooses only while the week is open; a course is skipped only where the mess allows it.
CREATE OR REPLACE FUNCTION hostel.fn_weekly_choice_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w record; r record := coalesce(NEW, OLD);
BEGIN
  SELECT status, choices_close_at INTO w FROM hostel.weekly_menu WHERE week_id = r.week_id;
  IF current_setting('hostel.menu_closing', true) IS DISTINCT FROM 'on' THEN
    IF w.status <> 'Published' OR now() >= w.choices_close_at THEN
      RAISE EXCEPTION 'Choices for this week closed on %', to_char(w.choices_close_at AT TIME ZONE 'Asia/Kolkata' - interval '1 minute', 'Dy DD Mon, HH12:MI AM') USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.option_id IS NULL AND NOT (SELECT can_skip FROM hostel.menu_course WHERE course_code = NEW.course_code) THEN
    RAISE EXCEPTION 'Choose a dish for this course; it cannot be skipped' USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER trg_weekly_choice_guard BEFORE INSERT OR UPDATE OR DELETE ON hostel.weekly_menu_choice FOR EACH ROW EXECUTE FUNCTION hostel.fn_weekly_choice_guard();

-- ---------- what a student would be given ----------
-- The dish that fits a student's food style and diet: never non-veg for a veg student; their own style, then
-- a dish for both styles, then the other style; in the order the mess listed them.
CREATE OR REPLACE FUNCTION hostel.fn_default_option(p_week bigint, p_day int, p_meal hostel.meal_slot, p_course text, p_region text, p_diet text)
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT o.option_id FROM hostel.weekly_menu_option o
   WHERE o.week_id = p_week AND o.day_no = p_day AND o.meal = p_meal AND o.course_code = p_course
     AND (o.diet = 'Veg' OR p_diet = 'Non_Veg')
   ORDER BY (o.diet = p_diet) DESC,
            CASE o.cuisine WHEN (CASE p_region WHEN 'North' THEN 'North' ELSE 'South' END) THEN 0 WHEN 'Both' THEN 1 ELSE 2 END,
            o.sort_no, o.option_id
   LIMIT 1;
$$;

-- Residents of each mess with their food style and diet (the subscription's, after this week's change if any).
CREATE OR REPLACE VIEW hostel.v_mess_resident AS
SELECT v.student_id, v.mess_id, v.hostel_code, v.hostel_gender, v.region, v.diet,
       CASE v.region WHEN 'North' THEN 'North' ELSE 'South' END AS cuisine
  FROM hostel.v_student_menu v WHERE v.mess_id IS NOT NULL;
COMMENT ON VIEW hostel.v_mess_resident IS 'Each resident''s mess, food style (South or North for the fixed items) and diet';

-- Each slot of a week (day, meal, course with at least one dish) — what a student has to choose.
CREATE OR REPLACE VIEW hostel.v_weekly_menu_slot AS
SELECT DISTINCT o.week_id, o.day_no, o.meal, o.course_code, c.can_skip, c.default_on_close, c.sort_no
  FROM hostel.weekly_menu_option o JOIN hostel.menu_course c ON c.course_code = o.course_code;

-- Hourly: weeks whose choices have closed get the default dish for every slot left open,
-- then close. Returns the number of weeks closed.
CREATE OR REPLACE FUNCTION hostel.fn_close_weekly_menus() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE w record; n integer := 0;
BEGIN
  PERFORM set_config('hostel.menu_closing', 'on', true);
  FOR w IN SELECT * FROM hostel.weekly_menu WHERE status = 'Published' AND choices_close_at <= now() FOR UPDATE LOOP
    INSERT INTO hostel.weekly_menu_choice (week_id, student_id, day_no, meal, course_code, option_id, source)
    SELECT s.week_id, r.student_id, s.day_no, s.meal, s.course_code,
           CASE WHEN s.default_on_close = 'Match' THEN hostel.fn_default_option(s.week_id, s.day_no, s.meal, s.course_code, r.region, r.diet) END, 'Default'
      FROM hostel.v_weekly_menu_slot s
      JOIN hostel.v_mess_resident r ON r.mess_id = w.mess_id
     WHERE s.week_id = w.week_id
       AND NOT EXISTS (SELECT 1 FROM hostel.weekly_menu_choice c WHERE c.week_id = s.week_id AND c.student_id = r.student_id
                          AND c.day_no = s.day_no AND c.meal = s.meal AND c.course_code = s.course_code)
       -- a veg student with only non-veg on offer for a course that cannot be skipped is left for the mess to see
       AND (s.can_skip OR hostel.fn_default_option(s.week_id, s.day_no, s.meal, s.course_code, r.region, r.diet) IS NOT NULL);
    UPDATE hostel.weekly_menu SET status = 'Closed', updated_by = 'system' WHERE week_id = w.week_id;
    n := n + 1;
  END LOOP;
  PERFORM set_config('hostel.menu_closing', 'off', true);
  RETURN n;
END $$;

-- Reminder, once a day, to residents who have not chosen everything for a week that closes within two days.
CREATE OR REPLACE FUNCTION hostel.fn_queue_meal_choice_reminders() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
  SELECT 'Student', r.student_id, 'In_App', 'MEAL_CHOICE_DUE', 'Choose next week''s meals',
         'You have chosen ' || coalesce(ch.n, 0) || ' of ' || sl.n || ' dishes for the week from ' || to_char(w.week_start, 'DD Mon')
         || '. Choose by ' || to_char(w.choices_close_at AT TIME ZONE 'Asia/Kolkata' - interval '1 minute', 'Dy DD Mon, HH12:MI AM')
         || '; after that you get the dishes that fit your food choice.',
         'weekly_menu', w.week_id::text
    FROM hostel.weekly_menu w
    JOIN hostel.v_mess_resident r ON r.mess_id = w.mess_id
    CROSS JOIN LATERAL (SELECT count(*)::int AS n FROM hostel.v_weekly_menu_slot s WHERE s.week_id = w.week_id) sl
    LEFT JOIN LATERAL (SELECT count(*)::int AS n FROM hostel.weekly_menu_choice c WHERE c.week_id = w.week_id AND c.student_id = r.student_id) ch ON true
   WHERE w.status = 'Published' AND w.choices_close_at > now() AND w.choices_close_at <= now() + interval '2 days'
     AND coalesce(ch.n, 0) < sl.n
     AND NOT EXISTS (SELECT 1 FROM shared.notification x WHERE x.template_code = 'MEAL_CHOICE_DUE' AND x.student_id = r.student_id
                        AND x.related_id = w.week_id::text AND x.queued_at::date = current_date);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ---------- report ----------
-- Plates per dish: what students chose and what was filled in at closing.
CREATE OR REPLACE VIEW hostel.v_weekly_menu_dish_count AS
SELECT o.week_id, w.mess_id, w.week_start, o.day_no, o.meal, o.course_code, c.course_name, c.sort_no AS course_sort,
       o.option_id, o.dish, o.cuisine, o.diet,
       count(ch.student_id) FILTER (WHERE ch.source = 'Student')::int AS chosen,
       count(ch.student_id) FILTER (WHERE ch.source = 'Default')::int AS defaulted,
       count(ch.student_id)::int AS plates
  FROM hostel.weekly_menu_option o
  JOIN hostel.weekly_menu w ON w.week_id = o.week_id
  JOIN hostel.menu_course c ON c.course_code = o.course_code
  LEFT JOIN hostel.weekly_menu_choice ch ON ch.option_id = o.option_id
 GROUP BY o.week_id, w.mess_id, w.week_start, o.day_no, o.meal, o.course_code, c.course_name, c.sort_no, o.option_id, o.dish, o.cuisine, o.diet;
COMMENT ON VIEW hostel.v_weekly_menu_dish_count IS 'Plates of each dish of a weekly menu: chosen by students, and given by default at closing';

-- ---------- logins for the mess and the Pro-VC Finance ----------
INSERT INTO ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email)
SELECT 'S-CK', 'Mr.', 'Mess', 'Chef', 'Male', 'HOSTELS', 'Chef', '9000000014', 'Mess', NULL
 WHERE EXISTS (SELECT 1 FROM ref.department WHERE dept_code = 'HOSTELS')
ON CONFLICT (staff_id) DO NOTHING;
INSERT INTO portal.app_user (staff_id, full_name, email, title, home_dept)
SELECT staff_id, full_name, official_email, designation, dept_code FROM ref.staff_master WHERE staff_id = 'S-CK'
ON CONFLICT DO NOTHING;
INSERT INTO portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
SELECT u.user_id, 'Cook', 'HOSTELS', 'S-AD', 'HO/2026/ROLES/02' FROM portal.app_user u WHERE u.staff_id = 'S-CK'
ON CONFLICT DO NOTHING;
