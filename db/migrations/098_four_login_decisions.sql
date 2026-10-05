-- =====================================================================
-- 098  The eight decisions of the four-login flow (docs/flow-a-to-f.html, D1 to D8), 3 Oct 2026.
--   D2  outing: parent recommends, then the Chief Warden decides once; the Floor Warden is informed
--   D3  outing of a day or more: the Dean approves through a one-time link (no login)
--   D2  the parent also acts through a one-time link
--   D4  sick leave: the Chief Warden records the in-person visit and approves (one level)
--   D6  mess sick list: queued to the mess in-charge before each meal
--   D7  hostel scope of a staff login = the hostels of the person's active assignments
--   D8  beds are lettered A, B, C ...; v_bed gains bed_label such as BH1-101-A
--   Fixes: a rejection no longer fails while skipping the later levels; later levels of a rejected
--          sick leave are closed too.
--   D1 (Room Allotment verifies fees) and D5 (manual gate desk for the Chief Warden) are API/screen changes.
-- =====================================================================

-- ---------- settings ----------
INSERT INTO shared.policy_setting (setting_key, module, amount, value_text, meaning) VALUES
  ('public_base_url', 'hostel', NULL, 'http://localhost:5173', 'Address used in links sent by SMS and e-mail'),
  ('approval_link_hours_parent', 'hostel', 24, NULL, 'Hours a parent''s outing link stays valid'),
  ('approval_link_hours_dean', 'hostel', 48, NULL, 'Hours the Dean''s outing link stays valid')
ON CONFLICT (setting_key) DO NOTHING;

-- ---------- D2 / D4: approval levels ----------
UPDATE shared.approval_rule SET status = 'Inactive' WHERE request_type IN ('Outpass', 'Sick_Leave') AND approver_role = 'Floor_Warden';
UPDATE shared.approval_rule SET level = 1, step_name = 'Chief Warden decides', is_final = (request_type = 'Sick_Leave')
 WHERE request_type IN ('Outpass', 'Sick_Leave') AND approver_role = 'Chief_Warden';
UPDATE shared.approval_rule SET level = 2, step_name = 'Dean approves by link', is_final = true
 WHERE request_type = 'Outpass' AND approver_role = 'Dean_Students_Affairs';

-- ---------- D2 / D3: one-time approval links ----------
CREATE TABLE shared.approval_link (
  link_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token       varchar(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  step_id     bigint NOT NULL REFERENCES shared.approval_step ON DELETE CASCADE,
  contact_id  bigint REFERENCES hostel.student_contact,
  staff_id    varchar(20) REFERENCES ref.staff_master,
  sent_to     varchar(120),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(contact_id, staff_id) = 1)
);
CREATE INDEX ix_approval_link_step ON shared.approval_link (step_id);
COMMENT ON TABLE shared.approval_link IS 'One-time links for people without a login (parent, Dean). The token is the only secret; a link works once, until it expires, and only while its step is pending.';

-- Issue links for a pending outing step whose approver has no login, and queue the message with the link.
CREATE OR REPLACE FUNCTION hostel.fn_issue_approval_links(p_step bigint) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE s shared.approval_step%ROWTYPE; op hostel.outpass%ROWTYPE; v_name text; v_base text; v_hours numeric; v_text text; v_token text; n integer := 0; r record;
BEGIN
  SELECT * INTO s FROM shared.approval_step WHERE step_id = p_step;
  IF s.request_type <> 'Outpass' OR s.decision <> 'Pending' THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM shared.approval_link WHERE step_id = p_step AND used_at IS NULL AND expires_at > now()) THEN RETURN 0; END IF;
  SELECT * INTO op FROM hostel.outpass WHERE outpass_id = s.request_id;
  SELECT full_name INTO v_name FROM ref.student_master WHERE student_id = op.student_id;
  v_base := coalesce((SELECT value_text FROM shared.policy_setting WHERE setting_key = 'public_base_url'), 'http://localhost:5173');
  v_text := format('%s (%s) asks to go out to %s, %s to %s. Reason: %s.', initcap(v_name), op.student_id, op.destination,
                   to_char(op.leave_from AT TIME ZONE 'Asia/Kolkata', 'DD-Mon HH24:MI'), to_char(op.return_by AT TIME ZONE 'Asia/Kolkata', 'DD-Mon HH24:MI'), op.reason);
  IF s.approver_role = 'Parent' THEN
    v_hours := coalesce((SELECT amount FROM shared.policy_setting WHERE setting_key = 'approval_link_hours_parent'), 24);
    FOR r IN SELECT contact_id, mobile_no FROM hostel.student_contact
              WHERE student_id = op.student_id AND is_outpass_approver AND is_verified AND status = 'Active' LOOP
      INSERT INTO shared.approval_link (step_id, contact_id, sent_to, expires_at)
      VALUES (p_step, r.contact_id, r.mobile_no, now() + make_interval(hours => v_hours::int)) RETURNING token INTO v_token;
      INSERT INTO shared.notification (recipient_type, student_id, contact_id, channel, template_code, body, related_type, related_id)
      VALUES ('Parent', op.student_id, r.contact_id, 'SMS', 'OUTPASS_PARENT_LINK', v_text || ' Recommend or refuse: ' || v_base || '/a/' || v_token, 'outpass', op.outpass_id::text);
      n := n + 1;
    END LOOP;
  ELSIF s.approver_role = 'Dean_Students_Affairs' THEN
    v_hours := coalesce((SELECT amount FROM shared.policy_setting WHERE setting_key = 'approval_link_hours_dean'), 48);
    FOR r IN SELECT DISTINCT u.staff_id, coalesce(sm.official_email, sm.personal_email, sm.mobile_no) AS sent_to
              FROM portal.user_role ur JOIN portal.app_user u ON u.user_id = ur.user_id AND u.active
              JOIN ref.staff_master sm ON sm.staff_id = u.staff_id
              WHERE ur.role_code = 'Dean_Students_Affairs' LOOP
      INSERT INTO shared.approval_link (step_id, staff_id, sent_to, expires_at)
      VALUES (p_step, r.staff_id, r.sent_to, now() + make_interval(hours => v_hours::int)) RETURNING token INTO v_token;
      INSERT INTO shared.notification (recipient_type, student_id, staff_id, channel, template_code, subject, body, related_type, related_id)
      VALUES ('Staff', op.student_id, r.staff_id, 'Email', 'OUTPASS_DEAN_LINK', 'Outing of a day or more for your approval: ' || op.outpass_no,
              v_text || ' The Chief Warden has approved. Approve or refuse: ' || v_base || '/a/' || v_token, 'outpass', op.outpass_id::text);
      n := n + 1;
    END LOOP;
  END IF;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION hostel.fn_approval_step_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM hostel.fn_issue_approval_links(NEW.step_id); RETURN NULL; END $$;
CREATE TRIGGER trg_approval_step_links AFTER INSERT ON shared.approval_step
  FOR EACH ROW WHEN (NEW.request_type = 'Outpass' AND NEW.approver_role = 'Parent') EXECUTE FUNCTION hostel.fn_approval_step_links();

-- ---------- approval engine: Skipped is set by the system; rejection closes the later levels ----------
CREATE OR REPLACE FUNCTION hostel.fn_approval_step_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_student varchar; v_prev shared.decision; v_facility varchar;
BEGIN
  IF OLD.decision <> 'Pending' THEN RAISE EXCEPTION 'Step % was already decided', OLD.step_id USING ERRCODE = 'check_violation'; END IF;
  IF NEW.decision = 'Pending' THEN RETURN NEW; END IF;
  NEW.decided_on := coalesce(NEW.decided_on, now());
  -- the later levels of a rejected request (and levels removed by a rule change) are skipped by the system
  IF NEW.decision = 'Skipped' THEN RETURN NEW; END IF;
  SELECT decision INTO v_prev FROM shared.approval_step WHERE request_type = NEW.request_type AND request_id = NEW.request_id AND level < NEW.level ORDER BY level DESC LIMIT 1;
  IF v_prev IS NOT NULL AND v_prev NOT IN ('Approved','Recommended','Skipped') THEN
    RAISE EXCEPTION 'Level % cannot be taken before level % is approved', NEW.level, NEW.level - 1 USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.request_type = 'Outpass' THEN SELECT student_id INTO v_student FROM hostel.outpass WHERE outpass_id = NEW.request_id;
  ELSIF NEW.request_type = 'Sick_Leave' THEN SELECT student_id INTO v_student FROM hostel.sick_leave WHERE sick_leave_id = NEW.request_id;
  ELSIF NEW.request_type = 'Vacate' THEN SELECT student_id INTO v_student FROM hostel.vacate_request WHERE vacate_id = NEW.request_id;
  END IF;
  IF NEW.approver_role = 'Parent' THEN
    IF NEW.acted_by_contact IS NULL OR NOT EXISTS (SELECT 1 FROM hostel.student_contact WHERE contact_id = NEW.acted_by_contact AND student_id = v_student AND is_outpass_approver AND is_verified AND status = 'Active') THEN
      RAISE EXCEPTION 'The parent step can be taken only by the verified contact marked as outpass approver' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.decision = 'Approved' THEN NEW.decision := 'Recommended'; END IF;
  ELSE
    IF NEW.acted_by IS NULL THEN RAISE EXCEPTION 'A staff member must be named for level %', NEW.level USING ERRCODE = 'check_violation'; END IF;
    SELECT facility_id INTO v_facility FROM hostel.fn_student_stay(v_student);
    IF v_facility IS NOT NULL AND NEW.approver_role IN ('Floor_Warden','Chief_Warden','Warden') AND NOT hostel.fn_staff_has_role(NEW.acted_by, NEW.approver_role, v_facility) THEN
      RAISE EXCEPTION 'Staff % is not an active % of hostel %', NEW.acted_by, NEW.approver_role, v_facility USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

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
        -- D2: the Floor Warden is told, since the floor no longer approves
        INSERT INTO shared.notification (recipient_type, student_id, staff_id, channel, template_code, body, related_type, related_id)
        SELECT 'Staff', op.student_id, x.fw, 'SMS', 'OUTPASS_FW_INFO',
               format('Outing approved for %s (%s): %s, %s to %s.', initcap(sm.full_name), op.student_id, op.destination,
                      to_char(op.leave_from AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI'), to_char(op.return_by AT TIME ZONE 'Asia/Kolkata','DD-Mon HH24:MI')),
               'outpass', op.outpass_id::text
        FROM (SELECT hostel.fn_find_approver(op.student_id, 'Floor_Warden') AS fw) x JOIN ref.student_master sm ON sm.student_id = op.student_id
        WHERE x.fw IS NOT NULL;
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

-- ---------- requests already open: drop the Floor Warden level, send links that are now due ----------
UPDATE shared.approval_step s SET decision = 'Skipped', decided_on = now(), remarks = 'Floor Warden level removed (decision D2/D4)'
 WHERE s.decision = 'Pending' AND s.approver_role = 'Floor_Warden'
   AND ((s.request_type = 'Outpass' AND EXISTS (SELECT 1 FROM hostel.outpass o WHERE o.outpass_id = s.request_id AND o.status IN ('Applied','Parent_Recommended')))
     OR (s.request_type = 'Sick_Leave' AND EXISTS (SELECT 1 FROM hostel.sick_leave l WHERE l.sick_leave_id = s.request_id AND l.status = 'Applied')));
UPDATE hostel.outpass o SET levels_required = (SELECT count(*) FROM shared.approval_step s WHERE s.request_type = 'Outpass' AND s.request_id = o.outpass_id AND s.level >= 1 AND s.decision <> 'Skipped')
 WHERE o.status IN ('Applied','Parent_Recommended','L1_Approved','L2_Approved');
DO $$ BEGIN
  PERFORM hostel.fn_issue_approval_links(s.step_id)
    FROM shared.approval_step s JOIN hostel.outpass o ON o.outpass_id = s.request_id
   WHERE s.request_type = 'Outpass' AND s.decision = 'Pending' AND s.approver_role IN ('Parent', 'Dean_Students_Affairs')
     AND o.status IN ('Applied','Parent_Recommended','L1_Approved','L2_Approved')
     AND s.level = (SELECT min(level) FROM shared.approval_step p WHERE p.request_type = 'Outpass' AND p.request_id = s.request_id AND p.decision = 'Pending');
END $$;

-- ---------- D6: the sick list goes to the mess in-charge before each meal ----------
CREATE OR REPLACE FUNCTION hostel.fn_queue_sick_lists(p_slot hostel.meal_slot) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer; v_day date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  WITH lists AS (
    SELECT l.facility_id, count(*) AS cnt,
           string_agg(coalesce(sp.space_code, '?') || ' ' || initcap(l.full_name) || coalesce(' (' || l.cuisine::text || ')', ''), '; ' ORDER BY sp.space_code) AS names
    FROM hostel.v_mess_sick_list l LEFT JOIN infra.space sp ON sp.space_id = l.space_id
    WHERE l.meal_date = v_day AND l.slot = p_slot AND l.status = 'Pending' AND l.facility_id IS NOT NULL
    GROUP BY l.facility_id),
  ins AS (
    INSERT INTO shared.notification (recipient_type, staff_id, channel, template_code, subject, body, related_type, related_id)
    SELECT 'Staff', a.staff_id, 'SMS', 'SICK_LIST', format('Sick list %s %s', hp.hostel_code, replace(p_slot::text, '_', ' ')),
           format('%s, %s %s: %s room meal%s. %s', hp.hostel_code, replace(p_slot::text, '_', ' '), to_char(v_day, 'DD-Mon'), x.cnt, CASE WHEN x.cnt = 1 THEN '' ELSE 's' END, x.names),
           'sick_list', x.facility_id || '|' || v_day || '|' || p_slot
    FROM lists x JOIN hostel.hostel_profile hp ON hp.facility_id = x.facility_id
    JOIN (SELECT DISTINCT staff_id, facility_id FROM hostel.staff_space_assignment
           WHERE hostel_role = 'Mess_Incharge' AND status = 'Active' AND (to_date IS NULL OR to_date >= current_date)) a ON a.facility_id = x.facility_id
    WHERE NOT EXISTS (SELECT 1 FROM shared.notification n WHERE n.template_code = 'SICK_LIST' AND n.staff_id = a.staff_id AND n.related_id = x.facility_id || '|' || v_day || '|' || p_slot)
    RETURNING 1)
  SELECT count(*) INTO n FROM ins;
  RETURN n;
END $$;

-- ---------- D7: the hostels a staff login may see ----------
CREATE OR REPLACE FUNCTION hostel.fn_staff_facilities(p_staff varchar) RETURNS varchar[] LANGUAGE sql STABLE AS $$
  SELECT coalesce(array_agg(DISTINCT facility_id ORDER BY facility_id), '{}')::varchar[]
  FROM hostel.staff_space_assignment
  WHERE staff_id = p_staff AND status = 'Active' AND from_date <= current_date AND (to_date IS NULL OR to_date >= current_date)
$$;

-- ---------- D8: beds are lettered; one printed label for every bed ----------
UPDATE infra.subspace SET subspace_code = chr(64 + substring(subspace_code FROM '\d+')::int)
 WHERE subspace_type = 'Bed' AND subspace_code ~ '^Bed-[1-9]$';

CREATE OR REPLACE VIEW hostel.v_bed AS
 SELECT ss.subspace_id, ss.subspace_code AS bed_code, ss.status AS bed_status, s.space_id, s.space_code AS room_code, s.space_name AS room_name,
    s.status AS room_status, z.zone_id, z.zone_name AS floor_name, z.sequence_no AS floor_no, f.facility_id, f.facility_name AS hostel_name,
    hp.hostel_code, hp.hostel_gender, rp.room_type_id, rt.type_name, rt.sharing_count, rt.is_ac, rp.is_accessible, rp.reserved_for,
    a.hostel_alloc_id, a.occupant_type, a.student_id, a.staff_id, a.allocation_date,
    (k.block_id IS NOT NULL) AS is_blocked, k.reason AS block_reason,
    (hp.hostel_code || '-' || s.space_code || '-' || ss.subspace_code)::varchar AS bed_label
   FROM infra.subspace ss
     JOIN infra.space s ON s.space_id = ss.space_id
     JOIN infra.zone z ON z.zone_id = s.zone_id
     JOIN infra.facility f ON f.facility_id = z.facility_id
     JOIN hostel.hostel_profile hp ON hp.facility_id = f.facility_id
     LEFT JOIN hostel.room_profile rp ON rp.space_id = s.space_id
     LEFT JOIN hostel.room_type rt ON rt.room_type_id = rp.room_type_id
     LEFT JOIN hostel.hostel_allocation a ON a.subspace_id = ss.subspace_id AND a.status = 'Active'
     LEFT JOIN hostel.room_block k ON k.space_id = s.space_id AND k.status = 'Blocked'
  WHERE ss.subspace_type = 'Bed' AND s.space_category = 'Hostel_Room';
