-- =====================================================================
-- 122  Outing approval by the wardens only, 5 Oct 2026.
--   level 1  Floor Warden of the student's floor approves
--   level 2  Chief Warden approves; the QR gate pass is issued, for a same-day outing and for a day or more alike
--   No parent recommendation and no Dean step. The parent is still told by SMS when the pass is issued (if a
--   contact is marked outpass approver), but a student no longer needs one to apply.
--   Requests already in approval drop their pending parent and Dean steps and carry on with the wardens.
-- =====================================================================
BEGIN;

UPDATE shared.approval_rule SET status = 'Inactive' WHERE request_type = 'Outpass' AND approver_role IN ('Parent', 'Dean_Students_Affairs');
UPDATE shared.approval_rule SET is_final = true, step_name = 'Chief Warden approves' WHERE request_type = 'Outpass' AND approver_role = 'Chief_Warden';

-- applying no longer needs a verified parent marked as outpass approver
DO $do$
DECLARE s text; t text;
BEGIN
  s := pg_get_functiondef('hostel.fn_outpass_before()'::regprocedure);
  t := regexp_replace(s, '\s*IF NOT EXISTS \(SELECT 1 FROM hostel\.student_contact[^;]*;\s*END IF;', '');
  IF t = s THEN RAISE EXCEPTION 'fn_outpass_before: parent check not found'; END IF;
  EXECUTE t;
END $do$;

-- open requests: the parent and Dean steps still pending are skipped, so the wardens decide
UPDATE shared.approval_step s SET decision = 'Skipped', decided_on = now(), remarks = 'Outings are approved by the wardens only (5 Oct 2026)'
 FROM hostel.outpass o
 WHERE s.request_type = 'Outpass' AND s.request_id = o.outpass_id AND s.decision = 'Pending' AND s.approver_role IN ('Parent', 'Dean_Students_Affairs')
   AND o.status IN ('Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved');
UPDATE shared.approval_link l SET used_at = now()
 FROM shared.approval_step s
 WHERE l.step_id = s.step_id AND l.used_at IS NULL AND s.request_type = 'Outpass' AND s.decision = 'Skipped';
UPDATE hostel.outpass SET levels_required = 2 WHERE status IN ('Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved');
-- a request that waited only for the Dean (the wardens had approved) is approved now
UPDATE hostel.outpass o SET status = 'Approved', qr_token = coalesce(o.qr_token, encode(gen_random_bytes(24), 'hex'))
 WHERE o.status IN ('Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved')
   AND NOT EXISTS (SELECT 1 FROM shared.approval_step s WHERE s.request_type = 'Outpass' AND s.request_id = o.outpass_id AND s.decision = 'Pending');

COMMIT;
