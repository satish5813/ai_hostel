-- Demo data for room electricity bills (dev only; run after migration 110):
--   a meter in every occupied room, readings at the end of July, August and September, an approved tariff for
--   every occupied room type, the August and September bills shared among roommates, and most of August paid.
--   Safe to run again: meters, readings and bills that exist are kept.
BEGIN;
SELECT setseed(0.31);

-- an approved tariff for every room type that has students (Pro-VC Finance approves tariffs)
INSERT INTO hostel.electricity_tariff (room_type_id, included_units_per_month, rate_per_unit, effective_from, approved_by, created_by)
SELECT DISTINCT b.room_type_id, 75, 8.50, DATE '2026-07-01', 'S-PV', 'S-AC' FROM hostel.v_bed b
 WHERE b.occupant_type = 'Student' AND NOT EXISTS (SELECT 1 FROM hostel.electricity_tariff t WHERE t.room_type_id = b.room_type_id);

-- a meter in every occupied room
INSERT INTO hostel.room_meter (space_id, meter_no, meter_type, device_ref, installed_on, status, created_by)
SELECT DISTINCT b.space_id, 'EM-' || replace(b.space_id, '-', ''), 'Smart_Prepaid'::hostel.meter_type, 'DEV-' || replace(b.space_id, '-', ''), DATE '2026-07-15', 'Active'::hostel.meter_status, 'S-MT'
  FROM hostel.v_bed b WHERE b.occupant_type = 'Student' AND NOT EXISTS (SELECT 1 FROM hostel.room_meter m WHERE m.space_id = b.space_id);

-- readings on the last evening of July, August and September, counting back from the first reading in October
DO $$
DECLARE m record; oct numeric; sep numeric; aug numeric; use_sep numeric; use_aug numeric;
BEGIN
  FOR m IN SELECT rm.meter_id, rm.space_id, (SELECT sharing_count FROM hostel.v_bed b WHERE b.space_id = rm.space_id LIMIT 1) AS beds
             FROM hostel.room_meter rm WHERE rm.status = 'Active' LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM hostel.meter_reading r WHERE r.meter_id = m.meter_id AND r.reading_at < TIMESTAMPTZ '2026-10-01 00:00+05:30');
    oct := coalesce((SELECT min(reading_kwh) FROM hostel.meter_reading r WHERE r.meter_id = m.meter_id), 900 + abs(hashtext(m.space_id)) % 900);
    use_sep := round((55 + random() * 45) * coalesce(m.beds, 2));    -- 55 to 100 units a student a month
    use_aug := round((50 + random() * 40) * coalesce(m.beds, 2));
    sep := greatest(0, oct - use_sep); aug := greatest(0, sep - use_aug);
    INSERT INTO hostel.meter_reading (meter_id, reading_at, reading_kwh, source, read_by, created_by) VALUES
      (m.meter_id, TIMESTAMPTZ '2026-07-31 23:55+05:30', aug, 'Auto', NULL, 'system'),
      (m.meter_id, TIMESTAMPTZ '2026-08-31 23:55+05:30', sep, 'Auto', NULL, 'system'),
      (m.meter_id, TIMESTAMPTZ '2026-09-30 23:55+05:30', oct, 'Auto', NULL, 'system');
  END LOOP;
END $$;

-- the demo residents were given their rooms by scripts on the day the demo was built; they live there from the start of
-- term, so August and September have someone to share each room's bill
UPDATE hostel.hostel_allocation SET allocation_date = DATE '2026-07-25', updated_by = 'system'
 WHERE status = 'Active' AND occupant_type = 'Student' AND allocation_date > DATE '2026-08-01';

SELECT hostel.fn_generate_electricity_bills('2026-08-01') AS august_bills, hostel.fn_generate_electricity_bills('2026-09-01') AS september_bills;

-- most students paid August, about half have paid September so far
UPDATE hostel.fee_demand d SET amount_paid = d.amount_due, status = 'Paid', updated_by = d.student_id
  FROM hostel.electricity_bill_share s JOIN hostel.electricity_bill b USING (bill_id)
 WHERE d.demand_id = s.demand_id AND d.status = 'Pending'
   AND ((b.bill_month = '2026-08-01' AND abs(hashtext(s.student_id)) % 10 < 8) OR (b.bill_month = '2026-09-01' AND abs(hashtext(s.student_id)) % 10 < 5));
COMMIT;

SELECT to_char(b.bill_month, 'Mon') AS month, count(*) AS rooms, sum(b.units_used) AS units, sum(b.billable_units) AS billable, sum(b.amount) AS billed,
       sum((SELECT count(*) FROM hostel.electricity_bill_share s WHERE s.bill_id = b.bill_id)) AS shares,
       sum((SELECT coalesce(sum(d.amount_paid), 0) FROM hostel.electricity_bill_share s JOIN hostel.fee_demand d ON d.demand_id = s.demand_id WHERE s.bill_id = b.bill_id)) AS paid
  FROM hostel.electricity_bill b GROUP BY b.bill_month ORDER BY b.bill_month;
