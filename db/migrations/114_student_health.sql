-- =====================================================================
-- 114  Student health profile, 4 Oct 2026.
--   A catalogue of tests in the layout of a diagnostic laboratory report (panels, units, biological reference
--   intervals by gender, LOINC codes where one exists): complete blood count, blood sugar, lipid profile, liver and
--   kidney function, electrolytes, thyroid, vitamins, iron studies and urine routine; and from the gym's body
--   analyser and fitness equipment: body composition, vitals and fitness measures.
--   A health report holds one student's results of one sitting, from the equipment (pushed or uploaded), a laboratory,
--   or typed in. Each result is flagged Low / High / Very low / Very high / Abnormal against the student's range.
--   Suggestions for food and physical activity, and when to see a doctor, come from editable rules on those flags.
--   Reports are seen by the student, the Gym Manager, the Floor Warden (own floors), the Warden (own hostel) and the
--   Dean, Students Affairs; every opening of a report is logged.
--   Reference intervals are typical adult values for 17-25 year olds and must be checked against the equipment's and
--   the laboratory's own intervals before use (they are data: hostel.health_range).
-- =====================================================================

INSERT INTO portal.role (role_code, name, module) VALUES ('Gym_Manager', 'Gym Manager (health and fitness)', 'hostel') ON CONFLICT (role_code) DO NOTHING;

-- ---------- catalogue ----------
CREATE TABLE hostel.health_panel (
  panel_code  varchar(12) PRIMARY KEY,
  panel_name  varchar(80) NOT NULL,
  source      varchar(12) NOT NULL CHECK (source IN ('Lab', 'Device')),
  sort_no     smallint NOT NULL,
  specimen    varchar(40)
);
COMMENT ON TABLE hostel.health_panel IS 'A section of the health report: a laboratory panel or a set of measures from the gym equipment';
INSERT INTO hostel.health_panel VALUES
  ('BODY', 'Body composition', 'Device', 10, 'Body analyser'),
  ('VITALS', 'Vital signs', 'Device', 20, 'Monitor'),
  ('FITNESS', 'Fitness assessment', 'Device', 30, 'Fitness equipment'),
  ('CBC', 'Complete blood count (CBC)', 'Lab', 40, 'Whole blood EDTA'),
  ('SUGAR', 'Blood sugar', 'Lab', 50, 'Fluoride plasma / whole blood'),
  ('LIPID', 'Lipid profile', 'Lab', 60, 'Serum'),
  ('LFT', 'Liver function test (LFT)', 'Lab', 70, 'Serum'),
  ('KFT', 'Kidney function test (KFT)', 'Lab', 80, 'Serum'),
  ('ELEC', 'Electrolytes', 'Lab', 90, 'Serum'),
  ('THYROID', 'Thyroid profile', 'Lab', 100, 'Serum'),
  ('VITAMIN', 'Vitamins', 'Lab', 110, 'Serum'),
  ('IRON', 'Iron studies', 'Lab', 120, 'Serum'),
  ('URINE', 'Urine routine', 'Lab', 130, 'Urine');

CREATE TABLE hostel.health_test (
  test_code   varchar(12) PRIMARY KEY CHECK (test_code ~ '^[A-Z][A-Z0-9_]*$'),
  panel_code  varchar(12) NOT NULL REFERENCES hostel.health_panel(panel_code),
  test_name   varchar(80) NOT NULL,
  unit        varchar(24),
  loinc       varchar(12),
  value_type  varchar(8) NOT NULL DEFAULT 'Number' CHECK (value_type IN ('Number', 'Text')),
  decimals    smallint NOT NULL DEFAULT 1,
  method      varchar(60),
  sort_no     smallint NOT NULL,
  derived     boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE hostel.health_test IS 'A test or measure: its code in the capture format, unit, LOINC code and place on the report';
COMMENT ON COLUMN hostel.health_test.derived IS 'Worked out from other results when not supplied (BMI, cholesterol/HDL ratio, VLDL)';

CREATE TABLE hostel.health_range (
  test_code      varchar(12) NOT NULL REFERENCES hostel.health_test(test_code),
  gender         varchar(6) NOT NULL DEFAULT 'Any' CHECK (gender IN ('Any', 'Male', 'Female')),
  low            numeric(10,3),
  high           numeric(10,3),
  critical_low   numeric(10,3),
  critical_high  numeric(10,3),
  normal_text    varchar(30),
  note           varchar(160),
  PRIMARY KEY (test_code, gender),
  CHECK (low IS NULL OR high IS NULL OR low <= high)
);
COMMENT ON TABLE hostel.health_range IS 'Biological reference interval of a test (by gender, or Any); critical_ values mark Very low / Very high; normal_text for qualitative results';

INSERT INTO hostel.health_test (test_code, panel_code, test_name, unit, loinc, value_type, decimals, method, sort_no, derived) VALUES
  -- body composition (body analyser)
  ('WT', 'BODY', 'Body weight', 'kg', '29463-7', 'Number', 1, 'Body analyser', 10, false),
  ('HT', 'BODY', 'Height', 'cm', '8302-2', 'Number', 1, 'Stadiometer', 11, false),
  ('BMI', 'BODY', 'Body mass index (BMI)', 'kg/m²', '39156-5', 'Number', 1, 'Calculated', 12, true),
  ('BFAT', 'BODY', 'Body fat', '%', '41982-0', 'Number', 1, 'Bioelectrical impedance', 13, false),
  ('SMM', 'BODY', 'Skeletal muscle mass', 'kg', NULL, 'Number', 1, 'Bioelectrical impedance', 14, false),
  ('VFAT', 'BODY', 'Visceral fat level', 'level', NULL, 'Number', 0, 'Bioelectrical impedance', 15, false),
  ('TBW', 'BODY', 'Total body water', '%', NULL, 'Number', 1, 'Bioelectrical impedance', 16, false),
  ('BONE', 'BODY', 'Bone mass', 'kg', NULL, 'Number', 1, 'Bioelectrical impedance', 17, false),
  ('PROTP', 'BODY', 'Protein', '%', NULL, 'Number', 1, 'Bioelectrical impedance', 18, false),
  ('BMR', 'BODY', 'Basal metabolic rate', 'kcal/day', NULL, 'Number', 0, 'Body analyser', 19, false),
  ('MAGE', 'BODY', 'Metabolic age', 'years', NULL, 'Number', 0, 'Body analyser', 20, false),
  ('WAIST', 'BODY', 'Waist circumference', 'cm', '8280-0', 'Number', 1, 'Tape', 21, false),
  ('WHR', 'BODY', 'Waist-to-hip ratio', 'ratio', NULL, 'Number', 2, 'Tape', 22, false),
  -- vitals
  ('SBP', 'VITALS', 'Blood pressure, systolic', 'mmHg', '8480-6', 'Number', 0, 'Automated cuff', 10, false),
  ('DBP', 'VITALS', 'Blood pressure, diastolic', 'mmHg', '8462-4', 'Number', 0, 'Automated cuff', 11, false),
  ('HR', 'VITALS', 'Resting heart rate', 'beats/min', '8867-4', 'Number', 0, 'Monitor', 12, false),
  ('SPO2', 'VITALS', 'Oxygen saturation (SpO₂)', '%', '59408-5', 'Number', 0, 'Pulse oximeter', 13, false),
  ('TEMP', 'VITALS', 'Body temperature', '°C', '8310-5', 'Number', 1, 'Infrared', 14, false),
  -- fitness
  ('VO2MAX', 'FITNESS', 'VO₂ max (aerobic fitness)', 'ml/kg/min', NULL, 'Number', 1, 'Treadmill / bike estimate', 10, false),
  ('GRIP', 'FITNESS', 'Grip strength (best hand)', 'kg', NULL, 'Number', 1, 'Hand dynamometer', 11, false),
  ('SITRCH', 'FITNESS', 'Flexibility (sit and reach)', 'cm', NULL, 'Number', 0, 'Sit-and-reach box', 12, false),
  ('PUSHUP', 'FITNESS', 'Push-ups in 1 minute', 'count', NULL, 'Number', 0, 'Counted', 13, false),
  -- complete blood count
  ('HB', 'CBC', 'Haemoglobin', 'g/dL', '718-7', 'Number', 1, 'Photometry', 10, false),
  ('RBC', 'CBC', 'Total RBC count', 'mill/µL', '789-8', 'Number', 2, 'Electrical impedance', 11, false),
  ('PCV', 'CBC', 'Packed cell volume (PCV)', '%', '4544-3', 'Number', 1, 'Calculated', 12, false),
  ('MCV', 'CBC', 'Mean corpuscular volume (MCV)', 'fL', '787-2', 'Number', 1, 'Calculated', 13, false),
  ('MCH', 'CBC', 'Mean corpuscular Hb (MCH)', 'pg', '785-6', 'Number', 1, 'Calculated', 14, false),
  ('MCHC', 'CBC', 'Mean corpuscular Hb conc. (MCHC)', 'g/dL', '786-4', 'Number', 1, 'Calculated', 15, false),
  ('RDW', 'CBC', 'Red cell distribution width (RDW-CV)', '%', '788-0', 'Number', 1, 'Calculated', 16, false),
  ('TLC', 'CBC', 'Total leucocyte count (TLC)', 'thou/µL', '6690-2', 'Number', 2, 'Electrical impedance', 17, false),
  ('NEUT', 'CBC', 'Neutrophils', '%', '770-8', 'Number', 0, 'Flow cytometry', 18, false),
  ('LYMPH', 'CBC', 'Lymphocytes', '%', '736-9', 'Number', 0, 'Flow cytometry', 19, false),
  ('MONO', 'CBC', 'Monocytes', '%', '5905-5', 'Number', 0, 'Flow cytometry', 20, false),
  ('EOS', 'CBC', 'Eosinophils', '%', '713-8', 'Number', 0, 'Flow cytometry', 21, false),
  ('BASO', 'CBC', 'Basophils', '%', '706-2', 'Number', 0, 'Flow cytometry', 22, false),
  ('PLT', 'CBC', 'Platelet count', 'thou/µL', '777-3', 'Number', 0, 'Electrical impedance', 23, false),
  ('ESR', 'CBC', 'Erythrocyte sedimentation rate (ESR)', 'mm/hr', '30341-2', 'Number', 0, 'Westergren', 24, false),
  -- blood sugar
  ('FBS', 'SUGAR', 'Glucose, fasting', 'mg/dL', '1558-6', 'Number', 0, 'Hexokinase', 10, false),
  ('PPBS', 'SUGAR', 'Glucose, post-meal (2 hours)', 'mg/dL', '1521-4', 'Number', 0, 'Hexokinase', 11, false),
  ('HBA1C', 'SUGAR', 'HbA1c (glycated haemoglobin)', '%', '4548-4', 'Number', 1, 'HPLC', 12, false),
  -- lipid profile
  ('TCHOL', 'LIPID', 'Cholesterol, total', 'mg/dL', '2093-3', 'Number', 0, 'Enzymatic', 10, false),
  ('TG', 'LIPID', 'Triglycerides', 'mg/dL', '2571-8', 'Number', 0, 'Enzymatic', 11, false),
  ('HDL', 'LIPID', 'HDL cholesterol', 'mg/dL', '2085-9', 'Number', 0, 'Direct', 12, false),
  ('LDL', 'LIPID', 'LDL cholesterol', 'mg/dL', '13457-7', 'Number', 0, 'Calculated (Friedewald)', 13, false),
  ('VLDL', 'LIPID', 'VLDL cholesterol', 'mg/dL', '13458-5', 'Number', 0, 'Calculated', 14, true),
  ('CHR', 'LIPID', 'Total cholesterol / HDL ratio', 'ratio', '9830-1', 'Number', 1, 'Calculated', 15, true),
  -- liver
  ('TBIL', 'LFT', 'Bilirubin, total', 'mg/dL', '1975-2', 'Number', 2, 'Diazo', 10, false),
  ('DBIL', 'LFT', 'Bilirubin, direct', 'mg/dL', '1968-7', 'Number', 2, 'Diazo', 11, false),
  ('SGOT', 'LFT', 'AST (SGOT)', 'U/L', '1920-8', 'Number', 0, 'IFCC', 12, false),
  ('SGPT', 'LFT', 'ALT (SGPT)', 'U/L', '1742-6', 'Number', 0, 'IFCC', 13, false),
  ('ALP', 'LFT', 'Alkaline phosphatase', 'U/L', '6768-6', 'Number', 0, 'IFCC', 14, false),
  ('GGT', 'LFT', 'Gamma GT (GGTP)', 'U/L', '2324-2', 'Number', 0, 'IFCC', 15, false),
  ('TPROT', 'LFT', 'Protein, total', 'g/dL', '2885-2', 'Number', 1, 'Biuret', 16, false),
  ('ALB', 'LFT', 'Albumin', 'g/dL', '1751-7', 'Number', 1, 'BCG', 17, false),
  -- kidney
  ('UREA', 'KFT', 'Urea', 'mg/dL', '3091-6', 'Number', 0, 'Urease', 10, false),
  ('CREAT', 'KFT', 'Creatinine', 'mg/dL', '2160-0', 'Number', 2, 'Jaffe kinetic', 11, false),
  ('URIC', 'KFT', 'Uric acid', 'mg/dL', '3084-1', 'Number', 1, 'Uricase', 12, false),
  -- electrolytes
  ('NA', 'ELEC', 'Sodium', 'mmol/L', '2951-2', 'Number', 0, 'ISE indirect', 10, false),
  ('K', 'ELEC', 'Potassium', 'mmol/L', '2823-3', 'Number', 1, 'ISE indirect', 11, false),
  ('CL', 'ELEC', 'Chloride', 'mmol/L', '2075-0', 'Number', 0, 'ISE indirect', 12, false),
  ('CA', 'ELEC', 'Calcium, total', 'mg/dL', '17861-6', 'Number', 1, 'Arsenazo', 13, false),
  -- thyroid
  ('TSH', 'THYROID', 'TSH (thyroid stimulating hormone)', 'µIU/mL', '3016-3', 'Number', 2, 'CLIA', 10, false),
  ('FT3', 'THYROID', 'Free T3', 'pg/mL', '3051-0', 'Number', 2, 'CLIA', 11, false),
  ('FT4', 'THYROID', 'Free T4', 'ng/dL', '3024-7', 'Number', 2, 'CLIA', 12, false),
  -- vitamins
  ('VITD', 'VITAMIN', 'Vitamin D, 25-hydroxy', 'ng/mL', '1989-3', 'Number', 1, 'CLIA', 10, false),
  ('VITB12', 'VITAMIN', 'Vitamin B12', 'pg/mL', '2132-9', 'Number', 0, 'CLIA', 11, false),
  -- iron
  ('IRON', 'IRON', 'Iron, serum', 'µg/dL', '2498-4', 'Number', 0, 'Ferrozine', 10, false),
  ('FERR', 'IRON', 'Ferritin', 'ng/mL', '2276-4', 'Number', 0, 'CLIA', 11, false),
  -- urine routine
  ('U_COLOR', 'URINE', 'Colour', NULL, '5778-6', 'Text', 0, 'Visual', 10, false),
  ('U_PH', 'URINE', 'pH', NULL, '5803-2', 'Number', 1, 'Dipstick', 11, false),
  ('U_SG', 'URINE', 'Specific gravity', NULL, '5811-5', 'Number', 3, 'Dipstick', 12, false),
  ('U_PROT', 'URINE', 'Protein', NULL, '20454-5', 'Text', 0, 'Dipstick', 13, false),
  ('U_GLU', 'URINE', 'Glucose', NULL, '25428-4', 'Text', 0, 'Dipstick', 14, false),
  ('U_KET', 'URINE', 'Ketones', NULL, '33903-6', 'Text', 0, 'Dipstick', 15, false),
  ('U_PUS', 'URINE', 'Pus cells', '/hpf', '5821-4', 'Number', 0, 'Microscopy', 16, false),
  ('U_RBC', 'URINE', 'Red blood cells', '/hpf', '13945-1', 'Number', 0, 'Microscopy', 17, false);

INSERT INTO hostel.health_range (test_code, gender, low, high, critical_low, critical_high, normal_text, note) VALUES
  ('WT', 'Any', NULL, NULL, NULL, NULL, NULL, 'Read with height (BMI)'),
  ('HT', 'Any', NULL, NULL, NULL, NULL, NULL, NULL),
  ('BMI', 'Any', 18.5, 22.9, 16, 25, NULL, 'Asian cut-offs: 23-24.9 overweight, 25 and above obese'),
  ('BFAT', 'Male', 10, 20, NULL, 25, NULL, 'Young adult men'),
  ('BFAT', 'Female', 18, 28, NULL, 33, NULL, 'Young adult women'),
  ('SMM', 'Male', 28, NULL, NULL, NULL, NULL, 'Low below 28 kg'),
  ('SMM', 'Female', 19, NULL, NULL, NULL, NULL, 'Low below 19 kg'),
  ('VFAT', 'Any', NULL, 9, NULL, 14, NULL, '1-9 healthy, 10-14 high, 15 and above very high'),
  ('TBW', 'Male', 50, 65, NULL, NULL, NULL, NULL),
  ('TBW', 'Female', 45, 60, NULL, NULL, NULL, NULL),
  ('BONE', 'Any', NULL, NULL, NULL, NULL, NULL, NULL),
  ('PROTP', 'Any', 16, 20, NULL, NULL, NULL, NULL),
  ('BMR', 'Any', NULL, NULL, NULL, NULL, NULL, 'Energy used at rest'),
  ('MAGE', 'Any', NULL, NULL, NULL, NULL, NULL, 'Better at or below actual age'),
  ('WAIST', 'Male', NULL, 90, NULL, 102, NULL, 'Asian cut-off'),
  ('WAIST', 'Female', NULL, 80, NULL, 88, NULL, 'Asian cut-off'),
  ('WHR', 'Male', NULL, 0.90, NULL, NULL, NULL, NULL),
  ('WHR', 'Female', NULL, 0.85, NULL, NULL, NULL, NULL),
  ('SBP', 'Any', 90, 129, 80, 140, NULL, '130-139 elevated, 140 and above high'),
  ('DBP', 'Any', 60, 84, 50, 90, NULL, '90 and above high'),
  ('HR', 'Any', 60, 100, 40, 120, NULL, 'Athletes may be lower'),
  ('SPO2', 'Any', 95, 100, 92, NULL, NULL, NULL),
  ('TEMP', 'Any', 36.1, 37.2, 35, 38, NULL, NULL),
  ('VO2MAX', 'Male', 42, NULL, 35, NULL, NULL, 'Good for age 18-25: 42 and above'),
  ('VO2MAX', 'Female', 35, NULL, 30, NULL, NULL, 'Good for age 18-25: 35 and above'),
  ('GRIP', 'Male', 35, NULL, 26, NULL, NULL, NULL),
  ('GRIP', 'Female', 22, NULL, 16, NULL, NULL, NULL),
  ('SITRCH', 'Male', 25, NULL, NULL, NULL, NULL, NULL),
  ('SITRCH', 'Female', 29, NULL, NULL, NULL, NULL, NULL),
  ('PUSHUP', 'Male', 20, NULL, NULL, NULL, NULL, NULL),
  ('PUSHUP', 'Female', 10, NULL, NULL, NULL, NULL, NULL),
  ('HB', 'Male', 13.0, 17.0, 8, 20, NULL, NULL),
  ('HB', 'Female', 12.0, 15.0, 8, 18, NULL, NULL),
  ('RBC', 'Male', 4.5, 5.5, NULL, NULL, NULL, NULL),
  ('RBC', 'Female', 3.8, 4.8, NULL, NULL, NULL, NULL),
  ('PCV', 'Male', 40, 50, NULL, NULL, NULL, NULL),
  ('PCV', 'Female', 36, 46, NULL, NULL, NULL, NULL),
  ('MCV', 'Any', 83, 101, NULL, NULL, NULL, NULL),
  ('MCH', 'Any', 27, 32, NULL, NULL, NULL, NULL),
  ('MCHC', 'Any', 31.5, 34.5, NULL, NULL, NULL, NULL),
  ('RDW', 'Any', 11.6, 14.0, NULL, NULL, NULL, NULL),
  ('TLC', 'Any', 4.0, 10.0, 2.0, 20.0, NULL, NULL),
  ('NEUT', 'Any', 40, 80, NULL, NULL, NULL, NULL),
  ('LYMPH', 'Any', 20, 40, NULL, NULL, NULL, NULL),
  ('MONO', 'Any', 2, 10, NULL, NULL, NULL, NULL),
  ('EOS', 'Any', 1, 6, NULL, NULL, NULL, NULL),
  ('BASO', 'Any', 0, 2, NULL, NULL, NULL, NULL),
  ('PLT', 'Any', 150, 410, 50, 1000, NULL, NULL),
  ('ESR', 'Male', 0, 15, NULL, NULL, NULL, NULL),
  ('ESR', 'Female', 0, 20, NULL, NULL, NULL, NULL),
  ('FBS', 'Any', 70, 99, 54, 126, NULL, '100-125 prediabetes, 126 and above diabetes (repeat test)'),
  ('PPBS', 'Any', 70, 139, 54, 200, NULL, '140-199 prediabetes'),
  ('HBA1C', 'Any', 4.0, 5.6, NULL, 6.5, NULL, '5.7-6.4 prediabetes, 6.5 and above diabetes'),
  ('TCHOL', 'Any', NULL, 199, NULL, 240, NULL, '200-239 borderline high'),
  ('TG', 'Any', NULL, 149, NULL, 500, NULL, '150-199 borderline high'),
  ('HDL', 'Male', 40, NULL, NULL, NULL, NULL, 'Higher is better'),
  ('HDL', 'Female', 50, NULL, NULL, NULL, NULL, 'Higher is better'),
  ('LDL', 'Any', NULL, 99, NULL, 160, NULL, '100-129 near optimal, 130-159 borderline high'),
  ('VLDL', 'Any', NULL, 30, NULL, NULL, NULL, NULL),
  ('CHR', 'Any', NULL, 5.0, NULL, NULL, NULL, 'Ideal below 3.5'),
  ('TBIL', 'Any', 0.3, 1.2, NULL, 3.0, NULL, NULL),
  ('DBIL', 'Any', NULL, 0.3, NULL, NULL, NULL, NULL),
  ('SGOT', 'Male', NULL, 50, NULL, 150, NULL, NULL),
  ('SGOT', 'Female', NULL, 35, NULL, 105, NULL, NULL),
  ('SGPT', 'Male', NULL, 50, NULL, 150, NULL, NULL),
  ('SGPT', 'Female', NULL, 35, NULL, 105, NULL, NULL),
  ('ALP', 'Any', 30, 120, NULL, NULL, NULL, NULL),
  ('GGT', 'Male', NULL, 55, NULL, NULL, NULL, NULL),
  ('GGT', 'Female', NULL, 38, NULL, NULL, NULL, NULL),
  ('TPROT', 'Any', 6.4, 8.3, NULL, NULL, NULL, NULL),
  ('ALB', 'Any', 3.5, 5.2, 2.5, NULL, NULL, NULL),
  ('UREA', 'Any', 17, 43, NULL, 100, NULL, NULL),
  ('CREAT', 'Male', 0.70, 1.30, NULL, 2.0, NULL, NULL),
  ('CREAT', 'Female', 0.55, 1.02, NULL, 2.0, NULL, NULL),
  ('URIC', 'Male', 3.5, 7.2, NULL, NULL, NULL, NULL),
  ('URIC', 'Female', 2.6, 6.0, NULL, NULL, NULL, NULL),
  ('NA', 'Any', 136, 145, 125, 155, NULL, NULL),
  ('K', 'Any', 3.5, 5.1, 3.0, 6.0, NULL, NULL),
  ('CL', 'Any', 98, 107, NULL, NULL, NULL, NULL),
  ('CA', 'Any', 8.6, 10.3, 7.0, 12.0, NULL, NULL),
  ('TSH', 'Any', 0.40, 4.20, 0.10, 10.0, NULL, NULL),
  ('FT3', 'Any', 2.00, 4.40, NULL, NULL, NULL, NULL),
  ('FT4', 'Any', 0.93, 1.70, NULL, NULL, NULL, NULL),
  ('VITD', 'Any', 30, 100, 20, 150, NULL, 'Below 20 deficient, 20-29 insufficient, 30-100 sufficient'),
  ('VITB12', 'Any', 211, 911, 150, NULL, NULL, NULL),
  ('IRON', 'Male', 65, 175, NULL, NULL, NULL, NULL),
  ('IRON', 'Female', 50, 170, NULL, NULL, NULL, NULL),
  ('FERR', 'Male', 30, 400, 12, NULL, NULL, NULL),
  ('FERR', 'Female', 13, 150, 8, NULL, NULL, NULL),
  ('U_COLOR', 'Any', NULL, NULL, NULL, NULL, 'Pale yellow', NULL),
  ('U_PH', 'Any', 4.6, 8.0, NULL, NULL, NULL, NULL),
  ('U_SG', 'Any', 1.005, 1.030, NULL, NULL, NULL, NULL),
  ('U_PROT', 'Any', NULL, NULL, NULL, NULL, 'Negative', NULL),
  ('U_GLU', 'Any', NULL, NULL, NULL, NULL, 'Negative', NULL),
  ('U_KET', 'Any', NULL, NULL, NULL, NULL, 'Negative', NULL),
  ('U_PUS', 'Any', 0, 5, NULL, NULL, NULL, NULL),
  ('U_RBC', 'Any', 0, 2, NULL, NULL, NULL, NULL);

-- ---------- reports and results ----------
CREATE SEQUENCE hostel.health_report_no_seq;
CREATE TABLE hostel.health_report (
  report_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_no     varchar(20) NOT NULL UNIQUE DEFAULT ('HLT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('hostel.health_report_no_seq')::text, 5, '0')),
  student_id    varchar(20) NOT NULL REFERENCES ref.student_master(student_id),
  collected_at  timestamptz NOT NULL,
  reported_at   timestamptz NOT NULL DEFAULT now(),
  source        varchar(10) NOT NULL CHECK (source IN ('Device', 'Lab', 'Manual', 'Upload')),
  device_ref    varchar(60),
  lab_name      varchar(80),
  device_notes  text,
  status        varchar(10) NOT NULL DEFAULT 'Final' CHECK (status IN ('Draft', 'Final', 'Withdrawn')),
  entered_by    varchar(20),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz,
  updated_by    varchar(20)
);
COMMENT ON TABLE hostel.health_report IS 'One student''s health measures and tests from one sitting';
COMMENT ON COLUMN hostel.health_report.device_notes IS 'Summary sent by the equipment''s own health-monitoring software, shown as the device''s words';
CREATE INDEX ix_health_report_student ON hostel.health_report (student_id, collected_at DESC);
CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON hostel.health_report FOR EACH ROW EXECUTE FUNCTION shared.fn_touch_updated_at();
CREATE TRIGGER trg_audit_health_report AFTER INSERT OR UPDATE OR DELETE ON hostel.health_report FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('report_id');

CREATE TABLE hostel.health_result (
  report_id   bigint NOT NULL REFERENCES hostel.health_report(report_id) ON DELETE CASCADE,
  test_code   varchar(12) NOT NULL REFERENCES hostel.health_test(test_code),
  value_num   numeric(12,3),
  value_text  varchar(40),
  flag        varchar(2) NOT NULL DEFAULT 'N' CHECK (flag IN ('N', 'L', 'H', 'LL', 'HH', 'A', '')),
  PRIMARY KEY (report_id, test_code),
  CHECK (value_num IS NOT NULL OR value_text IS NOT NULL)
);
COMMENT ON TABLE hostel.health_result IS 'One result of a report; flag N normal, L/H low/high, LL/HH very low/high, A abnormal (qualitative), empty = no interval';

-- the interval that applies to a student: their gender's, else Any
CREATE OR REPLACE FUNCTION hostel.fn_health_range(p_test text, p_gender text) RETURNS hostel.health_range LANGUAGE sql STABLE AS $$
  SELECT r.* FROM hostel.health_range r WHERE r.test_code = p_test AND r.gender IN (p_gender, 'Any') ORDER BY r.gender = 'Any' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION hostel.fn_health_result_flag() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g text; r hostel.health_range; v numeric := NEW.value_num;
BEGIN
  SELECT sm.gender::text INTO g FROM hostel.health_report hr JOIN ref.student_master sm ON sm.student_id = hr.student_id WHERE hr.report_id = NEW.report_id;
  r := hostel.fn_health_range(NEW.test_code, g);
  NEW.flag := CASE
    WHEN r.test_code IS NULL THEN ''
    WHEN r.normal_text IS NOT NULL THEN CASE WHEN lower(trim(coalesce(NEW.value_text, ''))) IN (lower(r.normal_text), 'nil', 'absent', 'normal') THEN 'N' ELSE 'A' END
    WHEN v IS NULL THEN ''
    WHEN r.critical_low IS NOT NULL AND v < r.critical_low THEN 'LL'
    WHEN r.low IS NOT NULL AND v < r.low THEN 'L'
    WHEN r.critical_high IS NOT NULL AND v >= r.critical_high THEN 'HH'
    WHEN r.high IS NOT NULL AND v > r.high THEN 'H'
    WHEN r.low IS NULL AND r.high IS NULL THEN ''
    ELSE 'N' END;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_health_result_flag BEFORE INSERT OR UPDATE ON hostel.health_result FOR EACH ROW EXECUTE FUNCTION hostel.fn_health_result_flag();

-- ---------- suggestions ----------
CREATE TABLE hostel.health_rule (
  rule_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  test_code    varchar(12) NOT NULL REFERENCES hostel.health_test(test_code),
  direction    varchar(8) NOT NULL CHECK (direction IN ('Low', 'High', 'Abnormal')),
  severe_only  boolean NOT NULL DEFAULT false,
  area         varchar(10) NOT NULL CHECK (area IN ('Food', 'Activity', 'Doctor')),
  finding      varchar(80) NOT NULL,
  advice       text NOT NULL,
  mess_tip     varchar(200),
  sort_no      smallint NOT NULL DEFAULT 50,
  active       boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE hostel.health_rule IS 'A suggestion for food, physical activity or seeing a doctor when a result is low, high or abnormal (severe_only: very low or very high)';

INSERT INTO hostel.health_rule (test_code, direction, severe_only, area, finding, advice, mess_tip, sort_no) VALUES
  -- anaemia and iron
  ('HB', 'Low', false, 'Food', 'Low haemoglobin', 'Eat iron-rich food every day: palak and other greens, rajma, chana, sprouts, ragi, dates, jaggery; eggs, chicken or fish if non-vegetarian. Take a vitamin C food with meals (lemon, amla, guava, orange) and keep tea and coffee an hour away from meals.', 'Choose dal, palak or rajma curries and the egg dishes where offered; add lemon at lunch.', 10),
  ('HB', 'Low', false, 'Activity', 'Low haemoglobin', 'Keep to light or moderate exercise (walking, yoga, easy cycling) until haemoglobin improves; stop if you feel breathless or dizzy.', NULL, 10),
  ('HB', 'Low', true, 'Doctor', 'Very low haemoglobin', 'See the hostel doctor this week: haemoglobin this low needs a check and usually iron treatment.', NULL, 1),
  ('FERR', 'Low', false, 'Food', 'Low iron stores (ferritin)', 'Iron stores are low: follow the iron-rich food advice daily for at least three months.', 'Prefer greens, dal and egg options in the weekly menu.', 11),
  ('MCV', 'Low', false, 'Food', 'Small red cells (MCV)', 'Small red cells often mean low iron: include iron-rich foods and vitamin C with meals.', NULL, 12),
  ('VITB12', 'Low', false, 'Food', 'Low vitamin B12', 'Have milk, curd, paneer and buttermilk daily; eggs and fish if non-vegetarian. Vegetarians may need fortified foods or a supplement.', 'Take curd at lunch and dinner.', 13),
  ('VITB12', 'Low', true, 'Doctor', 'Very low vitamin B12', 'See the doctor for vitamin B12 treatment.', NULL, 2),
  -- vitamin D
  ('VITD', 'Low', false, 'Activity', 'Low vitamin D', 'Get 15-20 minutes of sunlight on arms and face between 10 am and 1 pm on most days; play an outdoor sport.', NULL, 14),
  ('VITD', 'Low', false, 'Food', 'Low vitamin D', 'Include milk, curd, eggs and fish where possible; mushrooms dried in the sun help a little.', NULL, 14),
  ('VITD', 'Low', true, 'Doctor', 'Very low vitamin D', 'See the doctor: a vitamin D supplement course is usually needed at this level.', NULL, 3),
  -- weight and body composition
  ('BMI', 'Low', false, 'Food', 'Underweight', 'Eat three full meals and two snacks a day: an extra roti or rice portion, dal, paneer or eggs, nuts, banana or milk shakes. Do not skip breakfast.', 'Take the live-counter breakfast and the evening snack every day.', 20),
  ('BMI', 'Low', false, 'Activity', 'Underweight', 'Strength training three times a week to build muscle; keep cardio moderate.', NULL, 20),
  ('BMI', 'High', false, 'Food', 'Overweight', 'Fill half the plate with vegetables and salad, keep rice and roti to one moderate serving, choose grilled over fried, and cut sweets, sugary drinks and fried snacks.', 'Choose stir-fried over deep-fried items; skip the second rice serving.', 21),
  ('BMI', 'High', false, 'Activity', 'Overweight', 'At least 45 minutes of brisk walking, cycling or swimming five days a week, strength training twice a week, and 8,000-10,000 steps a day.', NULL, 21),
  ('BFAT', 'High', false, 'Activity', 'High body fat', 'Combine cardio (30-45 minutes, five days) with strength training (2-3 days) to lower body fat while keeping muscle.', NULL, 22),
  ('VFAT', 'High', false, 'Food', 'High visceral (belly) fat', 'Cut refined sugar, sweets, bakery and fried snacks; eat more fibre (vegetables, dal, whole grains).', NULL, 23),
  ('WAIST', 'High', false, 'Activity', 'Large waist', 'Daily brisk walking and core exercises; waist above the cut-off raises the risk of diabetes and heart disease.', NULL, 24),
  ('SMM', 'Low', false, 'Food', 'Low muscle mass', 'Protein at every meal: dal, chana, paneer, curd, soya, eggs or chicken; about 1.2-1.6 g of protein per kg of body weight.', 'Pick the dal and paneer or egg dishes.', 25),
  ('SMM', 'Low', false, 'Activity', 'Low muscle mass', 'Strength training three times a week: squats, push-ups, rows, gym machines; increase the load slowly.', NULL, 25),
  -- sugar
  ('FBS', 'High', false, 'Food', 'High fasting sugar', 'Cut sweets, sugar in tea, soft drinks and fried snacks; prefer whole grains and millets (ragi, jowar), more vegetables and protein with each meal; keep rice portions small.', 'Choose millet or roti options and skip the sweet.', 30),
  ('FBS', 'High', false, 'Activity', 'High fasting sugar', '30-45 minutes of brisk walking or cycling every day, plus strength training 2-3 times a week; a 10-minute walk after meals helps.', NULL, 30),
  ('FBS', 'High', true, 'Doctor', 'Sugar in the diabetes range', 'See the doctor to confirm with a repeat test and HbA1c.', NULL, 4),
  ('HBA1C', 'High', false, 'Food', 'High HbA1c', 'Your average sugar over three months is high: follow the low-sugar food advice strictly.', NULL, 31),
  ('HBA1C', 'High', true, 'Doctor', 'HbA1c in the diabetes range', 'See the doctor for diabetes assessment.', NULL, 4),
  -- lipids
  ('LDL', 'High', false, 'Food', 'High LDL cholesterol', 'Fewer fried foods, ghee, butter and bakery items; more oats, dal, vegetables, fruit and a handful of nuts; fish twice a week if non-vegetarian.', 'Prefer grilled, steamed and stir-fried dishes over deep-fried.', 32),
  ('LDL', 'High', false, 'Activity', 'High LDL cholesterol', '150 minutes of aerobic exercise a week (brisk walking, jogging, cycling, sports).', NULL, 32),
  ('TG', 'High', false, 'Food', 'High triglycerides', 'Cut sugar, sweets, fruit juices and refined flour (maida); avoid late-night snacking.', NULL, 33),
  ('HDL', 'Low', false, 'Activity', 'Low HDL (good) cholesterol', 'Regular aerobic exercise raises HDL: aim for 30 minutes on most days.', NULL, 34),
  ('TCHOL', 'High', true, 'Doctor', 'Very high cholesterol', 'See the doctor: cholesterol this high at a young age needs a check.', NULL, 5),
  -- liver, kidney
  ('SGPT', 'High', false, 'Food', 'Liver enzyme (ALT) raised', 'Avoid alcohol, fried and very oily food and unnecessary supplements; keep weight in range.', NULL, 40),
  ('SGPT', 'High', true, 'Doctor', 'Liver enzyme much higher than normal', 'See the doctor for a liver check.', NULL, 6),
  ('TBIL', 'High', true, 'Doctor', 'High bilirubin', 'See the doctor: high bilirubin can mean jaundice.', NULL, 6),
  ('CREAT', 'High', false, 'Food', 'Creatinine raised', 'Drink 2.5-3 litres of water a day, limit salt and avoid protein powders and painkillers without advice.', NULL, 41),
  ('CREAT', 'High', true, 'Doctor', 'Creatinine much higher than normal', 'See the doctor for a kidney check.', NULL, 6),
  ('URIC', 'High', false, 'Food', 'High uric acid', 'Limit red meat, organ meat, seafood and sugary drinks; drink plenty of water.', NULL, 42),
  -- thyroid, blood pressure, others
  ('TSH', 'High', false, 'Doctor', 'TSH raised (thyroid may be underactive)', 'See the doctor; use iodised salt.', NULL, 7),
  ('TSH', 'Low', false, 'Doctor', 'TSH low (thyroid may be overactive)', 'See the doctor.', NULL, 7),
  ('SBP', 'High', false, 'Food', 'Blood pressure raised', 'Less salt: skip pickles, papad, chips and instant noodles; more fruit, vegetables and curd.', 'Avoid adding extra salt and pickle at the table.', 43),
  ('SBP', 'High', false, 'Activity', 'Blood pressure raised', '30 minutes of moderate aerobic exercise most days; sleep 7-8 hours; manage exam stress (breathing exercises, yoga).', NULL, 43),
  ('SBP', 'High', true, 'Doctor', 'High blood pressure', 'See the doctor: recheck blood pressure on two more days.', NULL, 8),
  ('DBP', 'High', true, 'Doctor', 'High diastolic pressure', 'See the doctor: recheck blood pressure on two more days.', NULL, 8),
  ('SPO2', 'Low', false, 'Doctor', 'Low oxygen saturation', 'See the doctor today.', NULL, 1),
  ('HR', 'High', false, 'Doctor', 'Fast resting heart rate', 'Recheck after resting; see the doctor if it stays above 100.', NULL, 9),
  ('TEMP', 'High', false, 'Doctor', 'Raised temperature', 'Fever: see the hostel doctor and rest.', NULL, 1),
  ('VO2MAX', 'Low', false, 'Activity', 'Low aerobic fitness', 'Build stamina slowly: brisk walking or jogging 3-4 times a week, adding intervals (1 minute fast, 2 minutes easy) after a month.', NULL, 50),
  ('GRIP', 'Low', false, 'Activity', 'Low grip strength', 'Add strength training for the whole body twice a week, including hand and forearm work.', NULL, 51),
  ('SITRCH', 'Low', false, 'Activity', 'Low flexibility', 'Stretch for 10 minutes daily, hold each stretch 30 seconds; yoga twice a week.', NULL, 52),
  ('U_PROT', 'Abnormal', false, 'Doctor', 'Protein in urine', 'See the doctor for a repeat urine test.', NULL, 6),
  ('U_GLU', 'Abnormal', false, 'Doctor', 'Sugar in urine', 'See the doctor for a blood sugar test.', NULL, 5),
  ('U_PUS', 'High', false, 'Doctor', 'Pus cells in urine', 'Drink more water and see the doctor: it can mean a urine infection.', NULL, 6);

-- ---------- who opened a report ----------
CREATE TABLE hostel.health_view_log (
  view_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id  bigint NOT NULL REFERENCES hostel.health_report(report_id) ON DELETE CASCADE,
  viewer_id  varchar(40) NOT NULL,
  role_code  varchar(30),
  viewed_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE hostel.health_view_log IS 'Every opening of a student''s health report: who, in which role, when';
CREATE INDEX ix_health_view_log_report ON hostel.health_view_log (report_id, viewed_at DESC);
