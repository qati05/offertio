-- 016_subscription_metadata.sql
-- Store Lemon Squeezy subscription metadata for proper subscription lifecycle management.
-- Adds: ls_subscription_id, ls_customer_id, plan_expires_at, plan_cancelled_at

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ls_subscription_id  text,
  ADD COLUMN IF NOT EXISTS ls_customer_id      text,
  ADD COLUMN IF NOT EXISTS plan_expires_at     timestamptz,
  ADD COLUMN IF NOT EXISTS plan_cancelled_at   timestamptz;

-- Index for webhook lookups by LS subscription ID
CREATE INDEX IF NOT EXISTS idx_profiles_ls_subscription_id
  ON profiles (ls_subscription_id)
  WHERE ls_subscription_id IS NOT NULL;

COMMENT ON COLUMN profiles.ls_subscription_id  IS 'Lemon Squeezy subscription ID (e.g. "sub_abc123")';
COMMENT ON COLUMN profiles.ls_customer_id      IS 'Lemon Squeezy customer ID for portal access';
COMMENT ON COLUMN profiles.plan_expires_at     IS 'When the current Pro subscription period ends';
COMMENT ON COLUMN profiles.plan_cancelled_at   IS 'When the subscription was cancelled (grace period still active until plan_expires_at)';
