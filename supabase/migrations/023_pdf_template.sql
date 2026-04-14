-- 023_pdf_template.sql
-- Adds pdf_template column to profiles.
--
-- The column is already read and written in:
--   src/app/(app)/dokument/neu/page.tsx         → profil.pdf_template ?? "classic"
--   src/app/(app)/einstellungen/profil/page.tsx → update({ pdf_template: pdfTemplate })
--
-- Without this column the template selection in Einstellungen silently fails
-- (Supabase ignores unknown columns on update) and every user falls back to
-- "classic" on every page load even after saving a different choice.
--
-- Allowed values match the UI options in einstellungen/profil/page.tsx:
--   "classic" | "modern" | "minimal" | "professionell"

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pdf_template text DEFAULT 'classic';

-- Constraint keeps DB consistent with the four UI choices
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_pdf_template_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_pdf_template_check
  CHECK (pdf_template IN ('classic', 'modern', 'minimal', 'professionell'));

COMMENT ON COLUMN profiles.pdf_template IS
  'PDF layout template selected by the user. One of: classic, modern, minimal, professionell. Defaults to classic.';
