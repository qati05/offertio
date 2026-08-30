-- Migration 038: "abgelehnt" belongs in the status whitelist.
--
-- Migration 033 put a CHECK constraint on dokumente.status and I wrote the
-- list from the values I could see — statusOptionsFor, the Storno work, the
-- Mahnwesen. It missed "abgelehnt", which is written in exactly one place:
--
--   src/app/api/public/reject/route.ts:96
--
-- the route a recipient uses to turn down a quotation from the shared link.
--
-- WHY THIS DID NOT BLOW UP YET
--
-- NEXT_PUBLIC_ENABLE_SIGNING defaults to false, so both /api/public/sign and
-- /api/public/reject return 404 and the status is never written. The fault is
-- therefore invisible until that flag is switched on — and then every single
-- rejection fails on the constraint and answers the customer with a 500, with
-- nothing to connect the breakage to a migration written months earlier.
--
-- Reproduced against local PostgreSQL by the audit's red team:
-- UPDATE dokumente SET status='abgelehnt' violates dokumente_status_chk.
--
-- The constraint is rebuilt rather than altered because PostgreSQL has no
-- "add a value to a CHECK"; NOT VALID is kept for the same reason 033 used it:
-- dokumente.status never had a constraint before 033, so a historical row
-- could carry a value nobody remembers, and a validating rebuild would abort
-- the migration rather than fix anything.
--
-- src/__tests__/status-whitelist-consistency.test.ts now scans every status
-- literal the application writes against this list, so the next addition
-- fails a test instead of waiting for a feature flag.

ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_status_chk;

ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_status_chk
  CHECK (status IN (
    'entwurf', 'gesendet', 'angenommen', 'abgelehnt', 'bezahlt',
    'abgelaufen', 'ueberfaellig', 'offen', 'storniert'
  ))
  NOT VALID;
