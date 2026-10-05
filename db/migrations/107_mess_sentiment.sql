-- =====================================================================
-- 107  Mess sentiment, evening snacks in the weekly menu, choices entered by the Chief Chef, 4 Oct 2026.
--   * Students rate each dish they ate (1 to 5 stars, with an optional comment) for breakfast, lunch, evening
--     snacks and dinner, for up to three days after the meal. Each rating gets a sentiment (Positive, Neutral,
--     Negative) from the stars and the words of the comment (English, and common Telugu and Hindi words written
--     in English letters). The dashboard for the President, Vice President, Pro-VCs, Mess Supervisor, Chief Chef
--     and the mess shows it by dish, meal, day, week and month, for boys and girls.
--   * Evening snacks join the weekly menu as a course students choose (one or two snacks a day).
--   * The Chief Chef may enter or correct a student's choices for a week until that week begins (paper slips,
--     students without a phone). Such choices are marked Staff, with who entered them.
-- =====================================================================

-- ---------- Chief Chef ----------
INSERT INTO portal.role (role_code, name, module) VALUES ('Chief_Chef', 'Chief Chef', 'hostel') ON CONFLICT (role_code) DO NOTHING;

-- ---------- evening snacks ----------
INSERT INTO hostel.menu_course (course_code, course_name, meals, can_skip, default_on_close, min_options, max_options, sort_no, hint)
VALUES ('SNACK', 'Evening snack', '{Evening_Snacks}', true, 'Match', 1, 2, 70, 'One or two snacks with tea: samosa, punugulu, mirchi bajji, sprouts ...')
ON CONFLICT (course_code) DO NOTHING;
INSERT INTO hostel.menu_fixed_item (meal, cuisine, items) VALUES ('Evening_Snacks', 'South', 'Tea, Coffee'), ('Evening_Snacks', 'North', 'Tea, Coffee')
ON CONFLICT DO NOTHING;
-- weeks still open get the snack fixed items (the dishes are added by the mess)
INSERT INTO hostel.weekly_menu_fixed (week_id, meal, cuisine, items)
SELECT w.week_id, f.meal, f.cuisine, f.items FROM hostel.weekly_menu w CROSS JOIN hostel.menu_fixed_item f
 WHERE w.status <> 'Closed' AND f.meal = 'Evening_Snacks' ON CONFLICT DO NOTHING;

-- ---------- choices entered by staff ----------
ALTER TABLE hostel.weekly_menu_choice DROP CONSTRAINT IF EXISTS weekly_menu_choice_source_check;
ALTER TABLE hostel.weekly_menu_choice ADD CONSTRAINT weekly_menu_choice_source_check CHECK (source IN ('Student', 'Default', 'Staff'));
ALTER TABLE hostel.weekly_menu_choice ADD COLUMN IF NOT EXISTS entered_by varchar(20) REFERENCES ref.staff_master(staff_id);
ALTER TABLE hostel.weekly_menu_choice ADD CONSTRAINT ck_choice_entered_by CHECK ((source = 'Staff') = (entered_by IS NOT NULL));
COMMENT ON COLUMN hostel.weekly_menu_choice.entered_by IS 'The Chief Chef (or Mess In-charge) who entered the choice for the student; source = Staff';

-- Students choose while the week is open. Staff may enter a choice for a student until the week begins,
-- also after closing (replacing a dish given by default), but not in a draft.
CREATE OR REPLACE FUNCTION hostel.fn_weekly_choice_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w record; r record := coalesce(NEW, OLD);
BEGIN
  SELECT status, choices_close_at, week_start INTO w FROM hostel.weekly_menu WHERE week_id = r.week_id;
  IF current_setting('hostel.menu_closing', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP <> 'DELETE' AND NEW.source = 'Staff' THEN
      IF w.status = 'Draft' OR now() >= (w.week_start::timestamp AT TIME ZONE 'Asia/Kolkata') THEN
        RAISE EXCEPTION 'Choices for this week can be entered until it begins on %', to_char(w.week_start, 'Dy DD Mon') USING ERRCODE = 'P0001';
      END IF;
    ELSIF w.status <> 'Published' OR now() >= w.choices_close_at THEN
      RAISE EXCEPTION 'Choices for this week closed on %', to_char(w.choices_close_at AT TIME ZONE 'Asia/Kolkata' - interval '1 minute', 'Dy DD Mon, HH12:MI AM') USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.option_id IS NULL AND NOT (SELECT can_skip FROM hostel.menu_course WHERE course_code = NEW.course_code) THEN
    RAISE EXCEPTION 'Choose a dish for this course; it cannot be skipped' USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;

-- ---------- sentiment of a comment ----------
-- A word list, kept as data so the mess can add the words students really use.
CREATE TABLE hostel.sentiment_word (
  word    varchar(40) PRIMARY KEY CHECK (word = lower(word)),
  weight  smallint NOT NULL CHECK (weight BETWEEN -3 AND 3 AND weight <> 0),
  note    varchar(80)
);
COMMENT ON TABLE hostel.sentiment_word IS 'Words that make a meal comment positive (weight > 0) or negative (< 0); "not", "no", "never" before a word turn it round';
INSERT INTO hostel.sentiment_word (word, weight, note) VALUES
  ('good', 2, NULL), ('great', 3, NULL), ('tasty', 3, NULL), ('delicious', 3, NULL), ('yummy', 3, NULL), ('excellent', 3, NULL), ('nice', 2, NULL),
  ('fresh', 2, NULL), ('hot', 1, 'served hot'), ('soft', 2, NULL), ('crispy', 2, NULL), ('perfect', 3, NULL), ('love', 3, NULL), ('loved', 3, NULL),
  ('like', 1, NULL), ('liked', 2, NULL), ('awesome', 3, NULL), ('best', 3, NULL), ('enough', 1, 'quantity'), ('clean', 2, NULL), ('homely', 2, NULL),
  ('fine', 1, NULL), ('okay', 1, NULL), ('ok', 1, NULL), ('wow', 3, NULL), ('superb', 3, NULL), ('super', 3, NULL), ('fluffy', 2, NULL),
  ('bagundi', 3, 'Telugu: it is good'), ('baagundi', 3, 'Telugu: it is good'), ('chala', 1, 'Telugu: very'), ('ruchi', 2, 'Telugu: taste'),
  ('accha', 2, 'Hindi: good'), ('achha', 2, 'Hindi: good'), ('badhiya', 3, 'Hindi: great'), ('mast', 3, 'Hindi: great'), ('swadisht', 3, 'Hindi: tasty'),
  ('bad', -2, NULL), ('worst', -3, NULL), ('bland', -2, NULL), ('tasteless', -3, NULL), ('cold', -2, NULL), ('stale', -3, NULL), ('raw', -2, NULL),
  ('undercooked', -3, NULL), ('overcooked', -2, NULL), ('burnt', -2, NULL), ('oily', -2, NULL), ('salty', -2, NULL), ('spicy', -1, 'too spicy'),
  ('hard', -1, NULL), ('soggy', -2, NULL), ('watery', -2, NULL), ('smell', -2, NULL), ('smelly', -3, NULL), ('hair', -3, 'hygiene'), ('insect', -3, 'hygiene'),
  ('worm', -3, 'hygiene'), ('dirty', -3, 'hygiene'), ('less', -1, 'quantity'), ('small', -1, 'quantity'), ('late', -1, NULL), ('sour', -2, NULL),
  ('poor', -2, NULL), ('terrible', -3, NULL), ('horrible', -3, NULL), ('awful', -3, NULL), ('waste', -2, NULL), ('sick', -3, NULL), ('rubbery', -2, NULL),
  ('dry', -1, NULL), ('boring', -2, NULL), ('repeat', -1, 'same dish again'), ('same', -1, 'same dish again'),
  ('baaledu', -3, 'Telugu: not good'), ('baagaledu', -3, 'Telugu: not good'), ('bagaledu', -3, 'Telugu: not good'), ('bekar', -3, 'Hindi: useless'),
  ('bakwas', -3, 'Hindi: rubbish'), ('ganda', -3, 'Hindi: dirty'), ('kharab', -3, 'Hindi: bad');

-- -1 (negative) .. +1 (positive); NULL when no word of the list appears.
CREATE OR REPLACE FUNCTION hostel.fn_text_sentiment(p_text text) RETURNS numeric LANGUAGE sql STABLE AS $$
  WITH t AS (SELECT w, n, lag(w) OVER (ORDER BY n) AS prev
               FROM regexp_split_to_table(lower(coalesce(p_text, '')), '[^a-z]+') WITH ORDINALITY AS x(w, n) WHERE w <> ''),
  s AS (SELECT CASE WHEN t.prev IN ('not', 'no', 'never', 'nahi', 'nahin', 'ledu', 'too') AND sw.weight > 0 THEN -sw.weight ELSE sw.weight END AS v
          FROM t JOIN hostel.sentiment_word sw ON sw.word = t.w)
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE greatest(-1, least(1, sum(v)::numeric / greatest(3, count(*) * 2))) END FROM s;
$$;

-- ---------- ratings ----------
CREATE TABLE hostel.meal_rating (
  rating_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id       varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  mess_id          bigint NOT NULL REFERENCES hostel.mess_master(mess_id),
  meal_date        date NOT NULL,
  meal             hostel.meal_slot NOT NULL,
  dish             varchar(80) NOT NULL CHECK (length(trim(dish)) > 0),
  course_code      varchar(20) REFERENCES hostel.menu_course(course_code),
  option_id        bigint REFERENCES hostel.weekly_menu_option(option_id),
  diet             varchar(10) CHECK (diet IN ('Veg', 'Non_Veg')),
  cuisine          varchar(10) CHECK (cuisine IN ('South', 'North', 'Both')),
  rating           smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          varchar(400),
  text_score       numeric(4,3),
  score            numeric(4,3) NOT NULL,
  sentiment        varchar(10) NOT NULL CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  gender_group     varchar(5) NOT NULL CHECK (gender_group IN ('Boys', 'Girls')),
  rated_at         timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz,
  UNIQUE (student_id, meal_date, meal, dish)
);
COMMENT ON TABLE hostel.meal_rating IS 'A student''s stars and comment for one dish of one meal; score -1..1 and sentiment from both';
COMMENT ON COLUMN hostel.meal_rating.dish IS 'The dish as served: a chosen dish (option_id), a fixed item (course_code NULL) or a snack';
COMMENT ON COLUMN hostel.meal_rating.gender_group IS 'Boys or Girls, from the student''s gender when rated';
CREATE INDEX ix_meal_rating_date ON hostel.meal_rating (meal_date, mess_id);
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON hostel.meal_rating FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();

-- Stars count 70 %, the words 30 %; three or more stars with no words read as the stars alone.
-- A rating is for a meal already served, within three days, and only once per dish (it may be changed).
CREATE OR REPLACE FUNCTION hostel.fn_meal_rating_score() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE stars numeric;
BEGIN
  IF current_setting('hostel.seeding', true) IS DISTINCT FROM 'on'   -- demo data loads past ratings
     AND (NEW.meal_date > (now() AT TIME ZONE 'Asia/Kolkata')::date OR NEW.meal_date < (now() AT TIME ZONE 'Asia/Kolkata')::date - 3) THEN
    RAISE EXCEPTION 'Meals can be rated on the day and up to three days after' USING ERRCODE = 'P0001';
  END IF;
  NEW.comment := nullif(trim(NEW.comment), '');
  NEW.text_score := hostel.fn_text_sentiment(NEW.comment);
  stars := (NEW.rating - 3) / 2.0;
  NEW.score := round(CASE WHEN NEW.text_score IS NULL THEN stars ELSE 0.7 * stars + 0.3 * NEW.text_score END, 3);
  NEW.sentiment := CASE WHEN NEW.score >= 0.25 THEN 'Positive' WHEN NEW.score <= -0.25 THEN 'Negative' ELSE 'Neutral' END;
  IF TG_OP = 'INSERT' THEN
    NEW.gender_group := coalesce(NEW.gender_group, (SELECT CASE WHEN gender::text IN ('Female', 'F') THEN 'Girls' ELSE 'Boys' END FROM ref.student_master WHERE student_id = NEW.student_id));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_meal_rating_score BEFORE INSERT OR UPDATE ON hostel.meal_rating FOR EACH ROW EXECUTE FUNCTION hostel.fn_meal_rating_score();

-- ---------- what each student was served ----------
-- Every dish a resident was served, day by day: their chosen dishes and the fixed items of their food style.
CREATE OR REPLACE VIEW hostel.v_meal_served AS
SELECT c.student_id, w.mess_id, w.week_start + c.day_no - 1 AS meal_date, c.meal, o.dish, c.course_code, o.option_id, o.diet, o.cuisine
  FROM hostel.weekly_menu_choice c
  JOIN hostel.weekly_menu w ON w.week_id = c.week_id
  JOIN hostel.weekly_menu_option o ON o.option_id = c.option_id
 WHERE w.status <> 'Draft'
UNION ALL
SELECT r.student_id, w.mess_id, w.week_start + d - 1, f.meal, trim(x.item), NULL, NULL, NULL, f.cuisine
  FROM hostel.weekly_menu w
  JOIN hostel.weekly_menu_fixed f ON f.week_id = w.week_id
  JOIN hostel.v_mess_resident r ON r.mess_id = w.mess_id AND r.cuisine = f.cuisine
  CROSS JOIN generate_series(1, 7) d
  CROSS JOIN LATERAL unnest(string_to_array(f.items, ',')) x(item)
 WHERE w.status <> 'Draft' AND trim(x.item) NOT IN ('Tea', 'Coffee', 'Milk');
COMMENT ON VIEW hostel.v_meal_served IS 'Each dish served to each resident on each day: chosen dishes and fixed items (drinks left out)';
