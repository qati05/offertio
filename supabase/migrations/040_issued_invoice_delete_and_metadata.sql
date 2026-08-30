-- Migration 040: close the two ways around migration 039.
--
-- 039 made an issued invoice unchangeable — for UPDATE, on the columns it
-- listed. The red team found both gaps it left, and reproduced each against
-- real PostgreSQL.
--
-- GAP 1: DELETE
--
-- The trigger is BEFORE UPDATE. The RLS policy "Users can delete own documents"
-- (migration 014) was never narrowed, so:
--
--   SET ROLE authenticated;  -- with the owner's own sub claim
--   DELETE FROM dokumente WHERE nummer = 'RE-2026-0099';  -- issued, sent
--   → DELETE 1
--
-- That is worse than editing. §147 AO and Art. 958f OR require the invoice to
-- be KEPT, and a user could simply remove it. No code in the repository calls
-- .delete() on dokumente at all — the ability had no purpose and was pure
-- attack surface.
--
-- The policy is left in place rather than dropped: deleting a draft or a
-- quotation is legitimate, and a blanket REVOKE is the kind of over-broad fix
-- that broke Storno earlier in this audit. A BEFORE DELETE trigger states the
-- actual rule.
--
-- GAP 2: the frozen column list was a blacklist
--
-- 039 enumerated the columns that must not change. Everything not on that list
-- was therefore writable on an issued invoice, including:
--
--   pdf_url          the pointer to the archived document itself
--   share_token      the recipient's link
--   source_document_*, recurring_schedule_id, created_at
--
-- pdf_url is the serious one, and it was reproduced end to end: upload a
-- different PDF into your own storage folder, repoint pdf_url at it, and the
-- archive now serves that file for an invoice whose Betrag, Nummer and status
-- are provably untouched. The record stays "immutable" while the document it
-- refers to is swapped.
--
-- An enumeration can only ever be as complete as the day it was written, and a
-- column added later defaults to writable — the failure mode is silent. So the
-- rule is inverted: everything is frozen except the six columns the payment and
-- dunning lifecycle genuinely needs. A new column is now protected by default,
-- and letting it move has to be a deliberate edit to this list.
--
-- Verified against PostgreSQL 16 via scripts/db/verify-039-trigger.sql, which
-- now also covers DELETE and pdf_url. The schema that script sets up was itself
-- incomplete — it had no pdf_url column, so the original verification could not
-- have caught this. That is fixed too.

CREATE OR REPLACE FUNCTION public.enforce_issued_invoice_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- The only columns that may still move on an issued invoice. Everything else
  -- is frozen, including columns that do not exist yet.
  writable constant text[] := ARRAY[
    'status', 'storniert_at', 'storno_grund',
    'payment_received_at', 'mahnstufe', 'last_mahnung_at'
  ];
  old_frozen jsonb;
  new_frozen jsonb;
  col text;
BEGIN
  -- Quotations and drafts are untouched. Signing, rejection and the conversion
  -- back-reference all write to quotations; a draft is not yet an invoice.
  IF OLD.typ <> 'rechnung' OR OLD.status = 'entwurf' THEN
    RETURN NEW;
  END IF;

  -- Cancellation is terminal. The number stays permanently taken so it can
  -- never be reused for different content.
  IF OLD.status = 'storniert' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'cancelled invoice is final'
      USING ERRCODE = '23514',
            HINT = 'Diese Rechnung wurde storniert und kann nicht reaktiviert werden.';
  END IF;

  -- The move that would remove the lock: back to draft, after which every check
  -- in this function stops applying on the next write.
  IF NEW.status = 'entwurf' THEN
    RAISE EXCEPTION 'issued invoice cannot return to draft'
      USING ERRCODE = '23514',
            HINT = 'Diese Rechnung wurde bereits gestellt. Storniere sie und erstelle eine neue.';
  END IF;

  -- Everything except `writable` must be identical. Comparing the whole row as
  -- jsonb minus the allowed keys means a column added in a future migration is
  -- frozen automatically rather than silently writable.
  old_frozen := to_jsonb(OLD);
  new_frozen := to_jsonb(NEW);
  FOREACH col IN ARRAY writable LOOP
    old_frozen := old_frozen - col;
    new_frozen := new_frozen - col;
  END LOOP;

  IF old_frozen IS DISTINCT FROM new_frozen THEN
    RAISE EXCEPTION 'issued invoice content is immutable'
      USING ERRCODE = '23514',
            HINT = 'Diese Rechnung wurde bereits gestellt und darf nachträglich nicht mehr geändert werden (§14 UStG, §146 AO, Art. 957a OR). Storniere sie und erstelle eine neue.';
  END IF;

  RETURN NEW;
END;
$$;

-- An issued invoice must be kept, not merely left unedited.
CREATE OR REPLACE FUNCTION public.enforce_issued_invoice_retention()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.typ = 'rechnung' AND OLD.status <> 'entwurf' THEN
    RAISE EXCEPTION 'issued invoice must be retained'
      USING ERRCODE = '23514',
            HINT = 'Eine gestellte Rechnung darf nicht gelöscht werden (§147 AO, Art. 958f OR). Storniere sie stattdessen.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS dokumente_issued_invoice_retained ON public.dokumente;

CREATE TRIGGER dokumente_issued_invoice_retained
  BEFORE DELETE ON public.dokumente
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_issued_invoice_retention();

REVOKE EXECUTE ON FUNCTION public.enforce_issued_invoice_retention() FROM PUBLIC;

DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.enforce_issued_invoice_retention() TO service_role;
  END IF;
END
$grant$;

COMMENT ON FUNCTION public.enforce_issued_invoice_retention() IS
  'Refuses deletion of an issued Rechnung. Drafts and quotations stay deletable.';
