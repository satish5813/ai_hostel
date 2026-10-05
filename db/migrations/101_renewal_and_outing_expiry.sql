-- =====================================================================
-- 101  Yearly renewal of hostel rooms, and expiry of outings nobody used, 3 Oct 2026.
--   Renewal: every hosteller registers again for each academic year. Residents get a renewal window before freshers;
--   "Keep my room" reserves the bed they live in, "Change" joins the allotment queue, "Leaving" is recorded for the year end.
--   After fees are verified (Room Allotment) and approved (Chief Warden), Room Allotment continues the stay into the
--   new year in one step: the old stay closes, the new one opens, the meter link and the mess follow.
--   Outing expiry: an approved pass not used before its return time, and a request still waiting at its leaving time,
--   are cancelled, so they no longer block the student's next request.
-- =====================================================================

-- ---------- outing expiry ----------
CREATE OR REPLACE FUNCTION hostel.fn_expire_outpasses() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer := 0; m integer;
BEGIN
  WITH unused AS (
    UPDATE hostel.outpass SET status = 'Cancelled', updated_at = now()
     WHERE status = 'Approved' AND actual_out_event_id IS NULL AND return_by < now() RETURNING outpass_id)
  SELECT count(*) INTO n FROM unused;
  WITH late AS (
    UPDATE hostel.outpass SET status = 'Cancelled', updated_at = now()
     WHERE status IN ('Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved') AND leave_from < now() RETURNING outpass_id),
  steps AS (
    UPDATE shared.approval_step s SET decision = 'Skipped', decided_on = now(), remarks = 'Not decided before the leaving time'
     WHERE s.request_type = 'Outpass' AND s.decision = 'Pending' AND s.request_id IN (SELECT outpass_id FROM late) RETURNING s.step_id)
  UPDATE shared.approval_link l SET used_at = now() WHERE l.used_at IS NULL AND l.step_id IN (SELECT step_id FROM steps);
  GET DIAGNOSTICS m = ROW_COUNT;
  RETURN n + m;
END $$;

-- ---------- renewal: the window, the link to last year, the bed to keep, the student's choice ----------
ALTER TABLE hostel.academic_year ADD COLUMN IF NOT EXISTS renewal_opens date, ADD COLUMN IF NOT EXISTS renewal_closes date;
ALTER TABLE hostel.academic_year ADD CONSTRAINT ck_academic_year_renewal CHECK (renewal_closes IS NULL OR renewal_opens IS NULL OR renewal_closes >= renewal_opens);
COMMENT ON COLUMN hostel.academic_year.renewal_opens IS 'First day current residents can renew for this year (usually before registration opens for freshers).';
COMMENT ON COLUMN hostel.academic_year.renewal_closes IS 'Last day of the renewal window.';

ALTER TABLE hostel.hostel_registration
  ADD COLUMN IF NOT EXISTS renewal_of bigint REFERENCES hostel.hostel_registration,
  ADD COLUMN IF NOT EXISTS retain_subspace_id varchar(30) REFERENCES infra.subspace,
  ADD COLUMN IF NOT EXISTS next_year_intent varchar(10) CHECK (next_year_intent IN ('Renew', 'Leave')),
  ADD COLUMN IF NOT EXISTS continued_into bigint REFERENCES hostel.hostel_registration;
COMMENT ON COLUMN hostel.hostel_registration.renewal_of IS 'Last year''s registration this one renews.';
COMMENT ON COLUMN hostel.hostel_registration.retain_subspace_id IS 'Bed the student keeps from last year (Keep my room).';
COMMENT ON COLUMN hostel.hostel_registration.next_year_intent IS 'What the resident said about next year: Renew or Leave.';
COMMENT ON COLUMN hostel.hostel_registration.continued_into IS 'Next year''s registration the stay was continued into.';
CREATE INDEX IF NOT EXISTS ix_registration_renewal_of ON hostel.hostel_registration (renewal_of);

-- one active mess subscription per student per year (a renewing student has this year's and next year's)
DROP INDEX IF EXISTS hostel.ux_mess_subscription_active;
CREATE UNIQUE INDEX ux_mess_subscription_active ON hostel.mess_subscription (student_id, academic_year) WHERE status = 'Active';

-- registration: gender, the window (renewal window for residents), the registration fee from policy
CREATE OR REPLACE FUNCTION hostel.fn_registration_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_gender ref.gender; v_hostel_gender hostel.hostel_gender; y hostel.academic_year%ROWTYPE; v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
        prev hostel.hostel_registration%ROWTYPE; v_open boolean;
BEGIN
  SELECT gender INTO v_gender FROM ref.student_master WHERE student_id = NEW.student_id;
  SELECT hostel_gender INTO v_hostel_gender FROM hostel.hostel_profile WHERE facility_id = NEW.facility_id;
  IF NOT ((v_gender = 'Male' AND v_hostel_gender = 'Boys') OR (v_gender = 'Female' AND v_hostel_gender = 'Girls')) THEN
    RAISE EXCEPTION 'Student % (%) cannot register for a % hostel', NEW.student_id, v_gender, v_hostel_gender USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO y FROM hostel.academic_year WHERE academic_year = NEW.academic_year;
    IF NEW.renewal_of IS NOT NULL THEN
      SELECT * INTO prev FROM hostel.hostel_registration WHERE registration_id = NEW.renewal_of;
      IF prev.student_id IS DISTINCT FROM NEW.student_id OR prev.status <> 'Checked_In' THEN
        RAISE EXCEPTION 'Only a resident can renew their own registration' USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.retain_subspace_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = NEW.student_id AND subspace_id = NEW.retain_subspace_id AND status = 'Active') THEN
        RAISE EXCEPTION 'A student can keep only the bed they live in' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    v_open := (v_today BETWEEN y.registration_opens AND coalesce(y.registration_closes, 'infinity'::date))
           OR (NEW.renewal_of IS NOT NULL AND v_today BETWEEN y.renewal_opens AND coalesce(y.renewal_closes, 'infinity'::date));
    IF NEW.created_by = NEW.student_id AND NOT coalesce(v_open, false) THEN
      RAISE EXCEPTION '%', CASE
        WHEN NEW.renewal_of IS NOT NULL AND y.renewal_opens IS NOT NULL THEN format('Renewal for %s is open from %s to %s', NEW.academic_year, to_char(y.renewal_opens, 'DD Mon YYYY'), to_char(y.renewal_closes, 'DD Mon YYYY'))
        WHEN y.registration_opens IS NULL THEN format('Hostel registration for %s is not open yet', NEW.academic_year)
        ELSE format('Hostel registration for %s is open from %s to %s', NEW.academic_year, to_char(y.registration_opens, 'DD Mon YYYY'), to_char(y.registration_closes, 'DD Mon YYYY')) END
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.reg_demand_id IS NULL THEN
    INSERT INTO hostel.fee_demand (student_id, fee_head, amount_due, due_date, reference_type, created_by)
    SELECT NEW.student_id, 'Registration', rtf.registration_fee, current_date + hostel.fn_policy_days('registration_fee_due_days', 7), 'hostel_registration', NEW.created_by
    FROM hostel.room_type_fee rtf WHERE rtf.facility_id = NEW.facility_id AND rtf.room_type_id = NEW.room_type_id AND rtf.academic_year = NEW.academic_year
    RETURNING demand_id INTO NEW.reg_demand_id;
    IF NEW.reg_demand_id IS NULL THEN
      RAISE EXCEPTION 'No fee is set for this hostel and room type in %', NEW.academic_year USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- room offers: a renewing student may be offered the bed they live in (it stays Occupied until the stay continues)
CREATE OR REPLACE FUNCTION hostel.fn_room_offer_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; d hostel.demand_status; loc record; v_hours numeric;
        v_exc hostel.allotment_exception%ROWTYPE; v_ok boolean; v_keep boolean;
BEGIN
  SELECT * INTO v_exc FROM hostel.allotment_exception
   WHERE exception_id = nullif(current_setting('hostel.exception', true), '')::bigint AND status = 'Approved' AND subspace_id = NEW.subspace_id;
  v_ok := v_exc.exception_id IS NOT NULL OR current_setting('hostel.mapping', true) = 'on';
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = NEW.registration_id;
  v_keep := r.retain_subspace_id IS NOT DISTINCT FROM NEW.subspace_id AND r.retain_subspace_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE student_id = r.student_id AND subspace_id = NEW.subspace_id AND status = 'Active');
  SELECT status INTO d FROM hostel.fee_demand WHERE demand_id = r.reg_demand_id;
  IF d IS DISTINCT FROM 'Paid' AND d IS DISTINCT FROM 'Waived' THEN
    RAISE EXCEPTION 'Registration % : registration fee is not paid (demand status %)', r.registration_no, d USING ERRCODE = 'check_violation';
  END IF;
  IF r.status NOT IN ('Fee_Paid','Waitlisted','Allotted') AND NOT (v_exc.kind IS NOT DISTINCT FROM 'Transfer' AND r.status = 'Checked_In') THEN
    RAISE EXCEPTION 'Registration % is % and cannot receive an offer', r.registration_no, r.status USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO loc FROM hostel.fn_bed_location(NEW.subspace_id);
  IF loc.space_status = 'Under_Maintenance' THEN RAISE EXCEPTION 'Bed % is in a room under maintenance', NEW.subspace_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.bed_status <> 'Vacant' AND NOT v_keep THEN RAISE EXCEPTION 'Bed % is % and cannot be offered', NEW.subspace_id, loc.bed_status USING ERRCODE = 'check_violation'; END IF;
  IF loc.facility_id <> r.facility_id THEN RAISE EXCEPTION 'Bed % is not in hostel %', NEW.subspace_id, r.facility_id USING ERRCODE = 'check_violation'; END IF;
  IF loc.room_type_id IS DISTINCT FROM r.room_type_id AND NOT v_ok THEN
    RAISE EXCEPTION 'Bed % is not of the room type chosen: ask the Chief Warden for an exception', NEW.subspace_id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM hostel.room_block k WHERE k.space_id = loc.space_id AND k.status = 'Blocked') AND NOT v_ok AND NOT v_keep THEN
    RAISE EXCEPTION 'Room % is blocked by the Chief Warden: ask for an exception', loc.space_id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM hostel.hostel_allocation WHERE subspace_id = NEW.subspace_id AND status = 'Active') AND NOT v_keep THEN
    RAISE EXCEPTION 'Bed % has an active allocation', NEW.subspace_id USING ERRCODE = 'check_violation';
  END IF;
  NEW.offer_no := coalesce((SELECT max(offer_no) FROM hostel.room_offer WHERE registration_id = NEW.registration_id), 0) + 1;
  SELECT amount INTO v_hours FROM shared.policy_setting WHERE setting_key = 'offer_hold_hours';
  NEW.hold_until := NEW.offered_on + make_interval(hours => coalesce(v_hours, 48)::int);
  IF NOT v_keep THEN UPDATE infra.subspace SET status = 'Held' WHERE subspace_id = NEW.subspace_id; END IF;
  IF v_exc.kind IS DISTINCT FROM 'Transfer' THEN
    UPDATE hostel.hostel_registration SET status = 'Allotted', waitlist_no = NULL WHERE registration_id = NEW.registration_id AND status <> 'Allotted';
  END IF;
  RETURN NEW;
END $$;

-- continue the stay into next year: old stay closes, the new one opens on the accepted bed, mess of last year closes
CREATE OR REPLACE FUNCTION hostel.fn_continue_stay(p_reg bigint, p_by varchar, p_key varchar DEFAULT NULL) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE r hostel.hostel_registration%ROWTYPE; o hostel.room_offer%ROWTYPE; old hostel.hostel_allocation%ROWTYPE; v_alloc bigint;
BEGIN
  SELECT * INTO r FROM hostel.hostel_registration WHERE registration_id = p_reg FOR UPDATE;
  IF r.renewal_of IS NULL THEN RAISE EXCEPTION 'Registration % is not a renewal', r.registration_no USING ERRCODE = 'check_violation'; END IF;
  IF r.status <> 'Confirmed' OR r.fee_check_status <> 'Verified' OR r.cw_status <> 'Approved' THEN
    RAISE EXCEPTION 'Registration %: fees must be verified and the Chief Warden must approve first', r.registration_no USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO o FROM hostel.room_offer WHERE registration_id = p_reg AND student_decision = 'Accepted' ORDER BY offer_no DESC LIMIT 1;
  IF o.offer_id IS NULL THEN RAISE EXCEPTION 'Registration % has no accepted bed', r.registration_no USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO old FROM hostel.hostel_allocation WHERE student_id = r.student_id AND status = 'Active' FOR UPDATE;
  IF old.hostel_alloc_id IS NOT NULL THEN
    UPDATE hostel.hostel_allocation SET status = 'Transferred', remarks = 'Continued into ' || r.academic_year, updated_by = p_by WHERE hostel_alloc_id = old.hostel_alloc_id;
  END IF;
  INSERT INTO hostel.hostel_allocation (occupant_type, student_id, subspace_id, offer_id, academic_year, allocation_date, key_no, checked_in_by, approved_by, remarks, created_by)
  VALUES ('Student', r.student_id, o.subspace_id, o.offer_id, r.academic_year, current_date,
          coalesce(nullif(p_key, ''), CASE WHEN old.subspace_id = o.subspace_id THEN old.key_no END, 'NA'), p_by, r.cw_by, 'Renewal for ' || r.academic_year, p_by)
  RETURNING hostel_alloc_id INTO v_alloc;
  UPDATE hostel.hostel_registration SET continued_into = p_reg, updated_by = p_by WHERE registration_id = r.renewal_of;
  UPDATE hostel.mess_subscription SET status = 'Closed', to_date = current_date, updated_by = p_by
   WHERE student_id = r.student_id AND status = 'Active' AND academic_year <> r.academic_year;
  RETURN v_alloc;
END $$;
