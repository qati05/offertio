-- Migration 036: stop strangers from burning another user's free quota.
--
-- THE PROBLEM
--
-- `increment_dokument_counter(p_user_id uuid, p_monat text)` is
-- SECURITY DEFINER — it has to be, so it can write dokument_counter past RLS —
-- but it takes the user id as a PARAMETER and never checks it against the
-- caller. Supabase exposes every function in the `public` schema as an RPC
-- endpoint, and EXECUTE was granted to `anon` as well as `authenticated`.
--
-- Verified on the live database (project osexdcaqlggnaubeezqo, 2026-08-29):
--
--   proname                     anon_darf  user_darf  security_definer
--   increment_dokument_counter  true       true       true
--
-- So an entirely unauthenticated caller could send
--
--   POST /rest/v1/rpc/increment_dokument_counter
--   {"p_user_id":"<any user's uuid>","p_monat":"2026-08"}
--
-- five times and exhaust that user's free monthly document allowance. No login,
-- no CSRF token, no rate limit — middleware.ts never sees a PostgREST call. The
-- victim then sees "Monatslimit erreicht" for the rest of the month on a plan
-- they never used.
--
-- Guessing the uuid is the only obstacle, and uuids leak: the recipient view
-- and the storage paths both carry the owner's id.
--
-- THE FIX
--
-- Two independent layers, because either alone leaves a gap:
--
--   1. The function refuses to act for anyone but the caller. This is what
--      actually closes the hole, and it keeps holding even if a future
--      migration re-grants EXECUTE.
--   2. EXECUTE is withdrawn from `anon`. Nothing anonymous has any business
--      calling it, and defence in depth is cheap here.
--
-- The service role is deliberately still allowed to pass any p_user_id:
-- /api/recurring/run generates invoices on a user's behalf from a cron
-- context where there is no auth.uid() at all. auth.uid() returns NULL there,
-- which the guard treats as "trusted server context" — that path already
-- requires the service-role key, which never leaves the server
-- (src/lib/supabase-admin.ts is import "server-only").
--
-- The body is otherwise unchanged from the version live on the database: the
-- FOR UPDATE lock, the plan lookup and the atomic upsert are the existing
-- TOCTOU-safe quota logic and are reproduced verbatim.

CREATE OR REPLACE FUNCTION public.increment_dokument_counter(
  p_user_id uuid,
  p_monat   text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count    int;
  v_current      int := 0;
  v_plan         text;
  v_is_pro       boolean;
  v_caller       uuid := auth.uid();
  v_free_limit   constant int := 5;
BEGIN
  -- A signed-in caller may only ever count against their own quota.
  -- v_caller IS NULL means the service role (cron / recurring generation),
  -- which is trusted because the key never reaches a browser.
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501',
            HINT    = 'increment_dokument_counter may only be called for the calling user';
  END IF;

  -- Resolve plan (single read, not repeated per row)
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;
  v_is_pro := v_plan IN ('pro_monthly', 'pro_yearly');

  IF NOT v_is_pro THEN
    -- Lock the existing counter row (if any) to serialise concurrent requests.
    SELECT anzahl INTO v_current
    FROM public.dokument_counter
    WHERE user_id = p_user_id AND monat = p_monat
    FOR UPDATE;

    -- COALESCE handles the "no row yet" case (first doc of the month).
    IF COALESCE(v_current, 0) >= v_free_limit THEN
      RAISE EXCEPTION 'limit_exceeded'
        USING ERRCODE = 'P0001',
              HINT    = 'Free plan limit reached for this month';
    END IF;
  END IF;

  -- Atomic upsert
  INSERT INTO public.dokument_counter (user_id, monat, anzahl)
  VALUES (p_user_id, p_monat, 1)
  ON CONFLICT (user_id, monat)
  DO UPDATE SET anzahl = public.dokument_counter.anzahl + 1
  RETURNING anzahl INTO v_new_count;

  RETURN v_new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_dokument_counter(uuid, text) FROM anon;

-- handle_new_user is a trigger on auth.users. A trigger function cannot be
-- invoked over RPC anyway (PostgreSQL refuses: "trigger functions can only be
-- called as triggers"), but it is SECURITY DEFINER and should not be sitting
-- on the public API surface at all. The trigger itself is unaffected — it runs
-- as its owner, not as the caller.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated;

-- set_updated_at (migration 015) had no search_path pinned. It is
-- SECURITY INVOKER so the risk is small, but an unqualified reference inside a
-- function whose search_path the caller controls is the standard shape of a
-- privilege-escalation bug, and Supabase's own linter flags it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- REVOKE ... FROM anon does not remove the EXECUTE that PostgreSQL grants to
-- PUBLIC on every new function, so both of the above needed a second pass.
-- Verified on the live database: without this, has_function_privilege('anon',
-- 'public.handle_new_user()', 'EXECUTE') was still true after the revoke above.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC;

-- Signup must keep working. on_auth_user_created fires on auth.users, which is
-- owned by supabase_auth_admin, so that role performs the INSERT that fires the
-- trigger. Granting it explicitly removes any dependence on how PostgreSQL
-- treats EXECUTE for trigger functions at fire time — a wrong guess there would
-- break every new registration.
GRANT EXECUTE ON FUNCTION public.handle_new_user()
  TO service_role, supabase_auth_admin, postgres;
GRANT EXECUTE ON FUNCTION public.generate_referral_code()
  TO service_role, supabase_auth_admin, postgres;
