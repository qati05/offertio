-- Migration 009: Atomic document counter increment via server-side function.
-- Replaces the SELECT + UPDATE/INSERT pattern in the API route, which had a
-- TOCTOU race condition under concurrent requests.

CREATE OR REPLACE FUNCTION increment_dokument_counter(p_user_id uuid, p_monat text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
BEGIN
  INSERT INTO dokument_counter (user_id, monat, anzahl)
  VALUES (p_user_id, p_monat, 1)
  ON CONFLICT (user_id, monat)
  DO UPDATE SET anzahl = dokument_counter.anzahl + 1
  RETURNING anzahl INTO new_count;

  RETURN new_count;
END;
$$;

-- Only the service role and the authenticated user (via RLS) may call this.
REVOKE ALL ON FUNCTION increment_dokument_counter(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_dokument_counter(uuid, text) TO authenticated;
