-- 034_founder_access_window.sql
-- The CHF 249 payment covers two years, not a lifetime licence.
-- founder_paid_at is the receipt time. founder_access_until is that time plus 2 years,
-- so a later CHF 9/month subscription can attach without another checkout change.
-- plan = 'lifetime' stays the internal access flag until that subscription exists.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_access_until timestamptz;

COMMENT ON COLUMN public.profiles.founder_paid_at IS
  'When the one-time Gründerplatz payment (CHF 249) was confirmed.';
COMMENT ON COLUMN public.profiles.founder_access_until IS
  'founder_paid_at + 2 years. Included access ends here; the CHF 9 founder price starts after.';

CREATE INDEX IF NOT EXISTS profiles_founder_access_until_idx
  ON public.profiles (founder_access_until)
  WHERE plan = 'lifetime';

CREATE OR REPLACE FUNCTION public.stamp_founder_access_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'lifetime' THEN
    IF NEW.founder_paid_at IS NULL THEN
      NEW.founder_paid_at := coalesce(NEW.lifetime_purchased_at, now());
    END IF;
    IF NEW.founder_access_until IS NULL THEN
      NEW.founder_access_until := NEW.founder_paid_at + interval '2 years';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_founder_access_window ON public.profiles;
CREATE TRIGGER stamp_founder_access_window
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.stamp_founder_access_window();

REVOKE ALL ON FUNCTION public.stamp_founder_access_window() FROM PUBLIC, anon, authenticated;

-- Keep the billing lock, and stop users from rewriting the new window.
CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
      IF coalesce(NEW.plan, 'free') <> 'free' THEN
        NEW.plan := 'free';
      END IF;
      NEW.stripe_customer_id := NULL;
      NEW.stripe_checkout_session_id := NULL;
      NEW.lifetime_purchased_at := NULL;
      NEW.founder_paid_at := NULL;
      NEW.founder_access_until := NULL;
      NEW.ls_subscription_id := NULL;
      NEW.ls_customer_id := NULL;
      NEW.plan_expires_at := NULL;
      NEW.plan_cancelled_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.plan := OLD.plan;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_checkout_session_id := OLD.stripe_checkout_session_id;
    NEW.lifetime_purchased_at := OLD.lifetime_purchased_at;
    NEW.founder_paid_at := OLD.founder_paid_at;
    NEW.founder_access_until := OLD.founder_access_until;
    NEW.ls_subscription_id := OLD.ls_subscription_id;
    NEW.ls_customer_id := OLD.ls_customer_id;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.plan_cancelled_at := OLD.plan_cancelled_at;
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill existing founder payments. The stamp trigger fills a missing end date.
UPDATE public.profiles
SET lifetime_purchased_at = coalesce(lifetime_purchased_at, now())
WHERE plan = 'lifetime'
  AND (founder_paid_at IS NULL OR founder_access_until IS NULL);
