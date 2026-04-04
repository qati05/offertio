-- Migration 008: Canonicalize uid_mwst as the single VAT-ID column
-- Fixes the uid vs uid_mwst architecture debt introduced in Migration 003.
-- Migration 003 added `uid` as a temporary bridge ("Drop in follow-up migration")
-- — this is that follow-up migration.
--
-- After this migration:
--   uid_mwst is the ONLY column for VAT/UID numbers across all DACH countries.
--   uid and mwst_nr are gone.

-- 1. Final backfill: copy uid -> uid_mwst for any row where uid_mwst is empty
--    This covers profiles that were updated via the old `uid` path after Migration 003.
UPDATE profiles
  SET uid_mwst = uid
  WHERE uid IS NOT NULL
    AND uid <> ''
    AND (uid_mwst IS NULL OR uid_mwst = '');

-- 2. Drop the legacy columns
ALTER TABLE profiles
  DROP COLUMN IF EXISTS uid,
  DROP COLUMN IF EXISTS mwst_nr;

-- 3. The DE format-check constraint profiles_de_uid_mwst_format_check
--    (added in Migration 007) already sits on uid_mwst — it is now the
--    authoritative constraint. No action needed.
--
--    Verify it exists:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_de_uid_mwst_format_check'
  ) THEN
    -- Re-add in case Migration 007 was never applied
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_de_uid_mwst_format_check
      CHECK (
        uid_mwst IS NULL
        OR uid_mwst = ''
        OR land <> 'DE'
        OR uid_mwst ~ '^DE[0-9]{9}$'
      );
  END IF;
END $$;
