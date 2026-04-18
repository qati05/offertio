-- Migration 024: Referral program scaffold
--
-- A lightweight referral system: each profile owns a unique, short,
-- human-readable referral code. New signups that arrive via ?ref=<code>
-- are credited to the owning profile via the referrals table. Reward
-- attribution and payout live downstream (Phase 5+) — this migration
-- only provides the bookkeeping surface.
--
-- The referrals row is immutable once created. We never store PII on
-- the referrer path — only a link between the referred user's profile
-- and the referrer's profile.

-- 1. Per-profile unique referral code -----------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Helper: 8-char Base32-ish code (uppercase, no ambiguous chars).
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I/L
  code text;
  candidate text;
  exists_count integer;
BEGIN
  LOOP
    candidate := '';
    FOR _i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, (floor(random() * length(alphabet))::integer) + 1, 1);
    END LOOP;
    SELECT count(*) INTO exists_count FROM profiles WHERE referral_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Backfill existing profiles that lack a code.
UPDATE profiles
  SET referral_code = public.generate_referral_code()
  WHERE referral_code IS NULL;

-- Auto-assign a code when new profiles are created (via handle_new_user).
-- We modify handle_new_user to include the code generation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, trial_ends_at, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    now() + interval '14 days',
    public.generate_referral_code()
  );
  RETURN NEW;
END;
$$;

-- 2. Referrals table ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Reward state; set to 'paid' once the referred user becomes a paying
  -- customer and the reward has been credited.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'paid', 'void')),
  qualified_at timestamptz,
  paid_at timestamptz,
  -- Keep one referral record per referred user — idempotency guard.
  CONSTRAINT referrals_unique_referred UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status      ON referrals(status);

-- 3. RLS ----------------------------------------------------------------------

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- A user sees only their own referral ledger (as referrer).
DROP POLICY IF EXISTS "referrer can read own referrals" ON referrals;
CREATE POLICY "referrer can read own referrals"
  ON referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- A referred user sees only their own record.
DROP POLICY IF EXISTS "referred can read own row" ON referrals;
CREATE POLICY "referred can read own row"
  ON referrals
  FOR SELECT
  USING (auth.uid() = referred_id);

-- Inserts only happen via service-role (server-side) during signup. No user
-- policy for INSERT / UPDATE / DELETE — the table is fully server-managed.

COMMENT ON TABLE referrals IS
  'Referral ledger. referrer_id credited when referred_id signs up with ?ref=<code>.';
