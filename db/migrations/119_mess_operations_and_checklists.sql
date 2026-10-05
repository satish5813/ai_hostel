-- =====================================================================
-- 119  Mess operations (G) and checklists and grievances (H), 5 Oct 2026.
--   MES-03 grievance desk   hostel.mess_feedback (Grievance); a meal is significant when 5 students or 10% of the mess
--                           complain (v_mess_grievance_day); raising it to management records hostel.mess_grievance_summary
--   MES-04 meal scan        hostel.meal_attendance, one row per student and meal
--   MES-05 mess store       goods received (new: mess_store_receipt / _line) and daily issue to the kitchen
--                           (hostel.mess_issue / _line, acknowledged by the Mess Supervisor); stock = received - issued,
--                           never below zero (v_mess_stock); provisions are portal.material in category PROV
--   MES-06 daily record     hostel.mess_daily_record per mess, day and meal
--   TKT-05 checklists       a submission is reviewed after it is made (reviewed_by was required at submission)
--   TKT-06 grievances       hostel.student_grievance (not repairs); confidential ones only for the Chief Warden and Dean
-- =====================================================================
BEGIN;

-- ---------- fixes to the tables generated from the design document ----------
ALTER TABLE hostel.checklist_submission ALTER COLUMN reviewed_by DROP NOT NULL;
ALTER TABLE hostel.checklist_submission ADD COLUMN IF NOT EXISTS status varchar(10) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Reviewed'));
ALTER TABLE hostel.checklist_submission ADD COLUMN IF NOT EXISTS review_remarks text;
ALTER TABLE hostel.checklist_submission ADD CONSTRAINT checklist_submission_reviewed CHECK (status <> 'Reviewed' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS ux_checklist_submission_once ON hostel.checklist_submission (template_id, facility_id, zone_id, period_date, shift) NULLS NOT DISTINCT;
COMMENT ON COLUMN hostel.checklist_submission.reviewed_by IS 'Reviewer who signed it; empty until reviewed';

ALTER TABLE hostel.mess_issue ALTER COLUMN acknowledged_by DROP NOT NULL;
ALTER TABLE hostel.mess_issue ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE hostel.mess_issue ADD COLUMN IF NOT EXISTS remarks text;
COMMENT ON COLUMN hostel.mess_issue.acknowledged_by IS 'Mess Supervisor who received the issue in the kitchen; empty until acknowledged';

ALTER TABLE hostel.mess_grievance_summary ALTER COLUMN main_aspect TYPE varchar(40) USING main_aspect::text;
ALTER TABLE hostel.mess_feedback ADD CONSTRAINT mess_feedback_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
CREATE INDEX IF NOT EXISTS ix_mess_feedback_day ON hostel.mess_feedback (mess_id, meal_date, slot);
CREATE INDEX IF NOT EXISTS ix_meal_attendance_day ON hostel.meal_attendance (mess_id, meal_date, meal);

-- ---------- mess store: goods received ----------
CREATE TABLE IF NOT EXISTS hostel.mess_store_receipt (
  receipt_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mess_id      bigint NOT NULL REFERENCES hostel.mess_master,
  received_on  date NOT NULL DEFAULT current_date,
  supplier     varchar(120) NOT NULL,
  bill_no      varchar(40),
  received_by  varchar(20) REFERENCES ref.staff_master,
  remarks      text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(20)
);
CREATE TABLE IF NOT EXISTS hostel.mess_store_receipt_line (
  receipt_id   bigint NOT NULL REFERENCES hostel.mess_store_receipt ON DELETE CASCADE,
  sku          varchar(30) NOT NULL REFERENCES portal.material,
  qty          numeric(12,3) NOT NULL CHECK (qty > 0),
  rate         numeric(12,2) NOT NULL CHECK (rate >= 0),
  expiry_date  date,
  PRIMARY KEY (receipt_id, sku)
);
COMMENT ON TABLE hostel.mess_store_receipt IS 'Provisions received into a mess store, with the supplier''s bill';
CREATE TRIGGER trg_audit_mess_store_receipt AFTER INSERT OR UPDATE OR DELETE ON hostel.mess_store_receipt FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('receipt_id');

-- stock on hand per mess and item, valued at the weighted average of what was received; days left at the last two weeks' use
CREATE OR REPLACE VIEW hostel.v_mess_stock AS
WITH r AS (SELECT h.mess_id, l.sku, sum(l.qty) AS received, sum(l.qty * l.rate) AS value_in, max(h.received_on) AS last_received,
                  min(l.expiry_date) FILTER (WHERE l.expiry_date >= current_date) AS next_expiry
             FROM hostel.mess_store_receipt h JOIN hostel.mess_store_receipt_line l USING (receipt_id) GROUP BY 1, 2),
     i AS (SELECT h.mess_id, l.sku, sum(l.qty) AS issued, max(h.issue_date) AS last_issued,
                  sum(l.qty) FILTER (WHERE h.issue_date > current_date - 14) / 14.0 AS daily_use
             FROM hostel.mess_issue h JOIN hostel.mess_issue_line l USING (issue_id) GROUP BY 1, 2)
SELECT m.mess_id, mt.sku, mt.name, mt.base_unit, mt.reorder_level,
       coalesce(r.received, 0) AS received, coalesce(i.issued, 0) AS issued, coalesce(r.received, 0) - coalesce(i.issued, 0) AS on_hand,
       CASE WHEN r.received > 0 THEN round(r.value_in / r.received, 2) END AS avg_rate,
       round((coalesce(r.received, 0) - coalesce(i.issued, 0)) * CASE WHEN r.received > 0 THEN r.value_in / r.received ELSE 0 END, 2) AS stock_value,
       r.last_received, i.last_issued, r.next_expiry,
       CASE WHEN i.daily_use > 0 THEN (coalesce(r.received, 0) - coalesce(i.issued, 0)) < 4 * i.daily_use
            ELSE (coalesce(r.received, 0) - coalesce(i.issued, 0)) <= coalesce(mt.reorder_level, 0) END AS reorder,
       round(i.daily_use, 3) AS daily_use,
       CASE WHEN i.daily_use > 0 THEN floor((coalesce(r.received, 0) - coalesce(i.issued, 0)) / i.daily_use)::int END AS days_left
FROM hostel.mess_master m CROSS JOIN portal.material mt
LEFT JOIN r ON r.mess_id = m.mess_id AND r.sku = mt.sku
LEFT JOIN i ON i.mess_id = m.mess_id AND i.sku = mt.sku
WHERE mt.category_code = 'PROV' AND mt.status = 'Active';
COMMENT ON VIEW hostel.v_mess_stock IS 'Provisions in each mess store: received - issued, valued at the average receipt rate; reorder when under four days at the last two weeks'' use (or at the reorder level when unused)';

-- nothing is issued that the store does not hold
CREATE OR REPLACE FUNCTION hostel.fn_mess_issue_line_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_mess bigint; v_on numeric; v_name text;
BEGIN
  SELECT mess_id INTO v_mess FROM hostel.mess_issue WHERE issue_id = NEW.issue_id;
  PERFORM pg_advisory_xact_lock(hashtext('mess_store:' || v_mess || ':' || NEW.sku));
  SELECT on_hand, name INTO v_on, v_name FROM hostel.v_mess_stock WHERE mess_id = v_mess AND sku = NEW.sku;
  IF NEW.qty > coalesce(v_on, 0) THEN
    RAISE EXCEPTION 'Only % of % is in the store; % cannot be issued', coalesce(v_on, 0), coalesce(v_name, NEW.sku), NEW.qty USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_mess_issue_line_check ON hostel.mess_issue_line;
CREATE TRIGGER trg_mess_issue_line_check BEFORE INSERT ON hostel.mess_issue_line FOR EACH ROW EXECUTE FUNCTION hostel.fn_mess_issue_line_check();

-- ---------- grievances per meal: significant at 5 students or 10% of the mess ----------
CREATE OR REPLACE VIEW hostel.v_mess_grievance_day AS
SELECT f.mess_id, f.meal_date, f.slot, count(DISTINCT f.student_id) AS students,
       (SELECT count(*) FROM hostel.mess_subscription s WHERE s.mess_id = f.mess_id AND s.status = 'Active') AS strength,
       mode() WITHIN GROUP (ORDER BY f.aspect) AS main_aspect,
       count(*) FILTER (WHERE f.status = 'Open') AS open,
       count(DISTINCT f.student_id) >= greatest(5, ceil(0.10 * (SELECT count(*) FROM hostel.mess_subscription s WHERE s.mess_id = f.mess_id AND s.status = 'Active'))) AS significant
FROM hostel.mess_feedback f WHERE f.entry_type = 'Grievance'
GROUP BY f.mess_id, f.meal_date, f.slot;
COMMENT ON VIEW hostel.v_mess_grievance_day IS 'Mess grievances per meal; significant when 5 students or 10% of the mess complain about the same meal';

-- ---------- provisions master: units, the PROV category, common provisions with reorder levels ----------
INSERT INTO portal.unit_of_measure (uom, formal_name, decimal_places) VALUES
  ('KG', 'Kilogram', 3), ('LTR', 'Litre', 3), ('NOS', 'Numbers', 0), ('PKT', 'Packet', 0), ('TRAY', 'Tray of 30', 0)
ON CONFLICT (uom) DO NOTHING;
INSERT INTO portal.category (category_code, name, item_nature) VALUES ('PROV', 'Mess provisions', 'Consumable') ON CONFLICT (category_code) DO NOTHING;
INSERT INTO portal.material (sku, name, base_unit, category_code, item_nature, use_expiry, reorder_level, standard_cost)
SELECT v.sku, v.name, v.unit, 'PROV', 'Consumable', v.exp, v.reorder, v.cost FROM (VALUES
  ('PRV-RICE-SN', 'Rice, sona masoori', 'KG', false, 300, 52), ('PRV-RICE-ID', 'Idli rice', 'KG', false, 100, 40),
  ('PRV-ATTA', 'Wheat flour (atta)', 'KG', true, 150, 38), ('PRV-RAVA', 'Rava (semolina)', 'KG', true, 40, 45),
  ('PRV-POHA', 'Poha (flattened rice)', 'KG', true, 40, 55), ('PRV-TOOR', 'Toor dal', 'KG', false, 80, 140),
  ('PRV-MOONG', 'Moong dal', 'KG', false, 40, 120), ('PRV-URAD', 'Urad dal', 'KG', false, 60, 130),
  ('PRV-CHANA', 'Chana dal', 'KG', false, 40, 95), ('PRV-OIL-SF', 'Sunflower oil', 'LTR', true, 80, 135),
  ('PRV-GHEE', 'Ghee', 'KG', true, 10, 620), ('PRV-SUGAR', 'Sugar', 'KG', false, 50, 44),
  ('PRV-SALT', 'Salt', 'KG', false, 20, 22), ('PRV-TEA', 'Tea powder', 'KG', true, 8, 480),
  ('PRV-COFFEE', 'Coffee powder', 'KG', true, 5, 620), ('PRV-MILK', 'Milk', 'LTR', true, 60, 58),
  ('PRV-CURD', 'Curd', 'KG', true, 40, 60), ('PRV-EGG', 'Eggs', 'TRAY', true, 10, 190),
  ('PRV-CHICKEN', 'Chicken', 'KG', true, 0, 240), ('PRV-ONION', 'Onions', 'KG', true, 60, 35),
  ('PRV-TOMATO', 'Tomatoes', 'KG', true, 40, 30), ('PRV-POTATO', 'Potatoes', 'KG', true, 60, 28),
  ('PRV-VEG-MIX', 'Seasonal vegetables', 'KG', true, 50, 40), ('PRV-CHILLI', 'Chilli powder', 'KG', true, 5, 320),
  ('PRV-TURMERIC', 'Turmeric powder', 'KG', true, 3, 240), ('PRV-TAMARIND', 'Tamarind', 'KG', true, 8, 180)
) v(sku, name, unit, exp, reorder, cost)
ON CONFLICT (sku) DO NOTHING;

-- ---------- checklists: daily floor check, mess hygiene, weekly store check ----------
INSERT INTO hostel.checklist_template (template_name, role_code, frequency, scope, answer_type, reviewer_role, version, status)
SELECT v.n, v.r, v.f, v.s, v.a, v.rv, 1, 'Active' FROM (VALUES
  ('Daily floor check', 'Floor_Warden', 'Daily', 'Floor', 'OK_NotOK', 'Chief_Warden'),
  ('Mess kitchen hygiene', 'Mess_Supervisor', 'Daily', 'Mess', 'Yes_No', 'Mess_Incharge'),
  ('Mess store weekly check', 'Mess_Storekeeper', 'Weekly', 'Store', 'OK_NotOK', 'Mess_Incharge')
) v(n, r, f, s, a, rv)
WHERE NOT EXISTS (SELECT 1 FROM hostel.checklist_template t WHERE t.template_name = v.n);
INSERT INTO hostel.checklist_item (template_id, item_no, section, item_text, category_id, ticket_on_fail)
SELECT t.template_id, v.no, v.sec, v.txt, v.cat, v.cat IS NOT NULL
FROM hostel.checklist_template t JOIN (VALUES
  ('Daily floor check', 1, 'Safety', 'Corridor and staircase lights all working', 'ELEC'),
  ('Daily floor check', 2, 'Safety', 'Fire extinguishers in place and in date', 'FIRE'),
  ('Daily floor check', 3, 'Safety', 'Emergency exits clear, not locked', NULL),
  ('Daily floor check', 4, 'Washrooms', 'Washrooms cleaned this morning', 'HOUSE'),
  ('Daily floor check', 5, 'Washrooms', 'No leaking taps or blocked drains', 'PLUMB'),
  ('Daily floor check', 6, 'Water', 'Drinking water cooler working and clean', 'PLUMB'),
  ('Daily floor check', 7, 'Common areas', 'Corridors swept, dustbins emptied', 'HOUSE'),
  ('Daily floor check', 8, 'Common areas', 'No unauthorised visitors on the floor', NULL),
  ('Mess kitchen hygiene', 1, 'Kitchen', 'Kitchen floor and platforms cleaned before cooking', 'MESS'),
  ('Mess kitchen hygiene', 2, 'Kitchen', 'Cooks wearing caps, aprons and gloves', NULL),
  ('Mess kitchen hygiene', 3, 'Kitchen', 'Vegetables washed in clean water', NULL),
  ('Mess kitchen hygiene', 4, 'Kitchen', 'Cold storage at 0-4 °C', 'ELEC'),
  ('Mess kitchen hygiene', 5, 'Water', 'RO drinking water plant working', 'PLUMB'),
  ('Mess kitchen hygiene', 6, 'Waste', 'Wet and dry waste kept apart, bins covered', NULL),
  ('Mess kitchen hygiene', 7, 'Dining hall', 'Tables and plates clean, hand-wash has soap', 'MESS'),
  ('Mess kitchen hygiene', 8, 'Pests', 'No sign of rodents, cockroaches or flies', 'MESS'),
  ('Mess store weekly check', 1, 'Stock', 'Store register matches the shelves', NULL),
  ('Mess store weekly check', 2, 'Stock', 'Older stock issued first; nothing past expiry', NULL),
  ('Mess store weekly check', 3, 'Storage', 'Grains in sealed, rodent-proof bins off the floor', 'MESS'),
  ('Mess store weekly check', 4, 'Storage', 'Store dry, ventilated, no leakage', 'CIVIL')
) v(tn, no, sec, txt, cat) ON v.tn = t.template_name
ON CONFLICT (template_id, item_no) DO NOTHING;

COMMIT;
