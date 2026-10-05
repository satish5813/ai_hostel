-- =====================================================================
-- 113  Duties by room range, 4 Oct 2026.
--   When fewer Floor Wardens (or sweepers) are present than there are floors, Auto-assign shares all the rooms of the
--   hostel, in floor and room order, equally among those present: each person takes one unbroken run of rooms, which
--   may end part-way up a floor. A floor can therefore have more than one person for a role, each with a room range.
--   An empty range means the whole floor.
-- =====================================================================
ALTER TABLE hostel.daily_duty
  ADD COLUMN IF NOT EXISTS room_from varchar(30) REFERENCES infra.space(space_id),
  ADD COLUMN IF NOT EXISTS room_to   varchar(30) REFERENCES infra.space(space_id),
  ADD COLUMN IF NOT EXISTS rooms     smallint CHECK (rooms > 0);
ALTER TABLE hostel.daily_duty ADD CONSTRAINT ck_daily_duty_range CHECK ((room_from IS NULL) = (room_to IS NULL) AND (room_from IS NULL OR zone_id IS NOT NULL));
COMMENT ON COLUMN hostel.daily_duty.room_from IS 'First room of this person''s share of the floor; empty = the whole floor';
COMMENT ON COLUMN hostel.daily_duty.room_to IS 'Last room of the share';
COMMENT ON COLUMN hostel.daily_duty.rooms IS 'Rooms in the share (or on the floor)';
DROP INDEX IF EXISTS hostel.ux_daily_duty_slot;
CREATE UNIQUE INDEX ux_daily_duty_slot ON hostel.daily_duty (duty_date, facility_id, coalesce(zone_id, ''), coalesce(space_id, ''), hostel_role, shift, coalesce(room_from, ''));
