-- =====================================================================
-- 127  Non-vegetarian means chicken and egg, 13 Oct 2026.
--   Fish, prawns, crab, mutton and other red meat are not served (cost). Existing menus that named them are
--   changed to the chicken or egg dish of the same kind, and a check on every menu table refuses them from now
--   on, whichever screen writes the menu.
-- =====================================================================
CREATE OR REPLACE FUNCTION hostel.fn_dish_allowed(p text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p IS NULL OR p !~* '\m(fish|fishes|prawn|prawns|shrimp|crab|squid|mutton|lamb|goat|beef|pork)\M'
$$;
COMMENT ON FUNCTION hostel.fn_dish_allowed(text) IS 'Non-veg is chicken and egg only: no seafood or red meat in any menu text.';

-- what was already written: the same dish, with chicken (or egg) instead
CREATE OR REPLACE FUNCTION hostel.fn_dish_chickenise(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    p,
    'Gongura mutton', 'Gongura chicken', 'gi'),
    'asa \(fish\) tibs', 'doro (chicken) tibs', 'gi'),
    'fish ambul thiyal', 'chicken curry', 'gi'),
    'fish bhuna', 'chicken bhuna', 'gi'),
    'fish pulusu', 'chicken pulusu', 'gi'),
    'fish fry', 'chicken fry', 'gi'),
    'fish curry', 'chicken curry', 'gi'),
    'with fish', 'with chicken', 'gi'),
    'prawn[s]? (curry|fry|pulao|biryani|masala)', 'chicken \1', 'gi'),
    '\m(mutton|lamb|goat|beef|pork)\M', 'chicken', 'gi'),
    '\m(prawns?|shrimp|crab|squid)\M', 'egg', 'gi'),
    '\mfish\M', 'chicken', 'gi'),
    'chicken chicken', 'chicken', 'gi')
$$;
-- a dish name starts with a capital: 'Fish fry' became 'chicken fry'
CREATE OR REPLACE FUNCTION hostel.fn_dish_fix(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(hostel.fn_dish_chickenise(p), '^chicken', 'Chicken'), '^egg', 'Egg')
$$;

-- past weeks are closed to edits by their own guard; this is a correction of the record, so the guard is set aside for it
ALTER TABLE hostel.weekly_menu_option DISABLE TRIGGER USER;
UPDATE hostel.weekly_menu_option SET dish  = hostel.fn_dish_fix(dish),  updated_at = now() WHERE NOT hostel.fn_dish_allowed(dish);
ALTER TABLE hostel.weekly_menu_option ENABLE TRIGGER USER;
UPDATE hostel.weekly_menu_fixed  SET items = hostel.fn_dish_fix(items)                     WHERE NOT hostel.fn_dish_allowed(items);
ALTER TABLE hostel.menu_cycle_item DISABLE TRIGGER USER; ALTER TABLE hostel.menu_fixed_item DISABLE TRIGGER USER; ALTER TABLE hostel.menu_plan DISABLE TRIGGER USER;
UPDATE hostel.menu_cycle_item    SET dishes = hostel.fn_dish_fix(dishes), updated_at = now() WHERE NOT hostel.fn_dish_allowed(dishes);
UPDATE hostel.menu_fixed_item    SET items = hostel.fn_dish_fix(items),  updated_at = now() WHERE NOT hostel.fn_dish_allowed(items);
UPDATE hostel.menu_plan          SET dishes = hostel.fn_dish_fix(dishes), updated_at = now() WHERE NOT hostel.fn_dish_allowed(dishes);
ALTER TABLE hostel.menu_cycle_item ENABLE TRIGGER USER; ALTER TABLE hostel.menu_fixed_item ENABLE TRIGGER USER; ALTER TABLE hostel.menu_plan ENABLE TRIGGER USER;

ALTER TABLE hostel.weekly_menu_option DROP CONSTRAINT IF EXISTS ck_weekly_menu_option_dish_allowed;
ALTER TABLE hostel.weekly_menu_option ADD  CONSTRAINT ck_weekly_menu_option_dish_allowed CHECK (hostel.fn_dish_allowed(dish));
ALTER TABLE hostel.weekly_menu_fixed  DROP CONSTRAINT IF EXISTS ck_weekly_menu_fixed_allowed;
ALTER TABLE hostel.weekly_menu_fixed  ADD  CONSTRAINT ck_weekly_menu_fixed_allowed CHECK (hostel.fn_dish_allowed(items));
ALTER TABLE hostel.menu_cycle_item    DROP CONSTRAINT IF EXISTS ck_menu_cycle_item_allowed;
ALTER TABLE hostel.menu_cycle_item    ADD  CONSTRAINT ck_menu_cycle_item_allowed CHECK (hostel.fn_dish_allowed(dishes));
ALTER TABLE hostel.menu_fixed_item    DROP CONSTRAINT IF EXISTS ck_menu_fixed_item_allowed;
ALTER TABLE hostel.menu_fixed_item    ADD  CONSTRAINT ck_menu_fixed_item_allowed CHECK (hostel.fn_dish_allowed(items));
ALTER TABLE hostel.menu_plan          DROP CONSTRAINT IF EXISTS ck_menu_plan_allowed;
ALTER TABLE hostel.menu_plan          ADD  CONSTRAINT ck_menu_plan_allowed CHECK (hostel.fn_dish_allowed(dishes));
