-- Caution deposit demo (116). Every current resident holds ₹10,000 from before the system (Opening, by Accounts S-AC);
-- in Boys Hostel 1 the Floor Warden (S-FW) has proposed two deductions and the Chief Warden (S-CW) approved one.
-- All reasons start with "Demo:"; run once (skipped when demo lines already exist).
DO $$
DECLARE r record; n int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM hostel.caution_entry WHERE reason LIKE 'Demo:%') THEN RAISE NOTICE 'caution demo already loaded'; RETURN; END IF;
  PERFORM set_config('app.actor', 'S-AC', true);
  FOR r IN SELECT a.student_id FROM hostel.hostel_allocation a WHERE a.status = 'Active' AND a.occupant_type = 'Student' ORDER BY a.student_id LOOP
    INSERT INTO hostel.caution_entry (student_id, entry_type, amount, reason, created_by)
    VALUES (r.student_id, 'Opening', 10000, 'Demo: caution deposit held before the system', 'S-AC');
    n := n + 1;
  END LOOP;
  PERFORM set_config('app.actor', 'S-FW', true);
  INSERT INTO hostel.caution_entry (student_id, entry_type, category, amount, reason, created_by)
  SELECT b.student_id, 'Deduction', v.cat, v.amt, v.why, 'S-FW'
    FROM (VALUES (1, 'Damage', 1200::numeric, 'Demo: study table top cracked, replaced by carpentry'),
                 (2, 'Key_Lost', 500::numeric, 'Demo: room key lost, lock changed and new key cut'),
                 (3, 'Cleaning', 800::numeric, 'Demo: wall painting needed after posters were glued')) v(k, cat, amt, why)
    JOIN (SELECT student_id, row_number() OVER (ORDER BY bed_label) AS k FROM hostel.v_bed WHERE facility_id = 'H-BH1' AND student_id IS NOT NULL) b ON b.k = v.k;
  PERFORM set_config('app.actor', 'S-CW', true);
  UPDATE hostel.caution_entry SET status = 'Approved', decided_by = 'S-CW', decision_remarks = 'Demo: checked the room; agreed'
   WHERE entry_id = (SELECT min(entry_id) FROM hostel.caution_entry WHERE status = 'Proposed' AND reason LIKE 'Demo:%');
  RAISE NOTICE 'caution demo: % opening balances', n;
END $$;
