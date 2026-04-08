-- Migration 017: Swiss UID format constraint
--
-- Enforces the CHE-XXX.XXX.XXX[ MWST] format for Swiss profiles.
-- Format defined by MWST-Info 01 (ESTV) and UID-Register (BFS):
--   CHE-\d{3}\.\d{3}\.\d{3} (optionally followed by " MWST" if VAT-registered)
--
-- Examples of valid values:
--   CHE-123.456.789
--   CHE-123.456.789 MWST
--   (empty string — field is optional for Kleinunternehmer)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_ch_uid_mwst_format_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_ch_uid_mwst_format_check
      CHECK (
        uid_mwst IS NULL
        OR uid_mwst = ''
        OR land <> 'CH'
        OR uid_mwst ~ '^CHE-[0-9]{3}\.[0-9]{3}\.[0-9]{3}( MWST)?$'
      );
  END IF;
END $$;
