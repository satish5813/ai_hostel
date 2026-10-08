-- =====================================================================
-- 096  Allotment approvals in two levels (design "Room Allotment", 2 Oct 2026)
--      L1 Warden verifies the fees (fee_check_status, 094) -> L2 Chief Warden approves the bed (cw_status, here).
--      Check-in needs both. A return at either level sends the student back with remarks (fee_check_status = Query).
--      Block reasons gain the design's "Reserved for first-years" and "Visiting faculty".
-- =====================================================================
ALTER TYPE hostel.block_reason ADD VALUE IF NOT EXISTS 'First_Years';
ALTER TYPE hostel.block_reason ADD VALUE IF NOT EXISTS 'Visiting_Faculty';

ALTER TABLE hostel.hostel_registration
  ADD COLUMN cw_status  varchar(10) NOT NULL DEFAULT 'Pending' CHECK (cw_status IN ('Pending','Approved')),
  ADD COLUMN cw_by      varchar(20) REFERENCES ref.staff_master,
  ADD COLUMN cw_on      timestamptz,
  ADD CONSTRAINT ck_cw_approved CHECK (cw_status = 'Pending' OR (cw_by IS NOT NULL AND cw_on IS NOT NULL));
-- students already in a room went through the old flow
UPDATE hostel.hostel_registration r SET cw_status = 'Approved', cw_by = coalesce(r.fee_checked_by, (SELECT staff_id FROM ref.staff_master ORDER BY staff_id LIMIT 1)), cw_on = now()
WHERE r.status = 'Checked_In';

-- check-in needs the Warden's fee check (L1) and the Chief Warden's approval (L2)
CREATE OR REPLACE FUNCTION hostel.fn_allocation_fee_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_check varchar; v_cw varchar; v_no varchar;
BEGIN
  IF NEW.occupant_type = 'Student' AND NEW.offer_id IS NOT NULL THEN
    SELECT r.fee_check_status, r.cw_status, r.registration_no INTO v_check, v_cw, v_no
      FROM hostel.room_offer o JOIN hostel.hostel_registration r ON r.registration_id = o.registration_id WHERE o.offer_id = NEW.offer_id;
    IF v_check IS DISTINCT FROM 'Verified' THEN
      RAISE EXCEPTION 'Registration %: the Warden has not verified the fees yet', v_no USING ERRCODE = 'check_violation';
    END IF;
    IF v_cw IS DISTINCT FROM 'Approved' THEN
      RAISE EXCEPTION 'Registration %: the Chief Warden has not approved the allotment yet', v_no USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- the mapping from a file approves both levels at once (residents already living in the bed)
CREATE OR REPLACE FUNCTION hostel.fn_map_student_bed_cw() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fee_check_remarks = 'Mapped from a file' AND NEW.fee_check_status = 'Verified' AND NEW.cw_status = 'Pending' THEN
    NEW.cw_status := 'Approved'; NEW.cw_by := NEW.fee_checked_by; NEW.cw_on := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_map_student_bed_cw BEFORE UPDATE OF fee_check_status ON hostel.hostel_registration FOR EACH ROW EXECUTE FUNCTION hostel.fn_map_student_bed_cw();

-- v_registration carries the L2 approval (columns appended)
CREATE OR REPLACE VIEW hostel.v_registration AS
SELECT r.registration_id, r.registration_no, r.student_id, sm.full_name, sm.gender, sm.programme, r.academic_year,
       r.facility_id, hp.hostel_code, r.room_type_id, rt.type_name, r.status, r.applied_on, r.waitlist_no,
       rd.status AS registration_fee_status, rd.amount_due AS registration_fee,
       fp.fee_plan_id, fp.plan_type, fp.status AS plan_status,
       (SELECT coalesce(sum(amount_due),0) FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_due,
       (SELECT coalesce(sum(amount_paid),0) FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_paid,
       o.offer_id, o.subspace_id, o.student_decision, o.hold_until,
       a.hostel_alloc_id, a.allocation_date, a.key_no,
       r.fee_check_status, r.fee_check_remarks, f.facility_name AS hostel_name, (o.offer_id IS NOT NULL AND o.offered_by IS NULL) AS self_chosen,
       r.cw_status, r.cw_on
FROM hostel.hostel_registration r
JOIN ref.student_master sm ON sm.student_id = r.student_id
JOIN hostel.hostel_profile hp ON hp.facility_id = r.facility_id
JOIN infra.facility f ON f.facility_id = r.facility_id
JOIN hostel.room_type rt ON rt.room_type_id = r.room_type_id
LEFT JOIN hostel.fee_demand rd ON rd.demand_id = r.reg_demand_id
LEFT JOIN hostel.fee_plan fp ON fp.registration_id = r.registration_id
LEFT JOIN hostel.room_offer o ON o.registration_id = r.registration_id AND o.student_decision IN ('Pending','Accepted')
LEFT JOIN hostel.hostel_allocation a ON a.offer_id = o.offer_id;
