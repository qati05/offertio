-- DACH Multi-Region: country-specific company ID fields
-- Adds steuernummer (DE) and fn_nr (AT) columns.
-- Also tightens land to a 3-value check constraint.

-- 1. New country-specific columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS steuernummer text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fn_nr         text DEFAULT '';

-- 2. Back-fill steuernummer from uid for existing DE users.
--    The previous UI stored the Steuernummer in the uid column for DE.
UPDATE profiles
  SET steuernummer = uid
  WHERE land = 'DE'
    AND uid IS NOT NULL
    AND uid <> ''
    AND steuernummer = '';

-- 3. Enforce land enum (CH / DE / AT).
--    Use a check constraint so bad values are rejected at the DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_land_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_land_check CHECK (land IN ('CH', 'DE', 'AT'));
  END IF;
END $$;
