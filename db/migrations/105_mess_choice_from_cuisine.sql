-- =====================================================================
-- 105  A new mess subscription takes its food style and diet from the cuisine chosen with the fee plan, 4 Oct 2026.
--   Found with the demo data: students who chose North Indian at registration were shown the South Indian menu,
--   because only subscriptions that existed when 102 ran had region and diet filled in.
-- =====================================================================
CREATE OR REPLACE FUNCTION hostel.fn_mess_subscription_choice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.region := coalesce(NEW.region, CASE NEW.cuisine WHEN 'North_Indian' THEN 'North' ELSE 'South' END);
  NEW.diet := coalesce(NEW.diet, CASE NEW.cuisine WHEN 'Non_Veg' THEN 'Non_Veg' ELSE 'Veg' END);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_mess_subscription_choice ON hostel.mess_subscription;
CREATE TRIGGER trg_mess_subscription_choice BEFORE INSERT ON hostel.mess_subscription FOR EACH ROW EXECUTE FUNCTION hostel.fn_mess_subscription_choice();

UPDATE hostel.mess_subscription SET region = 'North' WHERE cuisine = 'North_Indian' AND region IS DISTINCT FROM 'North' AND region IS DISTINCT FROM 'International';
UPDATE hostel.mess_subscription SET region = coalesce(region, 'South'), diet = coalesce(diet, CASE cuisine WHEN 'Non_Veg' THEN 'Non_Veg' ELSE 'Veg' END)
 WHERE region IS NULL OR diet IS NULL;
