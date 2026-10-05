-- =====================================================================
-- 110  Students' repair tickets, and the room electricity bill shared by roommates, 4 Oct 2026.
--
--   Tickets (TKT-01): a student raises a ticket for their room (furniture, plumbing and sanitation, electrical ...),
--   for the mess, or for a common facility of the hostel (elevator, corridor lighting, reading room, student
--   activity room ...). The student picks the thing that is wrong from a short list (hostel.ticket_item), which
--   gives the trade (category) and the time allowed to fix it. A warden (the mess in-charge for the mess) checks
--   that it is genuine, maintenance repairs and writes the closure report, and the student confirms the repair.
--   Each step is written to hostel.ticket_event.
--
--   Electricity (ELE-04): every room has a meter. Each month the room's bill is
--       billable units = units used - units included in the fee - units already bought by recharge (never below 0)
--       amount        = billable units x the approved rate for the room type
--   and it is shared equally by the students who lived in the room that month, by the days each one lived there
--   (a whole month each: equal shares). Each share is an Electricity fee demand of the student, paid in the fees
--   portal like any other. The President, Vice President and Pro-VCs see the cumulative totals (EXE-01).
-- =====================================================================

-- ---------- tickets ----------
ALTER TABLE infra.maintenance_ticket
  ADD COLUMN IF NOT EXISTS area varchar(10) CHECK (area IN ('Room', 'Mess', 'Common')),
  ADD COLUMN IF NOT EXISTS location_note varchar(120);
COMMENT ON COLUMN infra.maintenance_ticket.area IS 'Room (the student''s own), Mess, or Common (a facility of the hostel)';
COMMENT ON COLUMN infra.maintenance_ticket.location_note IS 'Where, for a common facility: "2nd floor corridor, east wing"';
UPDATE infra.maintenance_ticket SET area = 'Room' WHERE area IS NULL;

UPDATE infra.maintenance_category SET category_name = 'Plumbing and sanitation' WHERE category_id = 'PLUMB';
INSERT INTO infra.maintenance_category (category_id, category_name, default_sla_hours) VALUES
  ('LIFT', 'Elevator', 4), ('MESS', 'Mess: food, kitchen, hygiene', 12), ('FACIL', 'Common rooms and equipment', 48)
ON CONFLICT (category_id) DO NOTHING;

CREATE TABLE hostel.ticket_item (
  item_code    varchar(20) PRIMARY KEY,
  area         varchar(10) NOT NULL CHECK (area IN ('Room', 'Mess', 'Common')),
  category_id  varchar(10) NOT NULL REFERENCES infra.maintenance_category(category_id),
  label        varchar(60) NOT NULL,
  hint         varchar(120),
  priority     infra.priority NOT NULL DEFAULT 'Medium',
  sort_no      smallint NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE hostel.ticket_item IS 'What a student can report, by area; gives the trade (category) and the default priority';
INSERT INTO hostel.ticket_item (item_code, area, category_id, label, hint, priority, sort_no) VALUES
  ('R-FAN', 'Room', 'ELEC', 'Fan', 'Not working, noisy, slow', 'High', 10),
  ('R-LIGHT', 'Room', 'ELEC', 'Light', 'Tube light or bulb', 'Medium', 11),
  ('R-SOCKET', 'Room', 'ELEC', 'Switch or socket', 'Loose, sparking, dead', 'High', 12),
  ('R-METER', 'Room', 'ELEC', 'Electricity meter', 'Display blank, reading wrong', 'Medium', 13),
  ('R-BED', 'Room', 'CARP', 'Bed or cot', 'Broken plank, loose frame', 'Medium', 20),
  ('R-TABLE', 'Room', 'CARP', 'Study table or chair', NULL, 'Low', 21),
  ('R-WARD', 'Room', 'CARP', 'Wardrobe or shelf', 'Door, hinge, lock', 'Low', 22),
  ('R-DOOR', 'Room', 'CARP', 'Room door or lock', NULL, 'High', 23),
  ('R-WINDOW', 'Room', 'CIVIL', 'Window, glass or mesh', NULL, 'Medium', 24),
  ('R-TAP', 'Room', 'PLUMB', 'Tap or shower', 'Leaking, no water', 'High', 30),
  ('R-TOILET', 'Room', 'PLUMB', 'Toilet or flush', 'Blocked, leaking', 'High', 31),
  ('R-DRAIN', 'Room', 'PLUMB', 'Drain or sink blocked', NULL, 'High', 32),
  ('R-GEYSER', 'Room', 'ELEC', 'Geyser', 'No hot water', 'Medium', 33),
  ('R-CLEAN', 'Room', 'HOUSE', 'Bathroom cleaning', 'Not cleaned, bad smell', 'Medium', 34),
  ('R-WALL', 'Room', 'CIVIL', 'Wall, ceiling or seepage', NULL, 'Low', 40),
  ('R-WIFI', 'Room', 'NET', 'Wi-Fi in my room', NULL, 'Medium', 41),
  ('M-FOOD', 'Mess', 'MESS', 'Food quality', 'Undercooked, stale, foreign object', 'High', 10),
  ('M-HYGIENE', 'Mess', 'MESS', 'Hygiene and cleanliness', 'Tables, plates, floor, flies', 'High', 11),
  ('M-WATER', 'Mess', 'PLUMB', 'Drinking water or RO', NULL, 'High', 12),
  ('M-WASH', 'Mess', 'PLUMB', 'Hand-wash area', 'Tap, drain, soap', 'Medium', 13),
  ('M-FURN', 'Mess', 'CARP', 'Dining tables or chairs', NULL, 'Low', 14),
  ('M-EQUIP', 'Mess', 'MESS', 'Kitchen or serving equipment', NULL, 'Medium', 15),
  ('M-FAN', 'Mess', 'ELEC', 'Fans or lights in the dining hall', NULL, 'Medium', 16),
  ('C-LIFT', 'Common', 'LIFT', 'Elevator', 'Stuck, not working, door fault', 'Critical', 10),
  ('C-CORRLIGHT', 'Common', 'ELEC', 'Corridor or staircase lighting', NULL, 'High', 11),
  ('C-READING', 'Common', 'FACIL', 'Reading room', 'Lights, chairs, AC, noise', 'Medium', 12),
  ('C-ACTIVITY', 'Common', 'FACIL', 'Student activity room', 'Equipment, furniture, TV', 'Medium', 13),
  ('C-GYM', 'Common', 'FACIL', 'Gym or indoor games', NULL, 'Low', 14),
  ('C-LAUNDRY', 'Common', 'FACIL', 'Laundry or washing machine', NULL, 'Medium', 15),
  ('C-WASHROOM', 'Common', 'PLUMB', 'Common washroom', 'Blocked, leaking, not cleaned', 'High', 16),
  ('C-COOLER', 'Common', 'PLUMB', 'Water cooler or RO', NULL, 'High', 17),
  ('C-WIFI', 'Common', 'NET', 'Wi-Fi in common areas', NULL, 'Medium', 18),
  ('C-FIRE', 'Common', 'FIRE', 'Fire extinguisher or alarm', NULL, 'Critical', 19),
  ('C-STAIRS', 'Common', 'CIVIL', 'Staircase, railing or floor', NULL, 'Medium', 20);

-- ---------- electricity bills ----------
CREATE TABLE hostel.electricity_bill (
  bill_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meter_id         bigint NOT NULL REFERENCES hostel.room_meter(meter_id),
  space_id         varchar(30) NOT NULL,
  bill_month       date NOT NULL CHECK (extract(day FROM bill_month) = 1),
  opening_reading  numeric(12,2) NOT NULL,
  closing_reading  numeric(12,2) NOT NULL CHECK (closing_reading >= opening_reading),
  units_used       numeric(12,2) GENERATED ALWAYS AS (closing_reading - opening_reading) STORED,
  included_units   numeric(10,2) NOT NULL DEFAULT 0,
  recharged_units  numeric(10,2) NOT NULL DEFAULT 0,
  billable_units   numeric(12,2) NOT NULL CHECK (billable_units >= 0),
  rate_per_unit    numeric(8,2) NOT NULL CHECK (rate_per_unit >= 0),
  amount           numeric(12,2) NOT NULL CHECK (amount >= 0),
  occupants        smallint NOT NULL DEFAULT 0,
  status           varchar(10) NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Cancelled')),
  issued_at        timestamptz NOT NULL DEFAULT now(),
  issued_by        varchar(20),
  UNIQUE (meter_id, bill_month)
);
COMMENT ON TABLE hostel.electricity_bill IS 'One room''s electricity for one month: units used beyond those included and recharged, at the approved rate';

CREATE TABLE hostel.electricity_bill_share (
  share_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bill_id        bigint NOT NULL REFERENCES hostel.electricity_bill(bill_id),
  student_id     varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  days_in_room   smallint NOT NULL CHECK (days_in_room > 0),
  share_pct      numeric(6,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  units          numeric(10,2) NOT NULL,
  amount         numeric(10,2) NOT NULL CHECK (amount >= 0),
  demand_id      bigint REFERENCES hostel.fee_demand(demand_id),
  UNIQUE (bill_id, student_id)
);
COMMENT ON TABLE hostel.electricity_bill_share IS 'A roommate''s equal share of the room''s bill, by days lived in the room that month; demand_id = their Electricity fee demand';
CREATE UNIQUE INDEX ux_fee_demand_elec_share ON hostel.fee_demand (reference_id) WHERE reference_type = 'electricity_bill_share';
CREATE TRIGGER trg_audit_electricity_bill AFTER INSERT OR UPDATE OR DELETE ON hostel.electricity_bill FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('bill_id');

-- The month's bills, for every meter with readings at both ends of the month that has no bill yet.
-- Returns the number of rooms billed. Run on the 1st for the month before (JobsService), or by Accounts.
CREATE OR REPLACE FUNCTION hostel.fn_generate_electricity_bills(p_month date) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE m0 date := date_trunc('month', p_month)::date; m1 date := (date_trunc('month', p_month) + interval '1 month')::date;
        u record; b bigint; n integer := 0; rate numeric; billable numeric; total numeric; tot_days numeric; s record; given numeric;
BEGIN
  PERFORM hostel.fn_rollup_meter_month(m0);
  FOR u IN SELECT mu.*, rm.space_id FROM hostel.meter_monthly_usage mu JOIN hostel.room_meter rm USING (meter_id)
            WHERE mu.usage_month = m0 AND mu.opening_reading IS NOT NULL AND mu.closing_reading IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM hostel.electricity_bill x WHERE x.meter_id = mu.meter_id AND x.bill_month = m0) LOOP
    SELECT t.rate_per_unit INTO rate FROM hostel.room_profile rp JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id
     WHERE rp.space_id = u.space_id AND t.approved_by IS NOT NULL AND m0 >= t.effective_from AND (t.effective_to IS NULL OR m0 <= t.effective_to)
     ORDER BY t.effective_from DESC LIMIT 1;
    CONTINUE WHEN rate IS NULL;                                   -- no approved tariff: nothing can be billed
    billable := greatest(0, u.units_used - u.included_units - u.recharged_units);
    total := round(billable * rate, 2);
    INSERT INTO hostel.electricity_bill (meter_id, space_id, bill_month, opening_reading, closing_reading, included_units, recharged_units, billable_units, rate_per_unit, amount, issued_by)
    VALUES (u.meter_id, u.space_id, m0, u.opening_reading, u.closing_reading, u.included_units, u.recharged_units, billable, rate, total, 'system') RETURNING bill_id INTO b;

    -- the students who lived in the room, and for how many days of the month
    CREATE TEMP TABLE IF NOT EXISTS _occ (student_id varchar(20), days numeric) ON COMMIT DROP;
    TRUNCATE _occ;
    INSERT INTO _occ
    SELECT a.student_id, sum(least(coalesce(a.vacate_date + 1, m1), m1) - greatest(a.allocation_date, m0))
      FROM hostel.hostel_allocation a JOIN infra.subspace ss ON ss.subspace_id = a.subspace_id
     WHERE ss.space_id = u.space_id AND a.occupant_type = 'Student' AND a.status IN ('Active', 'Vacated', 'Transferred')
       AND a.allocation_date < m1 AND coalesce(a.vacate_date + 1, m1) > m0
     GROUP BY a.student_id HAVING sum(least(coalesce(a.vacate_date + 1, m1), m1) - greatest(a.allocation_date, m0)) > 0;
    SELECT sum(days) INTO tot_days FROM _occ;
    CONTINUE WHEN tot_days IS NULL;
    UPDATE hostel.electricity_bill SET occupants = (SELECT count(*) FROM _occ) WHERE bill_id = b;

    given := 0;
    FOR s IN SELECT * FROM _occ ORDER BY student_id LOOP
      INSERT INTO hostel.electricity_bill_share (bill_id, student_id, days_in_room, share_pct, units, amount)
      VALUES (b, s.student_id, s.days, round(100 * s.days / tot_days, 2), round(billable * s.days / tot_days, 2), round(total * s.days / tot_days, 2));
      given := given + round(total * s.days / tot_days, 2);
    END LOOP;
    -- rounding: the paise left over go to the first share, so the shares add up to the bill
    UPDATE hostel.electricity_bill_share SET amount = amount + (total - given)
     WHERE share_id = (SELECT min(share_id) FROM hostel.electricity_bill_share WHERE bill_id = b) AND total <> given;

    -- each share becomes an Electricity fee demand, due on the 15th of the next month
    WITH d AS (
      INSERT INTO hostel.fee_demand (student_id, fee_head, instalment_no, amount_due, due_date, amount_paid, status, reference_type, reference_id, created_by)
      SELECT sh.student_id, 'Electricity', 1, sh.amount, m1 + 14, 0, 'Pending', 'electricity_bill_share', sh.share_id, 'system'
        FROM hostel.electricity_bill_share sh WHERE sh.bill_id = b AND sh.amount > 0
      RETURNING demand_id, reference_id)
    UPDATE hostel.electricity_bill_share sh SET demand_id = d.demand_id FROM d WHERE sh.share_id = d.reference_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
COMMENT ON FUNCTION hostel.fn_generate_electricity_bills(date) IS 'Bills every metered room for the month and shares each bill among its occupants by days lived there';

-- Fix to 060: the monthly roll-up failed for a meter with no reading before the month (a new meter): it tried to
-- store a blank opening reading. Such a meter is now left out until it has readings at both ends of the month.
CREATE OR REPLACE FUNCTION hostel.fn_rollup_meter_month(p_month date) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_from timestamptz := date_trunc('month', p_month); v_to timestamptz := date_trunc('month', p_month) + interval '1 month'; n integer;
BEGIN
  INSERT INTO hostel.meter_monthly_usage (meter_id, usage_month, opening_reading, closing_reading, included_units, recharged_units)
  SELECT * FROM (
    SELECT rm.meter_id, v_from::date,
           (SELECT reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at <  v_from ORDER BY reading_at DESC LIMIT 1) AS opening,
           (SELECT reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at <  v_to   ORDER BY reading_at DESC LIMIT 1) AS closing,
           coalesce((SELECT t.included_units_per_month FROM hostel.room_profile rp JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id
                      AND v_from::date >= t.effective_from AND (t.effective_to IS NULL OR v_from::date <= t.effective_to) WHERE rp.space_id = rm.space_id
                      ORDER BY t.effective_from DESC LIMIT 1), 0),
           coalesce((SELECT sum(units_credited) FROM hostel.meter_recharge mr WHERE mr.meter_id = rm.meter_id AND mr.status = 'Credited' AND mr.created_at >= v_from AND mr.created_at < v_to), 0)
    FROM hostel.room_meter rm WHERE rm.status = 'Active') x
  WHERE x.opening IS NOT NULL AND x.closing IS NOT NULL
  ON CONFLICT (meter_id, usage_month) DO UPDATE SET opening_reading = EXCLUDED.opening_reading, closing_reading = EXCLUDED.closing_reading,
     included_units = EXCLUDED.included_units, recharged_units = EXCLUDED.recharged_units, computed_at = now();
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

-- The design document's Item list (Light, Fan, ..., Other) is kept on the ticket; the finer catalogue item is in item_code.
ALTER TABLE hostel.ticket_item ADD COLUMN IF NOT EXISTS doc_item varchar(40) NOT NULL DEFAULT 'Other'
  CHECK (doc_item IN ('Light', 'Fan', 'Air_Conditioner', 'Socket', 'Cot', 'Table', 'Chair', 'Cupboard', 'Door', 'Tap', 'Flush', 'Drain', 'Other'));
COMMENT ON COLUMN hostel.ticket_item.doc_item IS 'The matching value of maintenance_ticket.item (v2.1 list)';
UPDATE hostel.ticket_item SET doc_item = v.d FROM (VALUES ('R-FAN', 'Fan'), ('R-LIGHT', 'Light'), ('R-SOCKET', 'Socket'), ('R-BED', 'Cot'), ('R-TABLE', 'Table'),
  ('R-WARD', 'Cupboard'), ('R-DOOR', 'Door'), ('R-TAP', 'Tap'), ('R-TOILET', 'Flush'), ('R-DRAIN', 'Drain'), ('M-FAN', 'Fan'), ('M-FURN', 'Table'),
  ('M-WASH', 'Tap'), ('C-CORRLIGHT', 'Light'), ('C-WASHROOM', 'Flush')) v(c, d) WHERE item_code = v.c;
ALTER TABLE infra.maintenance_ticket ADD COLUMN IF NOT EXISTS item_code varchar(20) REFERENCES hostel.ticket_item(item_code);
COMMENT ON COLUMN infra.maintenance_ticket.item_code IS 'What the student reported, from hostel.ticket_item (finer than item)';
