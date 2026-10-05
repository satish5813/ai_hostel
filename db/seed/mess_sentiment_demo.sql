-- Demo data for the mess sentiment dashboard (dev only; run after weekly_menu_demo.sql):
--   logins for the President, Vice President, Pro-VC, Mess Supervisor and Chief Chef, and four weeks of students'
--   ratings of what they were served. Some dishes are liked and some are not, girls and boys differ a little,
--   and things improve slowly over the month, so the charts have something to show.
-- Safe to run again: the ratings of the last 28 days are replaced.

INSERT INTO ref.staff_master (staff_id, salutation, first_name, last_name, gender, dept_code, designation, mobile_no, staff_type, official_email) VALUES
  ('S-PR', 'Sri', 'University', 'President', 'Male', 'ADMIN', 'President', '9000000015', 'Admin', 'president@kluniversity.in'),
  ('S-VP', 'Sri', 'Vice', 'President', 'Male', 'ADMIN', 'Vice President', '9000000016', 'Admin', 'vp@kluniversity.in'),
  ('S-PC', 'Dr.', 'Pro', 'ViceChancellor', 'Female', 'ADMIN', 'Pro-Vice Chancellor', '9000000017', 'Admin', 'provc@kluniversity.in')
ON CONFLICT (staff_id) DO NOTHING;
UPDATE ref.staff_master SET designation = 'Chief Chef', last_name = 'Chief Chef' WHERE staff_id = 'S-CK';
INSERT INTO portal.app_user (staff_id, full_name, email, title, home_dept)
SELECT staff_id, full_name, official_email, designation, dept_code FROM ref.staff_master WHERE staff_id IN ('S-PR', 'S-VP', 'S-PC') ON CONFLICT DO NOTHING;
INSERT INTO portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
SELECT u.user_id, r.role_code, 'HOSTELS', 'S-AD', 'HO/2026/ROLES/03' FROM portal.app_user u
  JOIN (VALUES ('S-PR', 'President'), ('S-VP', 'Vice_President'), ('S-PC', 'Pro_VC'), ('S-CK', 'Chief_Chef')) r(staff_id, role_code) ON r.staff_id = u.staff_id
ON CONFLICT DO NOTHING;

INSERT INTO portal.demo_login (username, password_hash, role_code, user_ref, display_name, description, group_name, sort_order)
SELECT v.u, crypt('Demo@2026', gen_salt('bf', 8)), v.r, v.u, v.n, v.d, v.g, v.o FROM (VALUES
  ('S-CK', 'Chief_Chef',     'Chief Chef, BH1 and GH1 messes', 'Weekly menu, choices entered for students, sentiment dashboard', 'Mess', 43),
  ('S-FW', 'Floor_Warden',   'Floor Warden, BH1',              'Checks students'' repair tickets', 'Wardens', 35),
  ('S-MT', 'Maintenance_Supervisor', 'Maintenance Supervisor',   'Repairs and closure reports', 'Maintenance', 70),
  ('S-AC', 'Accounts_Section', 'Hostel Accounts',              'Room electricity bills and dues', 'Accounts', 46),
  ('S-MU', 'Mess_Supervisor', 'Mess Supervisor',               'Sentiment dashboard: what students like', 'Mess', 45),
  ('S-PR', 'President',      'President',                      'Mess sentiment dashboard', 'Management', 60),
  ('S-VP', 'Vice_President', 'Vice President',                 'Mess sentiment dashboard', 'Management', 61),
  ('S-PC', 'Pro_VC',         'Pro-Vice Chancellor',            'Mess sentiment dashboard', 'Management', 62)
) AS v(u, r, n, d, g, o)
ON CONFLICT (username) DO UPDATE SET role_code = excluded.role_code, display_name = excluded.display_name, description = excluded.description,
  group_name = excluded.group_name, sort_order = excluded.sort_order, active = true;

BEGIN;
SELECT set_config('hostel.seeding', 'on', true), setseed(0.42);
DELETE FROM hostel.meal_rating WHERE meal_date > current_date - 28;

WITH served AS (
  SELECT s.*, (current_date - s.meal_date) AS ago,
         CASE WHEN sm.gender::text IN ('Female', 'F') THEN 'Girls' ELSE 'Boys' END AS g
    FROM hostel.v_meal_served s JOIN ref.student_master sm ON sm.student_id = s.student_id
   WHERE s.meal_date BETWEEN current_date - 27 AND current_date
     AND s.dish NOT IN ('White rice', 'Curd', 'Sambar', 'Coconut chutney')
     AND (s.meal_date < current_date OR s.meal = 'Breakfast')                         -- today: only breakfast has been served
), rated_meal AS (                                                                      -- about two meals in five get rated
  SELECT DISTINCT student_id, meal_date, meal FROM served WHERE random() < 0.4
), r AS (
  SELECT s.*,
    -- how good the dish is: some are favourites, some are not liked, the rest in between
    CASE WHEN s.dish IN ('Chicken 65', 'Masala dosa', 'Paneer butter masala', 'Gongura mutton', 'Punugulu', 'Samosa', 'Butter chicken', 'Ghee roast dosa', 'Pav bhaji', 'Chicken chettinad') THEN 4.5
         WHEN s.dish IN ('Sorakaya curry', 'Bendakaya pulusu', 'Cabbage poriyal', 'Methi thepla', 'Dosakaya pappu', 'Sundal', 'Moong dal', 'Lemon rasam', 'Baingan bharta') THEN 2.3
         ELSE 3.1 + (abs(hashtext(s.dish)) % 10) / 10.0 END
    + CASE WHEN s.g = 'Girls' AND s.cuisine = 'North' THEN 0.4 WHEN s.g = 'Boys' AND s.diet = 'Non_Veg' THEN 0.4 WHEN s.g = 'Girls' AND s.meal = 'Evening_Snacks' THEN 0.3 ELSE 0 END
    + CASE WHEN s.meal = 'Dinner' THEN -0.3 ELSE 0 END                                 -- dinner is the weak meal
    - s.ago * 0.02                                                                     -- getting better week by week
    + (random() - 0.5) * 1.8 AS q
    FROM served s JOIN rated_meal m USING (student_id, meal_date, meal)
)
INSERT INTO hostel.meal_rating (student_id, mess_id, meal_date, meal, dish, course_code, option_id, diet, cuisine, rating, comment, gender_group, rated_at, score, sentiment)
SELECT r.student_id, r.mess_id, r.meal_date, r.meal, r.dish, r.course_code, r.option_id, r.diet, r.cuisine,
       greatest(1, least(5, round(r.q)))::int,
       CASE WHEN random() < 0.3 THEN
         CASE WHEN round(r.q) >= 4 THEN (ARRAY['Very tasty, chala bagundi', 'Served hot and fresh', 'Loved it, please repeat', 'Best item this week', 'Nice and soft', 'Accha tha', 'Super taste'])[1 + floor(random() * 7)::int]
              WHEN round(r.q) <= 2 THEN (ARRAY['Too salty', 'It was cold and bland', 'Undercooked, not good', 'Very oily', 'Baagaledu', 'Quantity was less', 'Same item again, boring', 'Tasteless'])[1 + floor(random() * 8)::int]
              ELSE (ARRAY['Okay', 'Fine, could be better', 'Bit spicy', 'Average', 'Was okay but late'])[1 + floor(random() * 5)::int] END END,
       r.g, (r.meal_date + time '21:00')::timestamptz, 0, 'Neutral'
  FROM r
ON CONFLICT (student_id, meal_date, meal, dish) DO NOTHING;
COMMIT;

SELECT count(*) AS ratings, round(avg(rating), 2) AS avg_stars,
       count(*) FILTER (WHERE sentiment = 'Positive') AS positive, count(*) FILTER (WHERE sentiment = 'Negative') AS negative
  FROM hostel.meal_rating;
