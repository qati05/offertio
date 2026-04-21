-- Mahnwesen / payment-reminder tracking.
--
-- Why three new columns instead of a separate table?
--   * A Mahnung has no independent lifecycle — it lives and dies with the
--     parent Rechnung. Merging keeps the common queries ("all overdue invoices
--     that haven't been reminded yet") as a single indexed scan.
--   * Each dokument has ≤ 1 payment date and ≤ 1 current Mahnstufe, so we're
--     not violating 1NF by inlining.
--
-- mahnstufe semantics (DACH convention):
--   0 = no reminder sent
--   1 = Zahlungserinnerung (friendly reminder, typ. after 7-14d past due)
--   2 = 1. Mahnung (formal, typ. +14d after stufe 1)
--   3 = 2. Mahnung / letzte Mahnung (final notice, before Inkasso)
--
-- Higher stages exist in the real world (gerichtliche Mahnung) but are handled
-- by collection agencies, not by this app. Capping at 3 keeps the UI simple.

ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS mahnstufe smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_mahnung_at timestamptz;

-- Enforce the 0..3 range at the DB level so a broken client can't write
-- stage 99. DROP first in case this migration is replayed and the constraint
-- was added with a different expression.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_mahnstufe_range_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_mahnstufe_range_chk
  CHECK (mahnstufe BETWEEN 0 AND 3);

-- Index for the most common overdue-reminder query:
--   SELECT * FROM dokumente
--   WHERE typ = 'rechnung' AND status IN ('gesendet','ueberfaellig')
--     AND payment_received_at IS NULL
--   ORDER BY datum ASC;
-- The partial index is far smaller than the full dokumente index and is
-- exactly the rows the Mahnwesen UI scans.
CREATE INDEX IF NOT EXISTS idx_dokumente_unpaid_rechnungen
  ON public.dokumente (user_id, datum ASC)
  WHERE typ = 'rechnung' AND payment_received_at IS NULL;
