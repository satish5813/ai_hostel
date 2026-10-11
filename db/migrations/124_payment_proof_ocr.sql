-- =====================================================================
-- 124  The system reads the uploaded receipt, 11 Oct 2026.
--   The text on the receipt (OCR for a photograph, the text layer for a PDF) is matched against what the student typed:
--   the amount, the date, the transaction reference and the student's ID or name. The result is shown to the warden
--   beside the receipt and to the student. The same file or the same reference cannot be uploaded twice.
-- =====================================================================
ALTER TABLE hostel.payment_proof
  ADD COLUMN IF NOT EXISTS mime       varchar(40) NOT NULL DEFAULT 'image/jpeg',
  ADD COLUMN IF NOT EXISTS file_hash  varchar(64),                                   -- sha-256 of the file: the same receipt once
  ADD COLUMN IF NOT EXISTS ocr_status varchar(10) NOT NULL DEFAULT 'Pending' CHECK (ocr_status IN ('Pending', 'Matched', 'Mismatch', 'Unreadable')),
  ADD COLUMN IF NOT EXISTS ocr_text   text,                                          -- what was read, for the audit
  ADD COLUMN IF NOT EXISTS ocr_checks jsonb,                                         -- [{check, expected, found, ok}]
  ADD COLUMN IF NOT EXISTS ocr_at     timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_proof_file ON hostel.payment_proof (file_hash) WHERE file_hash IS NOT NULL AND status <> 'Rejected';
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_proof_reference ON hostel.payment_proof (upper(reference)) WHERE reference IS NOT NULL AND status <> 'Rejected';
COMMENT ON COLUMN hostel.payment_proof.ocr_status IS 'Pending until read; Matched when the amount, the student and the date or reference are found on the receipt; Mismatch when something read differs; Unreadable when no text could be read';
