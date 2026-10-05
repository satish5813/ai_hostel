-- Demo repair tickets (dev only; run after migration 110): about forty tickets from residents over the last 25 days,
-- for rooms, the mess and common facilities, at every stage, each with its history. Safe to run again: the demo tickets
-- (students' tickets with one of the demo descriptions below) are replaced.
BEGIN;
SELECT setseed(0.23);
CREATE TEMP TABLE demo_text (t text) ON COMMIT DROP;
INSERT INTO demo_text VALUES ('Not working since yesterday'), ('Making a lot of noise'), ('Leaking all night'), ('Broken, needs replacing'), ('Very dirty, please clean'),
  ('Not working properly'), ('Stopped suddenly this morning'), ('Loose and unsafe');
DELETE FROM hostel.ticket_event WHERE ticket_id IN (SELECT ticket_id FROM infra.maintenance_ticket WHERE raiser_type = 'Student' AND description IN (SELECT t FROM demo_text));
DELETE FROM infra.maintenance_ticket WHERE raiser_type = 'Student' AND description IN (SELECT t FROM demo_text);

DO $$
DECLARE r record; i int := 0; it record; t bigint; raised timestamptz; fate text; ev int; warden text; fixer text;
  texts text[] := ARRAY['Not working since yesterday', 'Making a lot of noise', 'Leaking all night', 'Broken, needs replacing', 'Very dirty, please clean',
                        'Not working properly', 'Stopped suddenly this morning', 'Loose and unsafe'];
BEGIN
  FOR r IN SELECT v.student_id, v.facility_id, v.space_id, (SELECT zone_id FROM infra.space s WHERE s.space_id = v.space_id) AS zone_id
             FROM hostel.v_bed v WHERE v.occupant_type = 'Student' AND v.student_id IS NOT NULL ORDER BY random() LIMIT 40 LOOP
    i := i + 1;
    SELECT ti.*, c.default_sla_hours AS sla FROM hostel.ticket_item ti JOIN infra.maintenance_category c USING (category_id)
     WHERE ti.area = CASE WHEN i % 5 = 0 THEN 'Mess' WHEN i % 4 = 0 THEN 'Common' ELSE 'Room' END ORDER BY random() LIMIT 1 INTO it;
    raised := now() - make_interval(hours => (random() * 600)::int + 2);
    fate := CASE WHEN raised < now() - interval '6 days' THEN (ARRAY['closed', 'closed', 'closed', 'closed', 'rejected', 'reopened_closed'])[1 + floor(random() * 6)::int]
                 WHEN raised < now() - interval '2 days' THEN (ARRAY['closed', 'resolved', 'repairing', 'late'])[1 + floor(random() * 4)::int]
                 ELSE (ARRAY['open', 'assigned', 'repairing', 'resolved'])[1 + floor(random() * 4)::int] END;
    warden := CASE WHEN it.area = 'Mess' THEN 'S-MS' ELSE coalesce((SELECT a.staff_id FROM hostel.staff_space_assignment a WHERE a.facility_id = r.facility_id AND a.status = 'Active'
                AND a.hostel_role IN ('Floor_Warden', 'Warden', 'Chief_Warden') ORDER BY a.hostel_role = 'Floor_Warden' DESC LIMIT 1), 'S-FW') END;
    fixer := CASE WHEN it.area = 'Mess' THEN 'S-MS' ELSE 'S-MT' END;
    INSERT INTO infra.maintenance_ticket (raised_by, raiser_type, facility_id, space_id, category_id, description, priority, raised_date, deadline_at, source, area, item, item_code, location_note, ticket_group,
        status, l1_decision, l1_by, l1_at, l1_remarks, escalated_at, closure_due_at, supervisor_id, assigned_date, resolved_date, closure_report, resolution_notes, closure_by, closure_at, student_confirmed, work_not_done, verified_at)
    VALUES (r.student_id, 'Student', r.facility_id, CASE WHEN it.area = 'Room' THEN r.space_id END, it.category_id, texts[1 + (i % 8)], it.priority, raised,
        raised + make_interval(hours => it.sla), 'Student_QR', it.area, it.doc_item, it.item_code,
        CASE WHEN it.area = 'Common' THEN (ARRAY['Ground floor lobby', '1st floor corridor', '2nd floor, east wing', 'Near the reading room', 'Main staircase'])[1 + (i % 5)] END,
        CASE it.category_id WHEN 'ELEC' THEN 'Electrical' WHEN 'CARP' THEN 'Furniture_Doors' WHEN 'PLUMB' THEN 'Plumbing' ELSE 'Other' END,
        (CASE fate WHEN 'open' THEN 'Open' WHEN 'assigned' THEN 'Assigned' WHEN 'repairing' THEN 'In_Progress' WHEN 'late' THEN 'In_Progress' WHEN 'resolved' THEN 'Resolved' ELSE 'Closed' END)::infra.ticket_status,
        CASE fate WHEN 'open' THEN NULL WHEN 'rejected' THEN 'Not_Genuine' ELSE 'Genuine' END,
        CASE WHEN fate <> 'open' THEN warden END, CASE WHEN fate <> 'open' THEN raised + interval '3 hours' END,
        CASE fate WHEN 'rejected' THEN 'Checked; working normally' WHEN 'open' THEN NULL ELSE 'Checked, genuine' END,
        CASE WHEN fate NOT IN ('open', 'rejected') THEN raised + interval '3 hours' END,
        CASE WHEN fate NOT IN ('open', 'rejected') THEN raised + interval '3 hours' + make_interval(hours => CASE WHEN fate = 'late' THEN 6 ELSE it.sla END) END,
        CASE WHEN fate IN ('repairing', 'late', 'resolved', 'closed', 'reopened_closed') THEN fixer END,
        CASE WHEN fate IN ('repairing', 'late', 'resolved', 'closed', 'reopened_closed') THEN raised + interval '5 hours' END,
        CASE WHEN fate IN ('resolved', 'closed', 'reopened_closed') THEN raised + make_interval(hours => 6 + (random() * least(it.sla, 40))::int) END,
        CASE WHEN fate IN ('resolved', 'closed', 'reopened_closed') THEN 'Repaired and tested' END, CASE WHEN fate IN ('resolved', 'closed', 'reopened_closed') THEN 'Repaired and tested' END,
        CASE WHEN fate IN ('resolved', 'closed', 'reopened_closed') THEN fixer END,
        CASE WHEN fate IN ('resolved', 'closed', 'reopened_closed') THEN raised + make_interval(hours => 6 + (random() * least(it.sla, 40))::int) END,
        CASE WHEN fate IN ('closed', 'reopened_closed') THEN true END, fate = 'reopened_closed',
        CASE WHEN fate IN ('closed', 'reopened_closed') THEN raised + interval '2 days' END)
    RETURNING ticket_id INTO t;
    ev := 0;
    INSERT INTO hostel.ticket_event (ticket_id, event_no, action, actor_id, role_code, event_at, note, created_by) VALUES (t, 1, 'Raised', NULL, 'Student', raised, it.label, r.student_id);
    IF fate <> 'open' THEN
      INSERT INTO hostel.ticket_event VALUES (t, 2, CASE WHEN fate = 'rejected' THEN 'Rejected' ELSE 'Verified' END, warden, NULL, raised + interval '3 hours',
        CASE WHEN fate = 'rejected' THEN 'Checked; working normally' END, raised + interval '3 hours', warden);
    END IF;
    IF fate NOT IN ('open', 'rejected') THEN
      INSERT INTO hostel.ticket_event VALUES (t, 3, 'Escalated', warden, NULL, raised + interval '3 hours', NULL, raised + interval '3 hours', warden);
    END IF;
    IF fate IN ('repairing', 'late', 'resolved', 'closed', 'reopened_closed') THEN
      INSERT INTO hostel.ticket_event VALUES (t, 4, 'Started', fixer, NULL, raised + interval '5 hours', NULL, raised + interval '5 hours', fixer);
    END IF;
    IF fate IN ('resolved', 'closed', 'reopened_closed') THEN
      INSERT INTO hostel.ticket_event VALUES (t, 5, 'Closure_Report', fixer, NULL, raised + interval '20 hours', 'Repaired and tested', raised + interval '20 hours', fixer);
    END IF;
    IF fate = 'reopened_closed' THEN
      INSERT INTO hostel.ticket_event VALUES (t, 6, 'Confirmed', NULL, 'Student', raised + interval '1 day', 'Not fixed: same problem again', raised + interval '1 day', r.student_id);
      INSERT INTO hostel.ticket_event VALUES (t, 7, 'Closure_Report', fixer, NULL, raised + interval '36 hours', 'Part replaced', raised + interval '36 hours', fixer);
      INSERT INTO hostel.ticket_event VALUES (t, 8, 'Confirmed', NULL, 'Student', raised + interval '2 days', 'Fixed', raised + interval '2 days', r.student_id);
    ELSIF fate = 'closed' THEN
      INSERT INTO hostel.ticket_event VALUES (t, 6, 'Confirmed', NULL, 'Student', raised + interval '2 days', 'Fixed', raised + interval '2 days', r.student_id);
    END IF;
  END LOOP;
END $$;
COMMIT;

SELECT area, status, count(*) FROM infra.maintenance_ticket GROUP BY 1, 2 ORDER BY 1, 2;
