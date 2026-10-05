-- =====================================================================
-- 120  Uploads for going live, 5 Oct 2026: what already exists before the system starts.
--   Opening_Fee        fees already due and paid this year (a demand, and a receipt for what was paid)
--   Opening_Deposit    caution and electricity deposits already held
--   Meter_Reading      every room meter's reading on the start date
--   Mess_Subscription  which mess each resident eats in, veg or non-veg, south or north
-- (the fees upload also takes the two deposits and the meter charge; see apps/api/src/admin/import.service.ts)
-- =====================================================================
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Opening_Fee';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Opening_Deposit';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Meter_Reading';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Mess_Subscription';
-- fees already paid by bank transfer or cheque, before the system and at the counter
ALTER TYPE hostel.payment_mode ADD VALUE IF NOT EXISTS 'NEFT';
ALTER TYPE hostel.payment_mode ADD VALUE IF NOT EXISTS 'RTGS';
ALTER TYPE hostel.payment_mode ADD VALUE IF NOT EXISTS 'Cheque';
