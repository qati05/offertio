-- Migration 037: the free-plan counter is written by the server only.
--
-- THE PROBLEM
--
-- public.dokument_counter carries the monthly document count that decides
-- whether a free user may create another document. Its RLS policy is
--
--   CREATE POLICY "Users can update own counters" ... USING (auth.uid() = user_id)
--
-- with no WITH CHECK on the value. Since the browser talks to PostgREST
-- directly, a user could simply set their own counter to a negative number:
--
--   PATCH /rest/v1/dokument_counter?user_id=eq.<their own id>
--   {"anzahl": -999}
--
-- After that `anzahl >= FREE_LIMIT` is never true again and the free plan is
-- unlimited. RLS is doing its job — the row really is theirs — it just never
-- had anything to say about the value.
--
-- Reproduced against real PostgreSQL by the audit's security role, and
-- independently re-reproduced by the red team.
--
-- WHY REVOKING IS SAFE HERE
--
-- This is the same shape as the fix that was WRONG for public.dokumente, so it
-- was checked rather than assumed. Every write to dokument_counter in the
-- application goes through increment_dokument_counter, which is SECURITY
-- DEFINER and runs as its owner — RLS and these grants do not apply to it.
-- check-limit/route.ts and save/route.ts only ever SELECT.
--
-- The red team verified the consequence directly: after the revoke, the RPC
-- still works, the SELECT still works, and the -999 write fails with
-- permission denied. That is the difference from the dokumente proposal, where
-- the same instinct would have broken Storno and Mahnwesen.
--
-- DELETE is included as defence in depth. There is no DELETE policy today, so
-- RLS already refuses it; the table grant should not be the only thing standing
-- between a user and deleting their own counter row to reset it to zero.

REVOKE INSERT, UPDATE, DELETE ON public.dokument_counter FROM authenticated;

-- The value guard stays even if a future migration re-grants the write. A
-- counter is a count: it cannot be negative, and no legitimate caller ever
-- tries.
ALTER TABLE public.dokument_counter
  DROP CONSTRAINT IF EXISTS dokument_counter_anzahl_nonnegative_chk;

ALTER TABLE public.dokument_counter
  ADD CONSTRAINT dokument_counter_anzahl_nonnegative_chk
  CHECK (anzahl >= 0);

COMMENT ON TABLE public.dokument_counter IS
  'Monthly document count for free-plan enforcement. Written exclusively by increment_dokument_counter (SECURITY DEFINER); the authenticated role may only read it.';
