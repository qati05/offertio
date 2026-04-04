-- E-Rechnung / ZUGFeRD Phase 3: uid_mwst (USt-IdNr.) for German customers
-- Formalises uid_mwst as the canonical DE VAT-ID field and adds the
-- onboarding_complete flag used by the frontend after first-login setup.

-- 1. Add onboarding_complete flag (referenced in types.ts but not yet in DB)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- 2. Soft format constraint for DE uid_mwst.
--    When a German profile provides uid_mwst it MUST start with "DE"
--    followed by exactly 9 digits (standard EU VAT number format).
--    Empty strings are allowed (field is optional for free plan users).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_de_uid_mwst_format_check'
  ) THEN
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

-- 3. Back-fill: for DE profiles that have the old uid column set (which stores
--    the USt-IdNr.) but uid_mwst is still empty, copy uid → uid_mwst so
--    ZUGFeRD XML generation (BT-31) works without code-path changes.
UPDATE profiles
  SET uid_mwst = uid
  WHERE land = 'DE'
    AND uid IS NOT NULL
    AND uid <> ''
    AND (uid_mwst IS NULL OR uid_mwst = '')
    AND uid ~ '^DE[0-9]{9}$';
