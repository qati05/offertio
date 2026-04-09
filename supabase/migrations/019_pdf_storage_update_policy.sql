-- Migration 019: Add missing UPDATE policy on pdfs storage bucket.
-- INSERT, SELECT, and DELETE policies exist (013), but UPDATE was missing.
-- The save route uses upsert:true — if a file at the same path already exists,
-- Supabase Storage needs an UPDATE policy for authenticated users.

CREATE POLICY "Users can update own pdfs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
