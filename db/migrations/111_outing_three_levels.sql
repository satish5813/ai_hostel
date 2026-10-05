-- =====================================================================
-- 111  Outing approval in levels again, 4 Oct 2026 (replaces decision D2 for outings).
--   The parent recommends (level 0, by link), then
--     level 1  Floor Warden of the student's floor approves
--     level 2  Chief Warden approves
--     level 3  Dean, Students Affairs approves an outing of a day or more
--   The QR gate pass is issued when the last required level approves: after the Chief Warden for an outing that
--   returns the same day, after the Dean for one of a day or more; the student is told and sees it in My outings.
--   Requests already in approval keep the steps they were created with.
-- =====================================================================
UPDATE shared.approval_rule SET status = 'Active', level = 1, step_name = 'Floor Warden approves', is_final = false
 WHERE request_type = 'Outpass' AND approver_role = 'Floor_Warden';
UPDATE shared.approval_rule SET level = 2, step_name = 'Chief Warden approves', is_final = false
 WHERE request_type = 'Outpass' AND approver_role = 'Chief_Warden';
UPDATE shared.approval_rule SET level = 3, step_name = 'Dean, Students Affairs approves (a day or more)', is_final = true
 WHERE request_type = 'Outpass' AND approver_role = 'Dean_Students_Affairs';

-- As 098, except that the Floor Warden is no longer only informed (they approve), and the student is told the pass is ready.
CREATE OR REPLACE FUNCTION hostel.fn_approval_step_after() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE op hostel.outpass%ROWTYPE; v_left integer; v_next shared.approval_step%ROWTYPE;
BEGIN
  IF NEW.decision IN ('Pending', 'Skipped') THEN RETURN NULL; END IF;
  UPDATE shared.approval_link SET used_at = now() WHERE step_id = NEW.step_id AND used_at IS NULL;
  IF NEW.decision = 'Rejected' THEN
    UPDATE shared.approval_step SET decision = 'Skipped', decided_on = now()
     WHERE request_type = NEW.request_type AND request_id = NEW.request_id AND level > NEW.level AND decision = 'Pending';
  END IF;

  IF NEW.request_type = 'Outpass' THEN
    SELECT * INTO op FROM hostel.outpass WHERE outpass_id = NEW.request_id;
    IF NEW.decision = 'Rejected' THEN
      UPDATE hostel.outpass SET status = 'Rejected', updated_at = now() WHERE outpass_id = op.outpass_id;
    ELSE
      SELECT count(*) INTO v_left FROM shared.approval_step WHERE request_type = 'Outpass' AND request_id = op.outpass_id AND level >= 1 AND decision = 'Pending';
      UPDATE hostel.outpass SET
        status = (CASE WHEN v_left = 0 THEN 'Approved' WHEN NEW.level = 0 THEN 'Parent_Recommended' WHEN NEW.level = 1 THEN 'L1_Approved' ELSE 'L2_Approved' END)::hostel.outpass_status,
        qr_token = CASE WHEN v_left = 0 THEN coalesce(qr_token, encode(gen_random_bytes(24), 'hex')) ELSE qr_token END,
        updated_at = now()
      WHERE outpass_id = op.outpass_id;
      IF v_left = 0 THEN
        INSERT INTO shared.notification (recipient_type, student_id, contact_id, channel, template_code, body, related_type, related_id)
        SELECT 'Parent', op.student_id, c.contact_id, 'SMS', 'OUTPASS_ISSUED',
               format('Outpass %s issued for %s: %s to %s.', op.outpass_no, op.student_id, to_char(op.leave_from AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI'), to_char(op.return_by AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI')),
               'outpass', op.outpass_id::text
        FROM hostel.student_contact c WHERE c.student_id = op.student_id AND c.is_outpass_approver AND c.status = 'Active';
        -- the student: the gate pass is ready in the portal (the QR is shown at the gate)
        INSERT INTO shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
        VALUES ('Student', op.student_id, 'In_App', 'OUTPASS_ISSUED', 'Your gate pass is ready',
                format('Outing %s to %s is approved. Show the QR code in My outings at the gate; back by %s.', op.outpass_no, op.destination,
                       to_char(op.return_by AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI')), 'outpass', op.outpass_id::text);
      ELSE
        -- D3: the next level may be someone without a login (the Dean): send the link
        SELECT * INTO v_next FROM shared.approval_step WHERE request_type = 'Outpass' AND request_id = op.outpass_id AND decision = 'Pending' ORDER BY level LIMIT 1;
        IF v_next.approver_role = 'Dean_Students_Affairs' THEN PERFORM hostel.fn_issue_approval_links(v_next.step_id); END IF;
      END IF;
    END IF;
  ELSIF NEW.request_type = 'Sick_Leave' THEN
    IF NEW.decision = 'Rejected' THEN
      UPDATE hostel.sick_leave SET status = 'Rejected', updated_at = now() WHERE sick_leave_id = NEW.request_id;
    ELSIF NEW.approver_role = 'Chief_Warden' THEN
      UPDATE hostel.sick_leave SET status = 'Approved', approved_by = NEW.acted_by, updated_at = now() WHERE sick_leave_id = NEW.request_id;
    ELSE
      UPDATE hostel.sick_leave SET status = 'Recommended', updated_at = now() WHERE sick_leave_id = NEW.request_id AND status = 'Applied';
    END IF;
  ELSIF NEW.request_type = 'Vacate' THEN
    IF NEW.decision = 'Rejected' THEN
      UPDATE hostel.vacate_request SET status = 'Rejected', updated_at = now() WHERE vacate_id = NEW.request_id;
    ELSE
      UPDATE hostel.vacate_request v SET status = CASE WHEN (SELECT count(*) FROM shared.approval_step s WHERE s.request_type = 'Vacate' AND s.request_id = v.vacate_id AND s.decision = 'Approved') >= v.levels_required THEN 'Approved'
                                                       WHEN NEW.level = 1 THEN 'L1_Approved' WHEN NEW.level = 2 THEN 'L2_Approved' WHEN NEW.level = 3 THEN 'L3_Approved' ELSE status END, updated_at = now()
      WHERE vacate_id = NEW.request_id;
    END IF;
  END IF;
  RETURN NULL;
END $$;
