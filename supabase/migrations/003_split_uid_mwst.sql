-- Add new separate columns for UID and MWST-Nr
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS uid text DEFAULT '',
  ADD COLUMN IF NOT EXISTS mwst_nr text DEFAULT '';

-- Back-fill: copy old combined field to uid
UPDATE profiles
  SET uid = uid_mwst
  WHERE uid_mwst IS NOT NULL AND uid_mwst <> '';

-- Retain uid_mwst for backwards-compat until all read paths updated
-- (Drop in a follow-up migration once PDF + profile page confirmed)
