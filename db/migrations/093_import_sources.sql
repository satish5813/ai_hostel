-- =====================================================================
-- 093  Bulk upload of masters by the Data Administrator (ADM-04).
--      Every upload is one row in shared.import_batch: file, rows read, rows loaded, rows refused, who, when.
--      New sources for the masters that the original enum did not name.
-- =====================================================================
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Hostel_Building';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Hostel_Room_Type';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Hostel_Fee';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Infra_Asset';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Hostel_Meter';
ALTER TYPE shared.import_source ADD VALUE IF NOT EXISTS 'Hostel_Duty';
