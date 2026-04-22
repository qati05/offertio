-- Persist the structured fields needed to reconstruct a document.
--
-- Until now, dokumente stored only summary metadata (kunde, betrag, status, pdf_url)
-- and the rendered PDF. To convert an Offerte → Rechnung the user had to retype
-- every line item. With these columns the carryover (?from=<id>) flow can preload
-- positionen, the MWST rate, optional rabatt, free-form notiz, and preis_mode.
--
-- Defaults are set so existing rows stay valid (positionen → empty array; the
-- numeric / text fields stay NULL and the UI falls back to its own defaults).

ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS positionen jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mwst_satz numeric(5, 2),
  ADD COLUMN IF NOT EXISTS rabatt jsonb,
  ADD COLUMN IF NOT EXISTS notiz text,
  ADD COLUMN IF NOT EXISTS preis_mode text CHECK (preis_mode IS NULL OR preis_mode IN ('exkl', 'inkl'));

-- Cap notiz length to prevent oversized payloads from being persisted.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_notiz_len_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_notiz_len_chk CHECK (notiz IS NULL OR char_length(notiz) <= 4000);
