-- Add the 'farbig' PDF template option plus a custom accent-color preference.
--
-- Why store the accent color on profiles rather than per-document?
--   A document's PDF is an immutable artifact once rendered; re-rendering
--   history to apply a new brand color would be surprising. Instead, the
--   user picks a brand color once (or leaves it at the default offertio orange)
--   and it's baked into every newly-generated PDF. A future migration can add
--   per-document overrides if customers ask for it.
--
-- The CHECK constraint accepts hex colors in canonical 6-digit lowercase form
-- (#RRGGBB). The UI normalizes input so 3-digit hex, uppercase, or rgb() inputs
-- are converted before save.

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_pdf_template_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_pdf_template_check
  CHECK (pdf_template IN ('classic', 'modern', 'minimal', 'professionell', 'farbig'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pdf_accent_color text;

-- Accept only canonical 6-digit hex or NULL. DB-side guard in case the client
-- validation is bypassed.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_pdf_accent_color_chk;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_pdf_accent_color_chk
  CHECK (pdf_accent_color IS NULL OR pdf_accent_color ~ '^#[0-9a-f]{6}$');

COMMENT ON COLUMN profiles.pdf_accent_color IS
  'Hex color (e.g. #c8793d) used as the accent color in the "farbig" PDF template. NULL = use offertio default.';
