-- Migration 010: Production hardening and app/DB sync
-- Aligns live Supabase with application expectations:
-- - creates the missing logos storage bucket + policies
-- - creates the missing increment_dokument_counter RPC function
-- - hardens handle_new_user with a fixed search_path
-- - optimizes RLS policies to use (select auth.uid())
-- - adds covering indexes for common access patterns

-- 1. Missing RPC used by /api/dokument/check-limit
CREATE OR REPLACE FUNCTION public.increment_dokument_counter(p_user_id uuid, p_monat text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
BEGIN
  INSERT INTO public.dokument_counter (user_id, monat, anzahl)
  VALUES (p_user_id, p_monat, 1)
  ON CONFLICT (user_id, monat)
  DO UPDATE SET anzahl = public.dokument_counter.anzahl + 1
  RETURNING anzahl INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_dokument_counter(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_dokument_counter(uuid, text) TO authenticated;

-- 2. Harden signup trigger helper
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- 3. RLS policy optimization: use (select auth.uid()) to avoid per-row re-evaluation
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can read own vorlagen" ON public.vorlagen;
DROP POLICY IF EXISTS "Users can insert own vorlagen" ON public.vorlagen;
DROP POLICY IF EXISTS "Users can update own vorlagen" ON public.vorlagen;
DROP POLICY IF EXISTS "Users can delete own vorlagen" ON public.vorlagen;

CREATE POLICY "Users can read own vorlagen"
  ON public.vorlagen FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own vorlagen"
  ON public.vorlagen FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own vorlagen"
  ON public.vorlagen FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vorlagen"
  ON public.vorlagen FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own counters" ON public.dokument_counter;
DROP POLICY IF EXISTS "Users can insert own counters" ON public.dokument_counter;
DROP POLICY IF EXISTS "Users can update own counters" ON public.dokument_counter;

CREATE POLICY "Users can read own counters"
  ON public.dokument_counter FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own counters"
  ON public.dokument_counter FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own counters"
  ON public.dokument_counter FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

-- 4. Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_vorlagen_user_id_created_at
  ON public.vorlagen (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email);

-- 5. Storage bucket required by profile logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own logos" ON storage.objects;

CREATE POLICY "Public can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload own logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Authenticated users can update own logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Authenticated users can delete own logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
