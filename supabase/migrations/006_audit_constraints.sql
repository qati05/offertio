-- Audit fixes: country-required tax field constraints + IBAN country prefix validation

-- H6a: DE profiles must have a non-empty steuernummer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_de_steuernummer_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_de_steuernummer_check
      CHECK (land <> 'DE' OR (steuernummer IS NOT NULL AND steuernummer <> ''));
  END IF;
END $$;

-- H6b: AT profiles must have a non-empty fn_nr (Firmenbuchnummer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_at_fn_nr_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_at_fn_nr_check
      CHECK (land <> 'AT' OR (fn_nr IS NOT NULL AND fn_nr <> ''));
  END IF;
END $$;

-- H6c: IBAN country prefix must match the profile land
--      Reject CH IBAN on DE profile, DE IBAN on AT profile, etc.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_iban_country_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_iban_country_check
      CHECK (
        iban IS NULL OR iban = '' OR
        (land = 'CH' AND iban LIKE 'CH%') OR
        (land = 'DE' AND iban LIKE 'DE%') OR
        (land = 'AT' AND iban LIKE 'AT%')
      );
  END IF;
END $$;
