-- Migration 018: Kleinunternehmer flag
--
-- Adds a boolean flag to profiles for businesses exempt from VAT:
--   CH: Jahresumsatz < CHF 100'000 → Von der MWST befreit (Art. 10 MWSTG)
--   DE: Jahresumsatz ≤ EUR 22'000 (Vorjahr) / EUR 50'000 (lfd. Jahr) → §19 UStG
--   AT: Jahresumsatz < EUR 35'000 netto → §6 Abs. 1 Z 27 öUStG
--
-- When true:
--   - PDF renders the country-specific legal exemption notice instead of MWST lines
--   - UI locks tax rate to 0% and hides the MWST selector

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kleinunternehmer boolean NOT NULL DEFAULT false;
