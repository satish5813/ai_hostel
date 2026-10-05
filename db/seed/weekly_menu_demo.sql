-- Demo weekly menus for every active mess (dev only; run after migration 107):
--   * four past weeks (eaten, for the sentiment dashboard) and the week before the open one, all closed: some students
--     chose, the rest were given the dish that fits them at closing;
--   * the next week still open for choice (choices close when the Friday before it begins), a few students have chosen.
-- Safe to run again: weeks that exist are left as they are.
DO $$
DECLARE
  m record; ws date; this_week date; open_week date; wid bigint; d int; meal hostel.meal_slot; k int; n int;
  r record;
BEGIN
  CREATE TEMP TABLE dish (course text, cuisine text, diet text, dish text, i int) ON COMMIT DROP;
  -- breakfast live counter (idli and poha are the fixed items): made to order
  INSERT INTO dish SELECT 'LIVE', 'South', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Masala dosa','Medu vada','Onion uttapam','Pesarattu','Ghee roast dosa','Mysore bonda','Rava dosa']) x;
  INSERT INTO dish SELECT 'LIVE', 'North', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Puri bhaji','Aloo paratha','Chole bhature','Paneer paratha','Methi thepla']) x;
  INSERT INTO dish SELECT 'LIVE', 'Both', 'Non_Veg', x, row_number() OVER () FROM unnest(ARRAY['Masala omelette','Egg dosa','Egg bhurji']) x;
  INSERT INTO dish SELECT 'GRAVY', 'South', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Gutti vankaya curry','Mixed veg kurma','Bendakaya pulusu','Sorakaya curry','Mushroom chettinad','Aloo tomato curry','Chikkudu curry']) x;
  INSERT INTO dish SELECT 'GRAVY', 'South', 'Non_Veg', x, row_number() OVER () FROM unnest(ARRAY['Andhra chicken curry','Egg masala','Fish pulusu','Chicken chettinad','Gongura mutton']) x;
  INSERT INTO dish SELECT 'GRAVY', 'North', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Paneer butter masala','Chole masala','Rajma','Kadai veg','Malai kofta','Aloo matar','Dum aloo']) x;
  INSERT INTO dish SELECT 'GRAVY', 'North', 'Non_Veg', x, row_number() OVER () FROM unnest(ARRAY['Butter chicken','Chicken tikka masala','Egg curry','Keema matar','Kadai chicken']) x;
  INSERT INTO dish SELECT 'FRY', 'South', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Bendakaya fry','Aloo fry','Cabbage poriyal','Beans poriyal','Dondakaya fry','Arbi fry','Raw banana fry']) x;
  INSERT INTO dish SELECT 'FRY', 'North', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Aloo gobi','Bhindi masala','Jeera aloo','Veg pakora','Gobi manchurian dry','Baingan bharta','Mix veg sabzi']) x;
  INSERT INTO dish SELECT 'FRY', 'Both', 'Non_Veg', x, row_number() OVER () FROM unnest(ARRAY['Chicken 65','Fish fry','Egg fry','Chicken pakora','Pepper chicken']) x;
  INSERT INTO dish SELECT 'DAL', 'South', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Tomato pappu','Palakura pappu','Dosakaya pappu','Mamidikaya pappu','Mudda pappu']) x;
  INSERT INTO dish SELECT 'DAL', 'North', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Dal tadka','Dal makhani','Dal fry','Moong dal','Chana dal']) x;
  INSERT INTO dish SELECT 'CHUTNEY', 'Both', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Tomato pachadi','Gongura pachadi','Coconut chutney','Peanut chutney','Mint chutney','Dosakaya pachadi','Ridge gourd chutney']) x;
  INSERT INTO dish SELECT 'RASAM_SAMBAR', 'South', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Tomato rasam','Pepper rasam','Lemon rasam','Miriyala rasam']) x;
  INSERT INTO dish SELECT 'RASAM_SAMBAR', 'Both', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Drumstick sambar','Mixed veg sambar','Small onion sambar']) x;
  INSERT INTO dish SELECT 'SNACK', 'South', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Punugulu','Mirchi bajji','Sundal','Onion pakoda','Masala vada','Banana bajji']) x;
  INSERT INTO dish SELECT 'SNACK', 'North', 'Veg', x, row_number() OVER () FROM unnest(ARRAY['Samosa','Pav bhaji','Dhokla','Kachori','Aloo tikki chaat','Veg puff']) x;

  -- the first week still open for choice (its Friday has not begun), and the week before it, already closed
  open_week := current_date + (8 - extract(isodow FROM current_date)::int);
  IF (open_week - 3) <= current_date THEN open_week := open_week + 7; END IF;
  this_week := open_week - 7;

  FOR m IN SELECT mess_id FROM hostel.mess_master WHERE status = 'Active' LOOP
    FOREACH ws IN ARRAY ARRAY[this_week - 28, this_week - 21, this_week - 14, this_week - 7, this_week, open_week] LOOP
      CONTINUE WHEN EXISTS (SELECT 1 FROM hostel.weekly_menu WHERE mess_id = m.mess_id AND week_start = ws);
      INSERT INTO hostel.weekly_menu (mess_id, week_start, status, choices_close_at, prepared_by, published_by, published_at, created_by)
      VALUES (m.mess_id, ws, 'Published', ((ws - 3)::timestamp AT TIME ZONE 'Asia/Kolkata'), 'S-CK', 'S-MS', least(now() - interval '1 day', (ws - 10)::timestamptz), 'S-CK')
      RETURNING week_id INTO wid;
      INSERT INTO hostel.weekly_menu_fixed (week_id, meal, cuisine, items) SELECT wid, f.meal, f.cuisine, f.items FROM hostel.menu_fixed_item f;
      FOR d IN 1..7 LOOP
        FOREACH meal IN ARRAY ARRAY['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner']::hostel.meal_slot[] LOOP
          k := d * 3 + CASE meal WHEN 'Lunch' THEN 1 WHEN 'Dinner' THEN 2 WHEN 'Evening_Snacks' THEN 5 ELSE 0 END + m.mess_id::int + (ws - this_week + 35) / 7;
          -- one dish of each style and diet a course has, rotating through the list day by day
          INSERT INTO hostel.weekly_menu_option (week_id, day_no, meal, course_code, dish, cuisine, diet, sort_no, created_by)
          SELECT wid, d, meal, g.course, x.dish, g.cuisine, g.diet,
                 row_number() OVER (PARTITION BY g.course ORDER BY g.cuisine = 'Both', g.cuisine DESC, g.diet), 'S-CK'
            FROM (SELECT course, cuisine, diet, count(*)::int AS cnt FROM dish GROUP BY 1, 2, 3) g
            JOIN hostel.menu_course c ON c.course_code = g.course AND meal = ANY (c.meals)
            JOIN dish x ON x.course = g.course AND x.cuisine = g.cuisine AND x.diet = g.diet AND x.i = 1 + (k % g.cnt);
        END LOOP;
      END LOOP;
      -- some residents choose (not the demo students, so they can try it themselves)
      PERFORM set_config('hostel.menu_closing', 'on', true);
      n := 0;
      FOR r IN SELECT student_id, region, diet FROM hostel.v_mess_resident
                WHERE mess_id = m.mess_id AND student_id NOT IN ('2600040012', '2600042001', '2600042205') ORDER BY student_id LOOP
        n := n + 1;
        CONTINUE WHEN n % 3 = 0;                                   -- a third of them never choose
        INSERT INTO hostel.weekly_menu_choice (week_id, student_id, day_no, meal, course_code, option_id, source, chosen_at)
        SELECT s.week_id, r.student_id, s.day_no, s.meal, s.course_code,
               CASE WHEN s.can_skip AND (n + s.day_no) % 4 = 0 THEN NULL      -- skips the chutney or rasam now and then
                    WHEN (n + s.day_no) % 5 = 0 THEN (SELECT o.option_id FROM hostel.weekly_menu_option o WHERE o.week_id = s.week_id AND o.day_no = s.day_no
                                                       AND o.meal = s.meal AND o.course_code = s.course_code AND (o.diet = 'Veg' OR r.diet = 'Non_Veg')
                                                     ORDER BY o.option_id DESC LIMIT 1)    -- tries the other style
                    ELSE hostel.fn_default_option(s.week_id, s.day_no, s.meal, s.course_code, r.region, r.diet) END,
               'Student', now() - interval '2 days'
          FROM hostel.v_weekly_menu_slot s WHERE s.week_id = wid
           AND (ws < open_week OR s.day_no <= 3 + n % 5);         -- next week: most have chosen part of it so far
      END LOOP;
      PERFORM set_config('hostel.menu_closing', 'off', true);
    END LOOP;
  END LOOP;
  PERFORM hostel.fn_close_weekly_menus();                         -- past weeks' choices closed on their Fridays
END $$;
