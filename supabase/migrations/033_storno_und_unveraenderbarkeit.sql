-- Invoice cancellation (Storno) and immutability of issued invoices.
--
-- Once an invoice has been sent, the recipient holds a copy. Rewriting its
-- amount, positions, number or customer afterwards leaves two parties holding
-- different documents under the same number — exactly what record-keeping
-- rules exist to prevent (GoBD / §146 AO in Germany; Art. 957a OR and the
-- MWSTG retention rules in Switzerland). A correction is a cancellation plus a
-- new invoice, never an edit.
--
-- Enforcement lives in the API (src/lib/dokument-immutability.ts +
-- /api/dokument/save). This migration adds the state the feature needs and a
-- status whitelist so a broken client cannot invent one.

ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS storniert_at timestamptz,
  ADD COLUMN IF NOT EXISTS storno_grund text;

-- A cancellation reason is a short note, not a document store.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_storno_grund_len_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_storno_grund_len_chk
  CHECK (storno_grund IS NULL OR char_length(storno_grund) <= 300);

-- The timestamp and the status must agree in both directions: a cancelled
-- invoice always carries when it happened, and a live invoice never carries a
-- cancellation timestamp.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_storniert_consistency_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_storniert_consistency_chk
  CHECK (
    (status = 'storniert' AND storniert_at IS NOT NULL)
    OR (status <> 'storniert' AND storniert_at IS NULL AND storno_grund IS NULL)
  )
  NOT VALID;

-- Whitelist the status values.
--
-- Added NOT VALID on purpose. There has never been a CHECK on this column, so
-- a historical row could carry a value this list does not know, and a
-- validating constraint would abort the whole migration on a production
-- database. NOT VALID enforces the rule for every future insert and update
-- while leaving existing rows untouched.
--
-- To adopt it fully once the data has been reviewed:
--   SELECT DISTINCT status FROM public.dokumente;
--   ALTER TABLE public.dokumente VALIDATE CONSTRAINT dokumente_status_chk;
--
-- 'offen' is included because it appears as a status value in the application's
-- status map; it is a display fallback, but the constraint must not reject it
-- if it was ever persisted.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_status_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_status_chk
  CHECK (status IN (
    'entwurf', 'gesendet', 'angenommen', 'bezahlt',
    'abgelaufen', 'ueberfaellig', 'offen', 'storniert'
  ))
  NOT VALID;

-- Cancelled invoices are pulled out during an audit and are rare relative to
-- the table, so a partial index is the right shape.
CREATE INDEX IF NOT EXISTS dokumente_storniert_idx
  ON public.dokumente (user_id, storniert_at DESC)
  WHERE status = 'storniert';

COMMENT ON COLUMN public.dokumente.storniert_at IS
  'When the invoice was cancelled. Set together with status = storniert; the number stays permanently taken.';
COMMENT ON COLUMN public.dokumente.storno_grund IS
  'Optional short reason for the cancellation. Issuer documentation only.';
