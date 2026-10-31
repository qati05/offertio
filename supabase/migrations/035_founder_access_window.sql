-- 035_founder_access_window.sql
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
      NEW.stripe_payment_intent_id := NULL;
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
    NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
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

-- 033 revokes plan = 'lifetime' but cannot see these columns yet.
-- A reversed payment must also drop the access window, otherwise a later
-- purchase keeps the original (possibly expired or shortened) term.
CREATE OR REPLACE FUNCTION public.revoke_lifetime_for_refund(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_customer_id text,
  p_payment_intent_id text,
  p_session_id text,
  p_amount integer,
  p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
  v_id uuid;
  v_plan text;
  v_payment_intent text;
  v_session text;
  v_changed integer;
  v_released integer;
BEGIN
  IF p_event_id IS NULL OR p_event_type IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args');
  END IF;

  IF p_currency IS NOT NULL AND lower(p_currency) <> 'chf' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'unexpected-currency');
  END IF;

  IF p_amount IS DISTINCT FROM 24900 THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'unexpected-amount');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('offertio_founder_seats'));

  INSERT INTO public.stripe_webhook_events (id, event_type, checkout_session_id, user_id)
  VALUES (p_event_id, p_event_type, p_session_id, p_user_id)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'duplicate');
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT id, plan, stripe_payment_intent_id, stripe_checkout_session_id
      INTO v_id, v_plan, v_payment_intent, v_session
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  IF v_id IS NULL AND p_payment_intent_id IS NOT NULL THEN
    SELECT id, plan, stripe_payment_intent_id, stripe_checkout_session_id
      INTO v_id, v_plan, v_payment_intent, v_session
    FROM public.profiles
    WHERE stripe_payment_intent_id = p_payment_intent_id
    LIMIT 1;
  END IF;

  IF v_id IS NULL AND p_session_id IS NOT NULL THEN
    SELECT id, plan, stripe_payment_intent_id, stripe_checkout_session_id
      INTO v_id, v_plan, v_payment_intent, v_session
    FROM public.profiles
    WHERE stripe_checkout_session_id = p_session_id
    LIMIT 1;
  END IF;

  IF v_id IS NULL AND p_customer_id IS NOT NULL THEN
    SELECT id, plan, stripe_payment_intent_id, stripe_checkout_session_id
      INTO v_id, v_plan, v_payment_intent, v_session
    FROM public.profiles
    WHERE stripe_customer_id = p_customer_id
    ORDER BY (plan = 'lifetime') DESC, lifetime_purchased_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'not_found');
  END IF;

  IF p_payment_intent_id IS NOT NULL
     AND v_payment_intent IS NOT NULL
     AND v_payment_intent <> p_payment_intent_id THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'different-payment', 'user_id', v_id);
  END IF;

  IF p_session_id IS NOT NULL
     AND v_session IS NOT NULL
     AND v_session <> p_session_id
     AND p_payment_intent_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'different-payment', 'user_id', v_id);
  END IF;

  UPDATE public.profiles
  SET plan = 'free',
      lifetime_purchased_at = NULL,
      founder_paid_at = NULL,
      founder_access_until = NULL,
      plan_cancelled_at = now()
  WHERE id = v_id
    AND plan = 'lifetime';
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  UPDATE public.founder_seats
  SET status = 'released'
  WHERE user_id = v_id
    AND status = 'confirmed';
  GET DIAGNOSTICS v_released = ROW_COUNT;

  IF v_changed > 0 OR v_released > 0 THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'revoked', 'user_id', v_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'already_revoked', 'user_id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_lifetime_for_refund(text, text, uuid, text, text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_lifetime_for_refund(text, text, uuid, text, text, text, integer, text) TO service_role;
