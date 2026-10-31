-- 033_lifetime_refund.sql
-- A full refund of the CHF 249 Gründerplatz revokes profiles.plan = 'lifetime'
-- and releases the confirmed founder seat so founder_seats_taken() drops by one.
-- Partial refunds are ignored by the application before this function is called.
--
-- Also:
-- * remember the PaymentIntent so refund.* events can find the buyer
-- * stop authenticated users from incrementing someone else's document counter
-- * a paid grant is no longer rejected after the money was taken (the cap stays
--   on reserve_founder_seat, before Checkout starts)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

COMMENT ON COLUMN public.profiles.stripe_payment_intent_id IS
  'Stripe PaymentIntent (pi_...) of the Gründerplatz charge. Used to match refunds.';

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_stripe_payment_intent_id_idx
  ON public.profiles (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

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
    NEW.ls_subscription_id := OLD.ls_subscription_id;
    NEW.ls_customer_id := OLD.ls_customer_id;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.plan_cancelled_at := OLD.plan_cancelled_at;
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;

  RETURN NEW;
END;
$$;

-- The previous 6-argument overload must go. PostgREST cannot choose between
-- two grant_lifetime_seat signatures.
DROP FUNCTION IF EXISTS public.grant_lifetime_seat(text, text, uuid, text, text, integer);

CREATE OR REPLACE FUNCTION public.grant_lifetime_seat(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_session_id text,
  p_customer_id text,
  p_seat_limit integer,
  p_payment_intent_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
  v_plan text;
BEGIN
  IF p_event_id IS NULL OR p_user_id IS NULL OR p_session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('offertio_founder_seats'));

  INSERT INTO public.stripe_webhook_events (id, event_type, checkout_session_id, user_id)
  VALUES (p_event_id, coalesce(p_event_type, 'checkout.session.completed'), p_session_id, p_user_id)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'duplicate');
  END IF;

  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- The seat cap is enforced in reserve_founder_seat before Checkout opens.
  -- A verified payment always grants. p_seat_limit stays in the signature so
  -- the webhook can keep sending the configured cap.

  IF v_plan = 'lifetime' THEN
    INSERT INTO public.founder_seats (
      user_id, status, stripe_checkout_session_id, reserved_at, expires_at, confirmed_at
    )
    VALUES (p_user_id, 'confirmed', p_session_id, now(), now(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'confirmed',
          stripe_checkout_session_id = coalesce(public.founder_seats.stripe_checkout_session_id, excluded.stripe_checkout_session_id),
          confirmed_at = coalesce(public.founder_seats.confirmed_at, now());

    UPDATE public.profiles
    SET stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
        stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_session_id),
        stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
        lifetime_purchased_at = coalesce(lifetime_purchased_at, now())
    WHERE id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'reason', 'already_lifetime');
  END IF;

  INSERT INTO public.founder_seats (
    user_id, status, stripe_checkout_session_id, reserved_at, expires_at, confirmed_at
  )
  VALUES (p_user_id, 'confirmed', p_session_id, now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'confirmed',
        stripe_checkout_session_id = excluded.stripe_checkout_session_id,
        confirmed_at = now();

  UPDATE public.profiles
  SET plan = 'lifetime',
      stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
      stripe_checkout_session_id = p_session_id,
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      lifetime_purchased_at = coalesce(lifetime_purchased_at, now()),
      plan_cancelled_at = NULL,
      plan_expires_at = NULL
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'reason', 'granted');
END;
$$;

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

  -- Full Gründerplatz refund only. 24900 rappen = CHF 249.00.
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

  -- A later purchase must survive a delayed event for the previous charge.
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
      plan_cancelled_at = now()
  WHERE id = v_id
    AND plan = 'lifetime';
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  -- Confirmed seats count toward the cap. Reserved holds belong to a new
  -- checkout and must stay until they expire or complete.
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

REVOKE ALL ON FUNCTION public.grant_lifetime_seat(text, text, uuid, text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_lifetime_for_refund(text, text, uuid, text, text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_lifetime_seat(text, text, uuid, text, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_lifetime_for_refund(text, text, uuid, text, text, text, integer, text) TO service_role;

-- SECURITY DEFINER bypasses RLS. Without this check any signed-in user can
-- increment another account's free-plan counter.
CREATE OR REPLACE FUNCTION public.increment_dokument_counter(p_user_id uuid, p_monat text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.dokument_counter (user_id, monat, anzahl)
  VALUES (p_user_id, p_monat, 1)
  ON CONFLICT (user_id, monat)
  DO UPDATE SET anzahl = public.dokument_counter.anzahl + 1
  RETURNING anzahl INTO new_count;

  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_dokument_counter(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_dokument_counter(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_dokument_counter(uuid, text) TO service_role;

-- Direct writes let a free-plan user reset anzahl and skip the monthly cap.
-- The counter moves only through increment_dokument_counter (security definer).
DROP POLICY IF EXISTS "Users can insert own counters" ON public.dokument_counter;
DROP POLICY IF EXISTS "Users can update own counters" ON public.dokument_counter;
