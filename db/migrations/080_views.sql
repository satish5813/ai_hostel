-- =====================================================================
-- 080  views used by the application and reports (Workflows A–F)
-- =====================================================================

-- a bed with its room, floor, hostel and room type, plus current occupant (occupancy board)
CREATE VIEW hostel.v_bed AS
SELECT ss.subspace_id, ss.subspace_code AS bed_code, ss.status AS bed_status,
       s.space_id, s.space_code AS room_code, s.space_name AS room_name, s.status AS room_status,
       z.zone_id, z.zone_name AS floor_name, z.sequence_no AS floor_no,
       f.facility_id, f.facility_name AS hostel_name, hp.hostel_code, hp.hostel_gender,
       rp.room_type_id, rt.type_name, rt.sharing_count, rt.is_ac, rp.is_accessible, rp.reserved_for,
       a.hostel_alloc_id, a.occupant_type, a.student_id, a.staff_id, a.allocation_date
FROM infra.subspace ss
JOIN infra.space s ON s.space_id = ss.space_id
JOIN infra.zone z ON z.zone_id = s.zone_id
JOIN infra.facility f ON f.facility_id = z.facility_id
JOIN hostel.hostel_profile hp ON hp.facility_id = f.facility_id
LEFT JOIN hostel.room_profile rp ON rp.space_id = s.space_id
LEFT JOIN hostel.room_type rt ON rt.room_type_id = rp.room_type_id
LEFT JOIN hostel.hostel_allocation a ON a.subspace_id = ss.subspace_id AND a.status = 'Active'
WHERE ss.subspace_type = 'Bed' AND s.space_category = 'Hostel_Room';

-- vacancy per hostel and room type for the allotment desk
CREATE VIEW hostel.v_vacancy AS
SELECT facility_id, hostel_name, hostel_code, hostel_gender, room_type_id, type_name,
       count(*) FILTER (WHERE bed_status = 'Vacant' AND room_status <> 'Under_Maintenance' AND reserved_for = 'None') AS vacant_beds,
       count(*) FILTER (WHERE bed_status = 'Held') AS held_beds,
       count(*) FILTER (WHERE bed_status = 'Occupied') AS occupied_beds,
       count(*) AS total_beds
FROM hostel.v_bed GROUP BY 1,2,3,4,5,6;

-- a student's registration with the money owed and the current stay
CREATE VIEW hostel.v_registration AS
SELECT r.registration_id, r.registration_no, r.student_id, sm.full_name, sm.gender, sm.programme, r.academic_year,
       r.facility_id, hp.hostel_code, r.room_type_id, rt.type_name, r.status, r.applied_on, r.waitlist_no,
       rd.status AS registration_fee_status, rd.amount_due AS registration_fee,
       fp.fee_plan_id, fp.plan_type, fp.status AS plan_status,
       (SELECT coalesce(sum(amount_due),0) FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_due,
       (SELECT coalesce(sum(amount_paid),0) FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_paid,
       o.offer_id, o.subspace_id, o.student_decision, o.hold_until,
       a.hostel_alloc_id, a.allocation_date, a.key_no
FROM hostel.hostel_registration r
JOIN ref.student_master sm ON sm.student_id = r.student_id
JOIN hostel.hostel_profile hp ON hp.facility_id = r.facility_id
JOIN hostel.room_type rt ON rt.room_type_id = r.room_type_id
LEFT JOIN hostel.fee_demand rd ON rd.demand_id = r.reg_demand_id
LEFT JOIN hostel.fee_plan fp ON fp.registration_id = r.registration_id
LEFT JOIN hostel.room_offer o ON o.registration_id = r.registration_id AND o.student_decision IN ('Pending','Accepted')
LEFT JOIN hostel.hostel_allocation a ON a.offer_id = o.offer_id;

-- B rule: every floor with occupied beds has an Active Floor Warden; the software reports floors without one
CREATE VIEW hostel.v_floors_without_warden AS
SELECT b.facility_id, b.hostel_name, b.zone_id, b.floor_name, count(*) AS occupied_beds
FROM hostel.v_bed b
WHERE b.bed_status = 'Occupied'
  AND NOT EXISTS (SELECT 1 FROM hostel.staff_space_assignment a WHERE a.facility_id = b.facility_id AND a.zone_id = b.zone_id AND a.hostel_role = 'Floor_Warden' AND a.status = 'Active')
GROUP BY 1,2,3,4;

-- the QR page for a space: responsible people with phone numbers (Show_On_QR)
CREATE VIEW hostel.v_space_qr_page AS
SELECT q.qr_token, s.space_id, s.space_code, s.space_name, s.space_category, z.zone_name, f.facility_name,
       a.hostel_role, st.full_name, st.mobile_no, a.shift
FROM hostel.space_qr q
JOIN infra.space s ON s.space_id = q.space_id
JOIN infra.zone z ON z.zone_id = s.zone_id
JOIN infra.facility f ON f.facility_id = z.facility_id
JOIN hostel.staff_space_assignment a ON a.facility_id = f.facility_id AND a.status = 'Active' AND a.show_on_qr
     AND (a.space_id = s.space_id OR (a.space_id IS NULL AND (a.zone_id = z.zone_id OR a.zone_id IS NULL)))
JOIN ref.staff_master st ON st.staff_id = a.staff_id
WHERE q.status = 'Active';

-- C: live meter position per occupied room: last reading, units used this month against the included units
--    (month opening = last reading before the month, else the first reading in the month; recharges count once paid)
CREATE VIEW hostel.v_meter_position AS
SELECT rm.meter_id, rm.meter_no, rm.space_id, s.space_code, rp.room_type_id,
       lr.reading_kwh AS last_reading, lr.reading_at AS last_reading_at,
       coalesce(mo.reading_kwh, fm.reading_kwh) AS month_opening,
       lr.reading_kwh - coalesce(mo.reading_kwh, fm.reading_kwh) AS units_this_month,
       t.included_units_per_month,
       rc.units AS recharged_this_month,
       coalesce(t.included_units_per_month, 0) + rc.units - coalesce(lr.reading_kwh - coalesce(mo.reading_kwh, fm.reading_kwh), 0) AS units_left,
       t.rate_per_unit
FROM hostel.room_meter rm
JOIN infra.space s ON s.space_id = rm.space_id
JOIN hostel.room_profile rp ON rp.space_id = rm.space_id
LEFT JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id AND current_date >= t.effective_from AND (t.effective_to IS NULL OR current_date <= t.effective_to)
LEFT JOIN LATERAL (SELECT reading_kwh, reading_at FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id ORDER BY reading_at DESC LIMIT 1) lr ON true
LEFT JOIN LATERAL (SELECT reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at <  date_trunc('month', now()) ORDER BY reading_at DESC LIMIT 1) mo ON true
LEFT JOIN LATERAL (SELECT reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at >= date_trunc('month', now()) ORDER BY reading_at ASC  LIMIT 1) fm ON true
LEFT JOIN LATERAL (SELECT coalesce(sum(units_credited), 0) AS units FROM hostel.meter_recharge mr WHERE mr.meter_id = rm.meter_id AND mr.status IN ('Paid','Credited') AND date_trunc('month', mr.created_at) = date_trunc('month', now())) rc ON true
WHERE rm.status = 'Active';

-- D: where every hosteller is, for wardens and security (every read must also write location_access_log)
CREATE VIEW hostel.v_student_location AS
SELECT sm.student_id, sm.full_name, sm.gender, sm.programme, st.facility_id, st.zone_id, st.space_id, st.subspace_id,
       cs.current_status, cs.last_event_at, cp.point_name AS last_point, me.direction AS last_direction
FROM ref.student_master sm
JOIN hostel.fn_student_stay(sm.student_id) st ON true
LEFT JOIN hostel.student_current_status cs ON cs.student_id = sm.student_id
LEFT JOIN hostel.movement_event me ON me.event_id = cs.last_event_id AND me.event_at = cs.last_event_at
LEFT JOIN hostel.capture_point cp ON cp.point_id = me.point_id
WHERE sm.is_hosteller;

-- E: an outpass with the state of each level, for the approval inbox and the gate
CREATE VIEW hostel.v_outpass AS
SELECT o.outpass_id, o.outpass_no, o.student_id, sm.full_name, st.facility_id, st.zone_id, o.reason, o.destination,
       o.leave_from, o.return_by, o.outing_category, o.levels_required, o.contact_during_leave, o.status, o.qr_token,
       o.actual_out_at, o.actual_in_at, o.late_by_minutes, o.applied_on,
       (SELECT jsonb_agg(jsonb_build_object('level', s.level, 'role', s.approver_role, 'decision', s.decision,
                                            'by', coalesce(st.full_name, c.contact_name || ' (' || c.relation || ')'), 'on', s.decided_on, 'remarks', s.remarks) ORDER BY s.level)
          FROM shared.approval_step s LEFT JOIN ref.staff_master st ON st.staff_id = s.acted_by LEFT JOIN hostel.student_contact c ON c.contact_id = s.acted_by_contact
          WHERE s.request_type = 'Outpass' AND s.request_id = o.outpass_id) AS steps
FROM hostel.outpass o
JOIN ref.student_master sm ON sm.student_id = o.student_id
LEFT JOIN hostel.fn_student_stay(o.student_id) st ON true;

-- F: today's mess sick list — who gets food in the room and in which slot
CREATE VIEW hostel.v_mess_sick_list AS
SELECT d.meal_date, d.slot, sl.sick_leave_id, sl.student_id, sm.full_name, st.facility_id, st.space_id,
       ms.mess_id, ms.cuisine, d.status, d.delivered_by, d.delivered_at
FROM hostel.sick_meal_delivery d
JOIN hostel.sick_leave sl ON sl.sick_leave_id = d.sick_leave_id AND sl.status = 'Approved'
JOIN ref.student_master sm ON sm.student_id = sl.student_id
LEFT JOIN hostel.fn_student_stay(sl.student_id) st ON true
LEFT JOIN hostel.mess_subscription ms ON ms.student_id = sl.student_id AND ms.status = 'Active';

-- a student's dues across every head (accounts desk, no-dues clearance)
CREATE VIEW hostel.v_student_dues AS
SELECT d.student_id, d.fee_head, count(*) AS demands,
       sum(d.amount_due) AS amount_due, sum(d.amount_paid) AS amount_paid, sum(d.amount_due - d.amount_paid) FILTER (WHERE d.status <> 'Waived') AS balance,
       min(d.due_date) FILTER (WHERE d.status IN ('Pending','Part_Paid','Overdue')) AS earliest_due
FROM hostel.fee_demand d GROUP BY 1,2;
