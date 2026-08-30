-- Migration 039: an issued invoice becomes unchangeable in the database itself.
--
-- THE GAP THIS CLOSES
--
-- checkContentEdit() and checkStatusTransition() both live in the API. The
-- browser talks to PostgREST directly, so a logged-in user can bypass every one
-- of them with their own access token:
--
--   PATCH /rest/v1/dokumente?id=eq.<their own issued invoice>
--   {"betrag": 1.00, "nummer": "RE-2026-0001", "kundenname": "…"}
--
-- Reproduced against real PostgreSQL twice during the audit, independently.
-- RLS permits it: the row really is theirs. RLS scopes the row, never the
-- column, and never the transition.
--
-- §14 UStG, §146 AO (DE) and Art. 957a OR (CH) all require an issued invoice to
-- stay as issued. A rule enforced only in a route the client can go around is
-- not enforcement.
--
-- WHY A TRIGGER AND NOT A REVOKE
--
-- The obvious move — REVOKE UPDATE ON dokumente FROM authenticated — was the
-- audit's first proposal and would have broken Storno and every status change,
-- because /api/dokument/storno and /update-status write with the USER client,
-- not the admin client. It was withdrawn.
--
-- The second proposal, a column whitelist, was broken by the red team in a way
-- worth recording: it can be walked around with two ordinary API calls. Set the
-- status back to "entwurf" (which /update-status accepted at the time), and the
-- trigger then sees OLD.status = 'entwurf' and stops applying. The lock removes
-- itself. That is why the rules below constrain the VALUE of status, not just
-- which columns may move.
--
-- WHAT MAY STILL CHANGE ON AN ISSUED INVOICE
--
-- Read out of the routes rather than assumed. Every write path to an existing
-- dokumente row was enumerated:
--
--   storno/route.ts        status, storniert_at, storno_grund
--   mark-paid/route.ts     status, payment_received_at, mahnstufe
--   mahnung/route.ts       mahnstufe, last_mahnung_at, status
--   update-status/route.ts status
--   save/route.ts          converted_document_* — but only on the SOURCE
--                          document of a conversion, which is always an Offerte
--   public/sign, /reject   Offerten only, hard-coded typ='offerte'
--   recurring/run          INSERT only, never UPDATE
--
-- So the payment and dunning lifecycle stays open; the invoice's content does
-- not. Quotations are exempt entirely: checkContentEdit already exempts them,
-- they stay editable after sending by design, and signing and rejection write
-- to them.
--
-- Drafts are exempt too — an invoice that has not been issued is not yet an
-- invoice in the legal sense, and /api/dokument/save must be able to rewrite it.
--
-- src/__tests__/issued-invoice-trigger.test.ts pins the premise: it fails if a
-- route starts writing a column this trigger does not allow.

CREATE OR REPLACE FUNCTION public.enforce_issued_invoice_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Quotations and drafts are untouched.
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

  -- The move that removed the lock: back to draft, which makes every other
  -- check in this function stop applying on the next write.
  IF NEW.status = 'entwurf' THEN
    RAISE EXCEPTION 'issued invoice cannot return to draft'
      USING ERRCODE = '23514',
            HINT = 'Diese Rechnung wurde bereits gestellt. Storniere sie und erstelle eine neue.';
  END IF;

  -- The content of an issued invoice is fixed. Listed explicitly rather than
  -- with a catch-all so that adding a column is a deliberate decision about
  -- which side of this line it falls on.
  IF (NEW.betrag,  NEW.nummer,   NEW.datum,        NEW.leistungsdatum,
      NEW.kundenname, NEW.kunde_email, NEW.kunde_adresse, NEW.kunde_adresse2,
      NEW.kunde_plz,  NEW.kunde_ort,   NEW.kunde_uid_mwst, NEW.customer_id,
      NEW.objekt,   NEW.positionen, NEW.mwst_satz,  NEW.rabatt,
      NEW.notiz,    NEW.preis_mode, NEW.steuerfall, NEW.ust1tg_datum,
      NEW.ust1tg_referenz, NEW.typ)
     IS DISTINCT FROM
     (OLD.betrag,  OLD.nummer,   OLD.datum,        OLD.leistungsdatum,
      OLD.kundenname, OLD.kunde_email, OLD.kunde_adresse, OLD.kunde_adresse2,
      OLD.kunde_plz,  OLD.kunde_ort,   OLD.kunde_uid_mwst, OLD.customer_id,
      OLD.objekt,   OLD.positionen, OLD.mwst_satz,  OLD.rabatt,
      OLD.notiz,    OLD.preis_mode, OLD.steuerfall, OLD.ust1tg_datum,
      OLD.ust1tg_referenz, OLD.typ)
  THEN
    RAISE EXCEPTION 'issued invoice content is immutable'
      USING ERRCODE = '23514',
            HINT = 'Diese Rechnung wurde bereits gestellt und darf inhaltlich nicht mehr geändert werden (§14 UStG, §146 AO, Art. 957a OR).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dokumente_issued_invoice_immutable ON public.dokumente;

CREATE TRIGGER dokumente_issued_invoice_immutable
  BEFORE UPDATE ON public.dokumente
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_issued_invoice_immutability();

-- The trigger function must not sit on the public RPC surface. Supabase exposes
-- every function in `public`; a trigger function cannot meaningfully be called
-- that way, but it does not belong there either. Migration 036 had to learn
-- that REVOKE FROM anon leaves PostgreSQL's default grant to PUBLIC in place.
REVOKE EXECUTE ON FUNCTION public.enforce_issued_invoice_immutability() FROM PUBLIC;

-- Guarded because a GRANT to a role that does not exist aborts the statement,
-- and depending on how the runner wraps the file that could roll back the
-- trigger itself — exactly the failure mode the red team found in migration
-- 037. The trigger does not depend on these grants: PostgreSQL does not check
-- EXECUTE on a trigger function when it fires.
DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.enforce_issued_invoice_immutability() TO service_role;
  END IF;
END
$grant$;

COMMENT ON FUNCTION public.enforce_issued_invoice_immutability() IS
  'Keeps an issued Rechnung unchangeable at the database level. Payment and dunning columns stay writable; content columns and a return to draft do not.';
