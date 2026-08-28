-- Reverse charge under §13b UStG (Germany, domestic).
--
-- One column decides the tax treatment of a document. It is NOT derived from
-- the customer, the amount or the line descriptions: whether §13b applies
-- depends on whether the RECIPIENT sustainably performs construction services
-- (§13b Abs. 5 S. 2), which is a legal judgement about that specific customer.
-- The issuer asserts it per document; the application never infers it.
--
-- Why a text column with a CHECK rather than a boolean:
-- §13b Abs. 2 has twelve categories. Only Nr. 4 (Bauleistungen) is enabled
-- here. The structurally identical Nr. 8 (Reinigung von Gebäuden und
-- Gebäudeteilen) is a realistic next candidate — same "nachhaltig" test, same
-- USt 1 TG evidence, only the cited paragraph and the printed notice differ.
-- A boolean would have to be migrated away the moment a second category is
-- added; extending the CHECK is a one-line change. The constraint stays
-- restrictive so an unapproved category cannot be written by a broken client.
ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS steuerfall text NOT NULL DEFAULT 'standard';

ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_steuerfall_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_steuerfall_chk
  CHECK (steuerfall IN ('standard', 'reverse_charge_13b_4'));

-- Optional record of the recipient's USt 1 TG certificate.
--
-- This is the issuer's own evidence that the reverse-charge call was justified,
-- not a legal invoice field: §14a Abs. 5 UStG requires the notice text, not the
-- certificate reference. It is therefore never printed on the invoice and never
-- written into the ZUGFeRD XML — putting it there would add an unspecified
-- field to a standardised document.
ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS ust1tg_datum date,
  ADD COLUMN IF NOT EXISTS ust1tg_referenz text;

-- Keep the free-text reference bounded; it is a note, not a document store.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_ust1tg_referenz_len_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_ust1tg_referenz_len_chk
  CHECK (ust1tg_referenz IS NULL OR char_length(ust1tg_referenz) <= 200);

-- The certificate fields only carry meaning for a reverse-charge document.
-- Enforced in the database so a client bug cannot leave a standard invoice
-- carrying a stray certificate reference that later reads as justification.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_ust1tg_only_on_reverse_charge_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_ust1tg_only_on_reverse_charge_chk
  CHECK (
    steuerfall <> 'standard'
    OR (ust1tg_datum IS NULL AND ust1tg_referenz IS NULL)
  );

-- Reverse-charge invoices are the ones most likely to be pulled out for a
-- Betriebsprüfung, and there are few of them relative to the table.
CREATE INDEX IF NOT EXISTS dokumente_steuerfall_idx
  ON public.dokumente (user_id, steuerfall)
  WHERE steuerfall <> 'standard';

COMMENT ON COLUMN public.dokumente.steuerfall IS
  'Tax treatment. standard = normal VAT. reverse_charge_13b_4 = §13b Abs. 2 Nr. 4 UStG (Bauleistungen, domestic DE). Asserted by the issuer, never inferred.';
COMMENT ON COLUMN public.dokumente.ust1tg_datum IS
  'Date of the recipient USt 1 TG certificate (§13b Abs. 5 S. 2). Issuer evidence only — not printed, not in the e-invoice.';
COMMENT ON COLUMN public.dokumente.ust1tg_referenz IS
  'Free-text reference for the recipient USt 1 TG certificate. Issuer evidence only.';
