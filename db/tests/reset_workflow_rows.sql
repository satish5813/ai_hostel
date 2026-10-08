-- Development only: wipe every Workflow A–F transaction row so scripts/api-smoke.sh can run again on the fixtures.
BEGIN;
DELETE FROM hostel.location_access_log; DELETE FROM hostel.hostel_alert; DELETE FROM hostel.student_current_status; DELETE FROM hostel.tracking_consent;
DELETE FROM shared.approval_step; DELETE FROM shared.notification; DELETE FROM hostel.sick_meal_delivery; DELETE FROM hostel.sick_leave;
ALTER TABLE hostel.movement_event DISABLE TRIGGER trg_movement_immutable; DELETE FROM hostel.movement_event; ALTER TABLE hostel.movement_event ENABLE TRIGGER trg_movement_immutable;
DELETE FROM hostel.outpass; DELETE FROM hostel.meter_recharge;
ALTER TABLE hostel.meter_student_map DISABLE TRIGGER trg_meter_map_guard; DELETE FROM hostel.meter_student_map; ALTER TABLE hostel.meter_student_map ENABLE TRIGGER trg_meter_map_guard;
ALTER TABLE hostel.meter_reading DISABLE TRIGGER trg_meter_reading_immutable; DELETE FROM hostel.meter_reading; ALTER TABLE hostel.meter_reading ENABLE TRIGGER trg_meter_reading_immutable;
DELETE FROM hostel.room_handover_line; DELETE FROM hostel.room_handover; DELETE FROM hostel.hostel_allocation; DELETE FROM hostel.mess_subscription;
UPDATE hostel.hostel_registration SET reg_demand_id = NULL;
ALTER TABLE hostel.fee_receipt DISABLE TRIGGER trg_receipt_guard; DELETE FROM hostel.fee_receipt; ALTER TABLE hostel.fee_receipt ENABLE TRIGGER trg_receipt_guard;
DELETE FROM hostel.fee_demand; DELETE FROM hostel.fee_plan; DELETE FROM hostel.room_offer; DELETE FROM hostel.hostel_registration;
UPDATE infra.subspace SET status = 'Vacant'; UPDATE ref.student_master SET is_hosteller = false;
COMMIT;
