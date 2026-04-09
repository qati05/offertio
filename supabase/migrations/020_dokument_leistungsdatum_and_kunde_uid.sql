-- Migration 020: Add leistungsdatum and kunde_uid_mwst to dokumente
--
-- leistungsdatum: Legally required for DE (§14 Abs. 4 Nr. 6 UStG) and
-- AT (§11 Abs. 1 Z 6 öUStG) invoices. Previously validated at creation
-- time but never persisted — breaking audit trails.
--
-- kunde_uid_mwst: Customer's VAT/UID number. Required for AT invoices
-- ≥ EUR 10.000 (§11 Abs. 1 Z 8 öUStG) and for ZUGFeRD B2B e-invoices
-- (BT-48). Currently captured in UI but only stored in customers table,
-- not on the document snapshot itself.

ALTER TABLE dokumente
  ADD COLUMN IF NOT EXISTS leistungsdatum date,
  ADD COLUMN IF NOT EXISTS kunde_uid_mwst text;

COMMENT ON COLUMN dokumente.leistungsdatum IS 'Service/delivery date — mandatory for DE/AT invoices';
COMMENT ON COLUMN dokumente.kunde_uid_mwst IS 'Customer VAT/UID — required for AT ≥EUR 10k, DE ZUGFeRD';
