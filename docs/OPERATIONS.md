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
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. Project region must be `eu-central-2` (Zurich) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser/server auth client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for admin routes/webhooks | Server-only privileged DB access |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Canonical origin, `https://getoffertio.ch`. `www` redirects to the apex |

### Email

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Optional but required for server email | API key created in the Resend **EU** region (`eu-west-1`, Ireland). Resend has no Zurich region |
| `RESEND_FROM_EMAIL` | Recommended | Sender on the verified domain, e.g. `offerte@getoffertio.ch` |
| `RESEND_API_BASE_URL` | Optional | Only if Resend assigns this key a dedicated EU API host. Otherwise leave unset; `https://api.resend.com` routes by the key's region |

If `RESEND_API_KEY` is absent, the app falls back to client-side sharing instead of server mail delivery.

### Rate limiting

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Recommended in production | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended in production | Upstash Redis auth token |

If these are absent, the app falls back to in-memory rate limiting.

### Payments (Stripe)

Lemon Squeezy is retired. `POST /api/webhooks/lemon-squeezy` returns `410` and does not change plans. Disable that webhook in the Lemon dashboard.

The paid product is a one-time **Gründerplatz / Lifetime** at **CHF 249** (`mode=payment`). A verified `checkout.session.completed` (or `checkout.session.async_payment_succeeded`) sets `profiles.plan` to `lifetime`, which removes the free-plan document limit. Founder seats default to 20 (`STRIPE_FOUNDER_SEAT_LIMIT`). `0` disables the cap. Checkout refuses when the cap is reached.

Without `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` the upgrade screen stays visible and the checkout button stays disabled.

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Optional until checkout is live | Secret API key. Server only |
| `STRIPE_WEBHOOK_SECRET` | Required for plan updates | Verifies `Stripe-Signature` on `/api/webhooks/stripe` |
| `STRIPE_LIFETIME_PRICE_ID` | Optional | Dashboard Price id for the CHF 249 one-time price. Empty = inline `price_data` |
| `STRIPE_FOUNDER_SEAT_LIMIT` | Optional | Cap of Gründerplätze. Default `20`. `0` = no cap |

Apply migration `032_lifetime_founder_seats.sql` before enabling the webhook. It adds the lifetime columns, the seat reservation functions, and a trigger that stops a signed-in user from setting `plan` themselves.

### Data residency (nDSG)

Production domain: **getoffertio.ch** (canonical) and **www.getoffertio.ch** (301 to the apex, see `vercel.json`).

| Piece | Region | Notes |
| --- | --- | --- |
| Vercel Functions | `fra1` (Frankfurt, EU) | Set in `vercel.json` `regions` and `export const preferredRegion = "fra1"` on the root layout and payment routes. Vercel has no Zurich region; Frankfurt is the closest |
| Supabase Postgres, Auth, Storage | `eu-central-2` (Zurich) | Create the project in this region. Do not restore it into a US project |
| Resend | EU `eu-west-1` (Ireland) | Create the API key in the EU region and verify `getoffertio.ch` there |
| Stripe | Card + TWINT, currency CHF | Payment data is processed by Stripe. Enable TWINT under Payment methods. If TWINT is off, Checkout falls back to card |
| Upstash | EU if available | Rate-limit tokens only |

`www` must be added as a domain on the Vercel project. The redirect in `vercel.json` sends it to `https://getoffertio.ch`.

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

### Upstash Redis

Used by `src/lib/rate-limit.ts` to protect public-facing APIs and reduce abuse.

### Stripe

Used for the one-time Gründerplatz checkout and for writing `profiles.plan = 'lifetime'` from a signature-verified webhook. Card and TWINT are requested for CHF. If TWINT is not enabled on the Stripe account, checkout is retried with card only.

The app keeps working when Stripe keys are absent: the upgrade UI is visible and checkout is disabled.

Stripe dashboard steps before going live:

1. Use a Stripe account that can charge **CHF**. Enable **Cards** and **TWINT** under Settings → Payment methods. TWINT only works for CHF one-time payments.
2. Optional: create a Product named `Lifetime / Gründerplatz` with a one-time Price of **CHF 249.00**. Copy the Price id into `STRIPE_LIFETIME_PRICE_ID`. If the variable is empty, Checkout sends the amount inline.
3. Developers → API keys: put the secret key in `STRIPE_SECRET_KEY`. No publishable key is required.
4. Developers → Webhooks → Add endpoint `https://getoffertio.ch/api/webhooks/stripe`.
5. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired`.
6. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
7. Set `STRIPE_FOUNDER_SEAT_LIMIT=20` (or another cap). Apply the Supabase migration first.
8. Send a test event from the webhook page, or pay with a test card (`4242…`) and confirm `profiles.plan` becomes `lifetime`.

### Supabase region

The production Supabase project must be **eu-central-2 (Zurich)** so profile, customer, and document data stays in Switzerland.

### Resend

Resend sends transactional mail when `RESEND_API_KEY` is set. Use an API key in the **EU region** (`eu-west-1`) and the verified sending domain **getoffertio.ch**. If the key is absent, the app falls back to client-side sharing.

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

- email redirects point to `https://getoffertio.ch` (and `https://www.getoffertio.ch` if both hosts are allowed)
- leaked password protection is enabled in Supabase Auth
- Google provider is enabled if Google login is intended
- Stripe webhook endpoint is `https://getoffertio.ch/api/webhooks/stripe`
- Vercel project domains are `getoffertio.ch` and `www.getoffertio.ch`
- Supabase project region is `eu-central-2`

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
- `032_lifetime_founder_seats.sql`

## Runbooks

### Login issues

Check:

- Supabase URL and anon key
- redirect URLs in Supabase Auth
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` only if provider is actually configured
- session middleware behavior in `src/middleware.ts`

### Upgrade flow failures

Check:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and optional `STRIPE_LIFETIME_PRICE_ID`
- `STRIPE_FOUNDER_SEAT_LIMIT` and `founder_seats` / `profiles.plan = 'lifetime'`
- migration `032_lifetime_founder_seats.sql` applied
- webhook endpoint `https://getoffertio.ch/api/webhooks/stripe` and the signing secret
- Stripe events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`
- TWINT enabled for CHF; card-only fallback is expected if it is not
- profile plan updates in Supabase (`plan = lifetime`)

### Email send failures

Check:

- `RESEND_API_KEY` was created in the EU region
- `RESEND_FROM_EMAIL` uses `@getoffertio.ch`
- sender domain `getoffertio.ch` is verified in that same Resend region
- API logs for `/api/send-offerte`

If Resend is absent, the route intentionally returns a fallback method rather than hard-failing the product.

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
