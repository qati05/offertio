-- Harden waitlist storage: keep table private to server-only routes.
-- Also add the fields used by the application.

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS vorname text,
  ADD COLUMN IF NOT EXISTS nachname text,
  ADD COLUMN IF NOT EXISTS beruf text;

DROP POLICY IF EXISTS "Anyone can insert waitlist" ON waitlist;
DROP POLICY IF EXISTS "Anyone can count waitlist" ON waitlist;
DROP POLICY IF EXISTS anyone_insert_waitlist ON waitlist;
DROP POLICY IF EXISTS anyone_select_waitlist ON waitlist;
