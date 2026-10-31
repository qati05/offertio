-- 032_lifetime_founder_seats.sql
-- One-time Gründerplatz (plan = 'lifetime') paid via Stripe Checkout.
--
-- Seat sales are capped in reserve_founder_seat (default 20, passed by the app).
-- A transaction-scoped advisory lock serialises the count so two checkouts
-- cannot both take the last seat.
-- Webhook grants are idempotent on stripe_webhook_events.id.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS lifetime_purchased_at timestamptz;

COMMENT ON COLUMN public.profiles.plan IS
  'free | pro | pro_monthly | pro_yearly | lifetime. lifetime is the one-time Gründerplatz and removes free-plan limits.';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Stripe Customer id (cus_...) for the Gründerplatz payment.';
COMMENT ON COLUMN public.profiles.stripe_checkout_session_id IS
  'Stripe Checkout Session that granted lifetime access.';
COMMENT ON COLUMN public.profiles.lifetime_purchased_at IS
  'When the Gründerplatz payment was confirmed.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_checkout_session_id_uidx
  ON public.profiles (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_plan_lifetime_idx
  ON public.profiles (id)
  WHERE plan = 'lifetime';

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  checkout_session_id text,
  user_id uuid,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.founder_seats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL,
  stripe_checkout_session_id text,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  CONSTRAINT founder_seats_status_chk CHECK (status IN ('reserved', 'confirmed', 'released'))
);

CREATE UNIQUE INDEX IF NOT EXISTS founder_seats_session_uidx
  ON public.founder_seats (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS founder_seats_active_idx
  ON public.founder_seats (status, expires_at);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_seats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.founder_seats FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stripe_webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.founder_seats TO service_role;

-- Authenticated users must not promote themselves to lifetime or rewrite billing columns.
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
    NEW.ls_subscription_id := OLD.ls_subscription_id;
    NEW.ls_customer_id := OLD.ls_customer_id;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.plan_cancelled_at := OLD.plan_cancelled_at;
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_billing_columns ON public.profiles;
CREATE TRIGGER protect_profile_billing_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing_columns();

CREATE OR REPLACE FUNCTION public.founder_seats_taken()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM (
    SELECT user_id AS id
    FROM public.founder_seats
    WHERE status = 'confirmed'
       OR (status = 'reserved' AND expires_at > now())
    UNION
    SELECT id
    FROM public.profiles
    WHERE plan = 'lifetime'
  ) seats;
$$;

CREATE OR REPLACE FUNCTION public.founder_seat_availability(p_seat_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taken integer;
BEGIN
  v_taken := public.founder_seats_taken();
  IF p_seat_limit IS NULL OR p_seat_limit = 0 THEN
    RETURN jsonb_build_object(
      'taken', v_taken,
      'limit', NULL,
      'sold_out', false,
      'remaining', NULL
    );
  END IF;
  RETURN jsonb_build_object(
    'taken', v_taken,
    'limit', p_seat_limit,
    'sold_out', v_taken >= p_seat_limit,
    'remaining', greatest(p_seat_limit - v_taken, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_founder_seat(
  p_user_id uuid,
  p_seat_limit integer,
  p_hold_seconds integer DEFAULT 93600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taken integer;
  v_status text;
  v_expires timestamptz;
  v_session text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_user');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('offertio_founder_seats'));

  UPDATE public.founder_seats
  SET status = 'released'
  WHERE status = 'reserved'
    AND expires_at <= now();

  SELECT status, expires_at, stripe_checkout_session_id
    INTO v_status, v_expires, v_session
  FROM public.founder_seats
  WHERE user_id = p_user_id;

  IF v_status = 'confirmed' OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND plan = 'lifetime'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_lifetime', 'status', 'confirmed');
  END IF;

  IF v_status = 'reserved' AND v_expires > now() THEN
    UPDATE public.founder_seats
    SET expires_at = now() + make_interval(secs => p_hold_seconds),
        reserved_at = now()
    WHERE user_id = p_user_id
    RETURNING stripe_checkout_session_id INTO v_session;

    RETURN jsonb_build_object(
      'ok', true,
      'reason', 'reserved',
      'status', 'reserved',
      'session_id', v_session
    );
  END IF;

  v_taken := public.founder_seats_taken();
  IF p_seat_limit IS NOT NULL AND p_seat_limit > 0 AND v_taken >= p_seat_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'sold_out',
      'taken', v_taken,
      'limit', p_seat_limit
    );
  END IF;

  INSERT INTO public.founder_seats (user_id, status, reserved_at, expires_at)
  VALUES (
    p_user_id,
    'reserved',
    now(),
    now() + make_interval(secs => p_hold_seconds)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'reserved',
        stripe_checkout_session_id = NULL,
        reserved_at = now(),
        confirmed_at = NULL,
        expires_at = now() + make_interval(secs => p_hold_seconds);

  RETURN jsonb_build_object('ok', true, 'reason', 'reserved', 'status', 'reserved', 'session_id', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_founder_checkout_session(
  p_user_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.founder_seats
  SET stripe_checkout_session_id = p_session_id
  WHERE user_id = p_user_id
    AND status = 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_founder_reservation(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.founder_seats
  SET status = 'released'
  WHERE user_id = p_user_id
    AND status = 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_founder_seat_for_session(
  p_event_id text,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  IF p_event_id IS NULL OR p_session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_args');
  END IF;

  INSERT INTO public.stripe_webhook_events (id, event_type, checkout_session_id)
  VALUES (p_event_id, 'checkout.session.expired', p_session_id)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'duplicate');
  END IF;

  UPDATE public.founder_seats
  SET status = 'released'
  WHERE status = 'reserved'
    AND stripe_checkout_session_id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'reason', 'released');
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_lifetime_seat(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_session_id text,
  p_customer_id text,
  p_seat_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
  v_plan text;
  v_status text;
  v_expires timestamptz;
  v_taken integer;
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
        lifetime_purchased_at = coalesce(lifetime_purchased_at, now())
    WHERE id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'reason', 'already_lifetime');
  END IF;

  SELECT status, expires_at INTO v_status, v_expires
  FROM public.founder_seats
  WHERE user_id = p_user_id;

  IF NOT (
    v_status = 'confirmed'
    OR (v_status = 'reserved' AND v_expires > now())
  ) THEN
    v_taken := public.founder_seats_taken();
    IF p_seat_limit IS NOT NULL AND p_seat_limit > 0 AND v_taken >= p_seat_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'sold_out', 'taken', v_taken, 'limit', p_seat_limit);
    END IF;
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
      lifetime_purchased_at = coalesce(lifetime_purchased_at, now()),
      plan_cancelled_at = NULL,
      plan_expires_at = NULL
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'reason', 'granted');
END;
$$;

REVOKE ALL ON FUNCTION public.founder_seats_taken() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.founder_seat_availability(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_founder_seat(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_founder_checkout_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_founder_reservation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_founder_seat_for_session(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_lifetime_seat(text, text, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.founder_seats_taken() TO service_role;
GRANT EXECUTE ON FUNCTION public.founder_seat_availability(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_founder_seat(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_founder_checkout_session(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_founder_reservation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_founder_seat_for_session(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_lifetime_seat(text, text, uuid, text, text, integer) TO service_role;
