-- 034_founder_setup.sql
-- Materials founders send after the lifetime purchase (logo, price list, company data).
-- submitted_at is the receipt time for the 48-hour guarantee and cannot be set by the client.
-- Files live in the private founder-setup bucket. Only the owning user can read or write them.

CREATE TABLE IF NOT EXISTS public.founder_setup_submissions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firmenname text NOT NULL CHECK (char_length(firmenname) BETWEEN 1 AND 200),
  adresse text NOT NULL CHECK (char_length(adresse) BETWEEN 1 AND 300),
  plz text NOT NULL CHECK (char_length(plz) BETWEEN 4 AND 10),
  ort text NOT NULL CHECK (char_length(ort) BETWEEN 1 AND 120),
  telefon text NOT NULL DEFAULT '' CHECK (char_length(telefon) <= 40),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
  iban text NOT NULL DEFAULT '' CHECK (char_length(iban) <= 34),
  uid_mwst text NOT NULL DEFAULT '' CHECK (char_length(uid_mwst) <= 40),
  logo_path text NOT NULL CHECK (
    char_length(logo_path) BETWEEN 8 AND 240
    AND logo_path LIKE user_id::text || '/%'
    AND position('..' in logo_path) = 0
  ),
  preisliste_path text NOT NULL CHECK (
    char_length(preisliste_path) BETWEEN 8 AND 240
    AND preisliste_path LIKE user_id::text || '/%'
    AND position('..' in preisliste_path) = 0
  ),
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_setup_submissions_user_submitted_idx
  ON public.founder_setup_submissions (user_id, submitted_at);

COMMENT ON TABLE public.founder_setup_submissions IS
  'Founder onboarding materials. submitted_at starts the 48-hour setup guarantee.';
COMMENT ON COLUMN public.founder_setup_submissions.submitted_at IS
  'Server receipt time. A BEFORE INSERT trigger overwrites any client value.';

ALTER TABLE public.founder_setup_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_setup_submissions FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.founder_setup_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.submitted_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS founder_setup_stamp ON public.founder_setup_submissions;
CREATE TRIGGER founder_setup_stamp
  BEFORE INSERT ON public.founder_setup_submissions
  FOR EACH ROW
  EXECUTE PROCEDURE public.founder_setup_stamp();

REVOKE ALL ON FUNCTION public.founder_setup_stamp() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS founder_setup_submissions_select ON public.founder_setup_submissions;
CREATE POLICY founder_setup_submissions_select
  ON public.founder_setup_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS founder_setup_submissions_insert ON public.founder_setup_submissions;
CREATE POLICY founder_setup_submissions_insert
  ON public.founder_setup_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.founder_setup_submissions FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.founder_setup_submissions TO authenticated;
GRANT ALL ON TABLE public.founder_setup_submissions TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'founder-setup',
  'founder-setup',
  false,
  8388608,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/webp',
    'image/heic',
    'image/heif',
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS founder_setup_storage_select ON storage.objects;
CREATE POLICY founder_setup_storage_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'founder-setup'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS founder_setup_storage_insert ON storage.objects;
CREATE POLICY founder_setup_storage_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'founder-setup'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS founder_setup_storage_delete ON storage.objects;
CREATE POLICY founder_setup_storage_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'founder-setup'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
