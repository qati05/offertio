-- Signature persistence for offerte acceptance via recipient view.
--
-- When a recipient signs via /view/[token], we now persist the drawn SVG path
-- along with accept/reject metadata so a) the sender has a legal trail, and
-- b) rejected offers can be distinguished from pending ones.
ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS signature_path text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Cap signature path length defensively (an SVG path over 50KB is almost
-- certainly pathological input, not a real signature).
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_signature_path_len_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_signature_path_len_chk
  CHECK (signature_path IS NULL OR length(signature_path) <= 50000);

-- Cap rejection reason so users can't paste novels.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_rejection_reason_len_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_rejection_reason_len_chk
  CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 1000);
