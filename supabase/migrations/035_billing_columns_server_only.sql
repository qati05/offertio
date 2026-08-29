-- Migration 035: take the billing columns away from the browser.
--
-- THE PROBLEM
--
-- Offertio's browser code talks to PostgREST directly with the anon key plus
-- the user's own JWT. Row-Level Security scopes the ROW —
--
--   CREATE POLICY "Users can update own profile" ON public.profiles
--     FOR UPDATE TO authenticated USING ((select auth.uid()) = id);
--
-- — but says nothing about the COLUMN. Before this migration the
-- `authenticated` role held UPDATE on every column of public.profiles,
-- including `plan` and `trial_ends_at`. Those are exactly the two columns
-- hasActiveAccess() reads (src/lib/payment.ts), and hasActiveAccess() is the
-- only gate in front of the free-plan quota.
--
-- So any logged-in user could open devtools and send:
--
--   PATCH /rest/v1/profiles?id=eq.<their own id>
--   {"plan":"pro_yearly","trial_ends_at":"2126-01-01T00:00:00Z"}
--
-- and grant themselves a paid plan. RLS permits it — it is their own row. The
-- Lemon Squeezy webhook is carefully hardened (HMAC-SHA256, timing-safe
-- compare, typed column whitelist) and entirely bypassed, because the user can
-- write the columns the webhook writes.
--
-- Verified against the live database (project osexdcaqlggnaubeezqo) on
-- 2026-08-29 by reading information_schema.column_privileges: `authenticated`
-- held UPDATE on plan, trial_ends_at, plan_expires_at and ls_subscription_id.
--
-- WHY COLUMN GRANTS AND NOT A POLICY
--
-- A policy cannot express "this row, but not this column" without comparing
-- OLD and NEW, which RLS has no access to; that would need a trigger. Column
-- privileges are checked BEFORE RLS and are exactly the right tool. The
-- service role used by the webhook bypasses both, so billing keeps working.
--
-- The grant is rebuilt from scratch rather than revoked column by column:
-- REVOKE of a single column against a role that holds the table-level
-- privilege is not reliable across PostgreSQL versions, whereas
-- "revoke the table privilege, then grant the columns" is unambiguous.
--
-- WHAT THE BROWSER STILL NEEDS
--
-- The column list below is every column written by a client component, read
-- out of the three call sites that upsert a profile:
--   src/app/(app)/onboarding/page.tsx
--   src/app/(app)/einstellungen/profil/page.tsx  (incl. pdf_template, pdf_accent_color, logo_url)
--   src/app/(app)/dokument/neu/page.tsx          (persistProfileIfNeeded)
-- Two of those files already carry a comment saying privileged columns must
-- never be written from the client. This makes the database agree.
--
-- `id` and `email` are needed for the INSERT half of the upserts; `id` stays
-- out of the UPDATE list so the primary key cannot be rewritten.
--
-- src/__tests__/no-client-privileged-writes.test.ts guards the other half:
-- it fails if a client component starts writing one of these columns again.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  email,
  firmenname,
  vorname,
  nachname,
  adresse,
  plz,
  ort,
  telefon,
  iban,
  bic,
  uid_mwst,
  steuernummer,
  fn_nr,
  land,
  sprache,
  beruf,
  zahlungsfrist,
  logo_url,
  onboarding_complete,
  kleinunternehmer,
  pdf_template,
  pdf_accent_color
) ON public.profiles TO authenticated;

REVOKE INSERT ON public.profiles FROM authenticated;

GRANT INSERT (
  id,
  email,
  firmenname,
  vorname,
  nachname,
  adresse,
  plz,
  ort,
  telefon,
  iban,
  bic,
  uid_mwst,
  steuernummer,
  fn_nr,
  land,
  sprache,
  beruf,
  zahlungsfrist,
  logo_url,
  onboarding_complete,
  kleinunternehmer,
  pdf_template,
  pdf_accent_color
) ON public.profiles TO authenticated;

-- The waitlist table is dead code: `grep -rn waitlist src/` returns nothing,
-- yet 011/012 grant INSERT to `anon`. An unauthenticated caller can therefore
-- write rows into it straight through PostgREST, which middleware.ts never
-- sees and which no rate limit covers. Verified locally by the security audit:
-- 1000 rows inserted from one anonymous session. The table is kept (it holds
-- pre-launch sign-ups) but is closed to new anonymous writes; re-open it
-- deliberately if a waitlist form ships.
REVOKE INSERT ON public.waitlist FROM anon;
