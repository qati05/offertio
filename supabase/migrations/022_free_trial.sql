-- 022_free_trial.sql
-- Introduces a 14-day full-access trial for every new account.
--
-- Rationale: The old "5 free docs per month" plan was effectively a crippled
-- trial — users hit the wall within the first week and either churned or felt
-- nickel-and-dimed. A proper trial lets them experience the product at full
-- capacity and turns the upgrade decision into a real signal.
--
-- After trial_ends_at has passed, users fall back to the normal 5/month free
-- limit unless they have upgraded to Pro. Pro users are unaffected.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

COMMENT ON COLUMN profiles.trial_ends_at IS
  'Full-access trial expiry. While now() < trial_ends_at the user is treated as pro for feature gating (unlimited documents, all layouts). NULL means no active trial.';

-- Backfill: give every existing free user 14 days of full access starting now.
-- This is a deliberate goodwill bonus — existing users get to experience the
-- full product and we get a zero-cost conversion test on the current base.
UPDATE profiles
SET trial_ends_at = now() + interval '14 days'
WHERE trial_ends_at IS NULL
  AND (plan IS NULL OR plan = 'free');

-- Update the signup trigger so every new account starts with a 14-day trial.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, trial_ends_at)
  VALUES (new.id, new.email, now() + interval '14 days')
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Helpful index for dashboards / cron jobs that surface users whose trial
-- is about to expire. Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at
  ON profiles (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
