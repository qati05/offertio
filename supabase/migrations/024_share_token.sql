-- Add share_token for public recipient view links
-- Each document gets a unique random UUID on creation (and backfilled for existing rows).
ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX IF NOT EXISTS dokumente_share_token_idx
  ON public.dokumente (share_token)
  WHERE share_token IS NOT NULL;

-- Backfill any rows that somehow have NULL (should be none after ADD COLUMN fills defaults)
UPDATE public.dokumente SET share_token = gen_random_uuid() WHERE share_token IS NULL;
