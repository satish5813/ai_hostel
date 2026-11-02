-- 130: a staff member's mobile is optional. Nothing sends SMS or WhatsApp yet; the number is only shown (roster,
-- floor staff, room QR page), so a staff list without mobiles (Lotus, 2026-11) can still be loaded and given logins.
alter table ref.staff_master alter column mobile_no drop not null;
