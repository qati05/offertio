# Operations

## Goal

This document describes how to run, deploy, and maintain Offertio in a production-like environment.

## Runtime Model

Primary runtime assumptions:

- app deployed as a Next.js server or platform-compatible build
- Supabase used for auth, Postgres, and storage
- Redis-backed rate limiting used in production
- optional third-party services activated by environment variables

## Environment Variable Matrix

The example source of truth is [`.env.local.example`](../.env.local.example).

### Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser/server auth client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for admin routes/webhooks | Server-only privileged DB access |

### Email

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Optional but required for server email | Enables `/api/send-offerte` server email sending |
| `RESEND_FROM_EMAIL` | Recommended | Sender identity for outgoing mail |

If `RESEND_API_KEY` is absent, the app falls back to client-side sharing instead of server mail delivery.

### Rate limiting

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Recommended in production | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended in production | Upstash Redis auth token |

If these are absent, the app falls back to in-memory rate limiting.

### Payments

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_LS_PRO_MONTHLY` | Optional | Lemon Squeezy checkout URL for monthly plan |
| `NEXT_PUBLIC_LS_PRO_YEARLY` | Optional | Lemon Squeezy checkout URL for yearly plan |
| `NEXT_PUBLIC_LS_EARLY_MONTHLY` | Optional | Early access monthly checkout |
| `NEXT_PUBLIC_LS_EARLY_YEARLY` | Optional | Early access yearly checkout |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Required if webhooks enabled | Validates Lemon Squeezy webhook signatures |

### Analytics

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Optional | Enables GA4 page and event tracking |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional | Enables Meta Pixel events |

### Auth UX

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Optional | Shows Google sign-in button when set to `true` |

## External Services

### Supabase

Supabase responsibilities:

- authentication
- session handling
- Postgres database
- row-level security
- logo storage bucket

Operational notes:

- keep SQL migrations authoritative
- avoid out-of-band schema edits without backfilling a migration file
- review Auth settings and security advisors regularly

### Resend

Resend is used for sending generated documents by email. If disabled, the app still works but server-side send is downgraded.

### Upstash Redis

Used by `src/lib/rate-limit.ts` to protect public-facing APIs and reduce abuse.

### Lemon Squeezy

Used for checkout and plan upgrades. Webhooks write plan state back to `profiles.plan`.

### Analytics providers

Optional:

- Vercel Analytics
- Google Analytics 4
- Meta Pixel

## Deployment Checklist

### Before deploy

1. Populate required environment variables.
2. Confirm Supabase migrations are up to date.
3. Run:

```bash
npm test
npm run build
```

4. Confirm auth settings:

- email redirects point to the correct production domain
- leaked password protection is enabled in Supabase Auth
- Google provider is enabled if Google login is intended

### After deploy

1. Smoke-test signup/login.
2. Complete onboarding with a real account.
3. Create a draft offer.
4. Generate a PDF.
5. Test email sending.
6. Test free-plan document limit behavior.
7. If payments are enabled, test checkout and webhook reconciliation.

## SQL Migrations

Migration files live in [`supabase/migrations`](../supabase/migrations).

Operational expectations:

- add a migration for every schema or policy change
- keep numbering monotonic
- never rely only on changes made manually in the Supabase dashboard

Recent operationally important migrations:

- `009_atomic_counter.sql`
- `010_production_hardening.sql`
- `011_waitlist_insert_only.sql` (legacy lead-capture hardening)
- `012_waitlist_policy_constraints.sql` (legacy lead-capture hardening)

## Runbooks

### Login issues

Check:

- Supabase URL and anon key
- redirect URLs in Supabase Auth
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` only if provider is actually configured
- session middleware behavior in `src/middleware.ts`

### Email send failures

Check:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- sender domain verification in Resend
- API logs for `/api/send-offerte`

If Resend is absent, the route intentionally returns a fallback method rather than hard-failing the product.

### Upgrade flow failures

Check:

- checkout URLs in payment env vars
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- webhook endpoint reachability
- profile plan updates in Supabase

### Rate-limit anomalies

Check:

- whether production is unintentionally using in-memory fallback
- Upstash credentials
- API call frequency from frontend retries or loops

### Storage/logo issues

Check:

- existence of the `logos` bucket
- storage policies created by the production hardening migration
- public URL generation and image host allowlists

## Monitoring Recommendations

At minimum, monitor:

- auth conversion from landing to onboarding completion
- email send failures
- webhook failures
- build success/failure
- Supabase advisor warnings
- document creation completion rate

## Operational Risks To Track

- external service configuration drift
- undocumented dashboard-only changes
- inconsistent staging vs production env vars
- delayed webhook processing causing plan mismatch
- missing analytics IDs making acquisition harder to measure
