-- Enable §13b Abs. 2 Nr. 8 UStG — Reinigung von Gebäuden und Gebäudeteilen.
--
-- Same mechanism as Nr. 4 (Bauleistungen): the recipient owes the tax when they
-- themselves sustainably perform services of that kind (§13b Abs. 5 S. 2,
-- evidenced by a USt 1 TG certificate). Only the cited paragraph and the
-- printed notice differ.
--
-- This is why 032 stored the case as a CHECK-constrained text column rather
-- than a boolean: enabling a second category is one line here.
--
-- The other ten categories of §13b Abs. 2 stay out of the whitelist on purpose,
-- so a broken or outdated client cannot write a case the application does not
-- implement.
ALTER TABLE public.dokumente
  DROP CONSTRAINT IF EXISTS dokumente_steuerfall_chk;
ALTER TABLE public.dokumente
  ADD CONSTRAINT dokumente_steuerfall_chk
  CHECK (steuerfall IN ('standard', 'reverse_charge_13b_4', 'reverse_charge_13b_8'));

COMMENT ON COLUMN public.dokumente.steuerfall IS
  'Tax treatment. standard = normal VAT. reverse_charge_13b_4 = §13b Abs. 2 Nr. 4 (Bauleistungen). reverse_charge_13b_8 = §13b Abs. 2 Nr. 8 (Gebäudereinigung). Both domestic DE, asserted by the issuer, never inferred.';
