-- 036_launch_security_guards.sql
-- Free-plan quota is consumed atomically (no check-then-act race).
-- PDF paths and logos cannot point at another account.
-- handle_new_user keeps a fixed search_path after the referral rewrite.
-- The public logos bucket stays publicly readable by URL, but is not listable.

CREATE OR REPLACE FUNCTION public.try_consume_dokument_slot(
  p_user_id uuid,
  p_monat text,
  p_limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF p_user_id IS NULL OR p_monat IS NULL OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  IF p_monat !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'invalid_month' USING ERRCODE = '22023';
  END IF;

  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.dokument_counter (user_id, monat, anzahl)
  VALUES (p_user_id, p_monat, 1)
  ON CONFLICT (user_id, monat)
  DO UPDATE SET anzahl = public.dokument_counter.anzahl + 1
  WHERE public.dokument_counter.anzahl < p_limit
  RETURNING anzahl INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.try_consume_dokument_slot(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.try_consume_dokument_slot(uuid, text, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_owned_pdf_path()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pdf_url IS NULL OR btrim(NEW.pdf_url) = '' THEN
    RETURN NEW;
  END IF;

  IF position('..' in NEW.pdf_url) > 0
     OR position(chr(92) in NEW.pdf_url) > 0
     OR NEW.pdf_url LIKE '/%'
     OR NEW.pdf_url NOT LIKE NEW.user_id::text || '/%' THEN
    RAISE EXCEPTION 'invalid_pdf_path' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_owned_pdf_path ON public.dokumente;
CREATE TRIGGER enforce_owned_pdf_path
  BEFORE INSERT OR UPDATE OF pdf_url, user_id ON public.dokumente
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_owned_pdf_path();

REVOKE ALL ON FUNCTION public.enforce_owned_pdf_path() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_logo_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  logo_pattern text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND coalesce(auth.role(), '') <> 'service_role'
     AND NEW.logo_url IS DISTINCT FROM OLD.logo_url THEN
    IF NEW.logo_url IS NOT NULL AND btrim(NEW.logo_url) <> '' THEN
      logo_pattern := '^https://[A-Za-z0-9.-]+\.supabase\.(co|in)/storage/v1/object/public/logos/'
        || NEW.id::text
        || '/logo\.(png|jpe?g|webp)(\?.*)?$';
      IF NEW.logo_url !~ logo_pattern THEN
        RAISE EXCEPTION 'invalid_logo_url' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_logo_url ON public.profiles;
CREATE TRIGGER protect_profile_logo_url
  BEFORE UPDATE OF logo_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_logo_url();

REVOKE ALL ON FUNCTION public.protect_profile_logo_url() FROM PUBLIC, anon, authenticated;

-- Migration 025 replaced handle_new_user without SET search_path.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  exists_count integer;
BEGIN
  LOOP
    candidate := '';
    FOR _i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, (floor(random() * length(alphabet))::integer) + 1, 1);
    END LOOP;
    SELECT count(*) INTO exists_count FROM profiles WHERE referral_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, trial_ends_at, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    now() + interval '14 days',
    public.generate_referral_code()
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own logos" ON storage.objects;
CREATE POLICY "Users can view own logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]::text[]
WHERE id = 'founder-setup';
