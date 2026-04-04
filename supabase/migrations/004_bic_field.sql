-- Add BIC/SWIFT field for DE/AT SEPA payment info on invoices
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bic text DEFAULT '';
