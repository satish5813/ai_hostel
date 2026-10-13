-- =====================================================================
-- 126  The hostel's own record of a student, 13 Oct 2026.
--   A new student fills this in once from the app after paying the registration fee: Aadhaar, permanent address,
--   parents' and guardian's numbers, emergency contact, medical notes, with a photo of the Aadhaar card.
--   After it is submitted only the Chief Warden (or admin) may change it; the student sees it read-only.
--   The Aadhaar number is read in full by the Chief Warden and admin only; everyone else sees the last four digits.
-- =====================================================================
CREATE TABLE IF NOT EXISTS hostel.student_kyc (
  student_id       varchar(20) PRIMARY KEY REFERENCES ref.student_master,
  aadhaar_no       char(12) CHECK (aadhaar_no ~ '^[0-9]{12}$'),
  aadhaar_photo    text,                                   -- data URL of the card, as receipts are stored
  blood_group      varchar(5),
  hno              varchar(80), street varchar(120), landmark varchar(160), city varchar(80), district varchar(80), state varchar(80), pincode varchar(10) CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$'),
  father_name      varchar(120), father_mobile varchar(10) CHECK (father_mobile IS NULL OR father_mobile ~ '^[6-9][0-9]{9}$'),
  mother_name      varchar(120), mother_mobile varchar(10) CHECK (mother_mobile IS NULL OR mother_mobile ~ '^[6-9][0-9]{9}$'),
  guardian_name    varchar(120), guardian_mobile varchar(10) CHECK (guardian_mobile IS NULL OR guardian_mobile ~ '^[6-9][0-9]{9}$'), guardian_relation varchar(40),
  emergency_name   varchar(120), emergency_mobile varchar(10) CHECK (emergency_mobile IS NULL OR emergency_mobile ~ '^[6-9][0-9]{9}$'),
  medical_notes    varchar(400),                           -- allergies, regular medicines
  submitted_on     timestamptz,                            -- set once by the student; locks the record
  updated_by       varchar(20),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE hostel.student_kyc IS 'The hostel record a student submits once; the Chief Warden edits it afterwards.';

-- the parents' numbers become contacts (to be verified by OTP) and the address the permanent address, as the ERP upload does
CREATE OR REPLACE FUNCTION hostel.fn_student_kyc_after() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.father_mobile IS NOT NULL THEN
    INSERT INTO hostel.student_contact (student_id, relation, contact_name, mobile_no, created_by) VALUES (NEW.student_id, 'Father', coalesce(NEW.father_name, 'Father'), NEW.father_mobile, NEW.updated_by)
    ON CONFLICT (student_id, relation, mobile_no) DO NOTHING;
  END IF;
  IF NEW.mother_mobile IS NOT NULL THEN
    INSERT INTO hostel.student_contact (student_id, relation, contact_name, mobile_no, created_by) VALUES (NEW.student_id, 'Mother', coalesce(NEW.mother_name, 'Mother'), NEW.mother_mobile, NEW.updated_by)
    ON CONFLICT (student_id, relation, mobile_no) DO NOTHING;
  END IF;
  IF NEW.guardian_mobile IS NOT NULL THEN
    INSERT INTO hostel.student_contact (student_id, relation, contact_name, mobile_no, created_by) VALUES (NEW.student_id, 'Guardian', coalesce(NEW.guardian_name, 'Guardian'), NEW.guardian_mobile, NEW.updated_by)
    ON CONFLICT (student_id, relation, mobile_no) DO NOTHING;
  END IF;
  IF NEW.city IS NOT NULL OR NEW.pincode IS NOT NULL THEN
    INSERT INTO ref.student_address (student_id, address_type, seq_no, hno, street, landmark, city, district, state, pincode)
    VALUES (NEW.student_id, 'Permanent', 1, NEW.hno, NEW.street, NEW.landmark, NEW.city, NEW.district, NEW.state, NEW.pincode)
    ON CONFLICT (student_id, address_type, seq_no) DO UPDATE SET hno = excluded.hno, street = excluded.street, landmark = excluded.landmark, city = excluded.city, district = excluded.district, state = excluded.state, pincode = excluded.pincode;
  END IF;
  UPDATE ref.student_master SET father_name = coalesce(NEW.father_name, father_name), mother_name = coalesce(NEW.mother_name, mother_name), blood_group = coalesce(NEW.blood_group::ref.blood_group, blood_group) WHERE student_id = NEW.student_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_student_kyc_after ON hostel.student_kyc;
CREATE TRIGGER trg_student_kyc_after AFTER INSERT OR UPDATE ON hostel.student_kyc FOR EACH ROW EXECUTE FUNCTION hostel.fn_student_kyc_after();

-- demo: the two 2026-27 new students are hostellers from the day they apply
UPDATE ref.student_master SET is_hosteller = true WHERE student_id IN ('2600041011', '2600040011') AND NOT is_hosteller;
