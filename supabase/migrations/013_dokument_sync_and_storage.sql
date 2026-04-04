-- 1. Create dokumente table for history sync
CREATE TABLE IF NOT EXISTS public.dokumente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  typ text NOT NULL CHECK (typ IN ('offerte', 'rechnung')),
  nummer text NOT NULL,
  objekt text,
  kundenname text NOT NULL,
  betrag numeric(12, 2) NOT NULL,
  datum date NOT NULL,
  status text NOT NULL DEFAULT 'gesendet',
  pdf_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS for dokumente
ALTER TABLE public.dokumente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" 
  ON public.dokumente FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" 
  ON public.dokumente FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
  ON public.dokumente FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
  ON public.dokumente FOR DELETE 
  USING (auth.uid() = user_id);

-- 2. Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdfs', 'pdfs', false, 7340032, '{application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDFs
CREATE POLICY "Users can upload own pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pdfs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pdfs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pdfs' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
