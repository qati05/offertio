# Offertio

Offertio is a DACH-focused quoting and invoicing SaaS for tradespeople and small service businesses. It helps users create offers and invoices from mobile or desktop, generate branded PDFs, support Swiss QR-bills for Switzerland, and generate ZUGFeRD-compatible e-invoices for Germany.

This repository contains the marketing site, authentication flow, onboarding, protected app, PDF generation, Supabase integration, and SQL migrations that define the production database schema.

## Product Scope

Offertio currently covers:

- Landing page and conversion funnel
- Email-based authentication, onboarding, and account settings
- Offer and invoice creation
- Customer folders with grouped document history
- PDF generation with company branding
- Swiss QR-bill support for `CH`
- ZUGFeRD XML embedding for German invoices
- Template management
- CSV export for bookkeeping handoff
- Free-plan usage limits and paid-plan upgrade hooks
- Account deletion and core compliance pages

## Tech Stack

- `Next.js 15` with App Router
- `React 19`
- `TypeScript`
- `Supabase` for auth, Postgres, storage, and row-level security
- `@react-pdf/renderer` for document PDFs
- `pdf-lib` for post-processing and ZUGFeRD embedding
- `Upstash Redis` for production rate limiting
- `Resend` for transactional email sending
- `Lemon Squeezy` for subscription checkout and webhooks
- `Vitest` + Testing Library for unit and integration tests

## Repository Structure

```text
src/
  app/                  Next.js routes, layouts, and API handlers
    (auth)/             Public auth and legal pages
    (app)/              Protected product area
    api/                Server endpoints
  components/           Landing, app, PDF, and utility components
  lib/                  Domain logic, security, payments, Supabase clients
  __tests__/            Vitest coverage for domain and route-level logic
supabase/
  migrations/           Ordered SQL schema changes
public/                 Static assets, manifest, icons
research/               Supporting product/marketing research assets
```

## Core Architecture

At a high level:

- Public traffic lands on `/`
- Users authenticate at `/login`
- Supabase auth sessions are enforced in `src/middleware.ts`
- Users complete onboarding before accessing the main app
- Protected routes drive document creation, preview, PDF generation, and sending
- API endpoints enforce origin checks, auth checks, payload limits, and rate limits

Detailed documentation:

- [Documentation Map](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Due Diligence](docs/DUE_DILIGENCE.md)
- [Product Logic](docs/product/OFFERTIO_PRODUCT_LOGIC.md)
- [Implementation Spec](docs/product/OFFERTIO_IMPLEMENTATION_SPEC.md)
- [Exit Data Room Index](docs/exit/README.md)

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in the required values:

```bash
cp .env.local.example .env.local
```

Use [`.env.local.example`](.env.local.example) as the source of truth.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` starts the local dev server
- `npm run build` creates a production build
- `npm run start` runs the production server locally
- `npm test` runs the Vitest suite once
- `npm run test:watch` runs tests in watch mode

## Environment Variables

Offertio is designed so some services are optional:

- Without `Resend`, the app falls back to client-side share/download behavior instead of server email sending.
- Without `Lemon Squeezy`, upgrade UI remains visible but checkout is not live.
- Without `Upstash`, development uses an in-memory rate-limit fallback.
- Without `GA4` or `Meta Pixel`, analytics helpers remain no-ops.

See [Operations](docs/OPERATIONS.md) for the full environment matrix.

## Database and Migrations

The database schema lives in Supabase and is versioned under [supabase/migrations](supabase/migrations).

Important tables include:

- `profiles`
- `kundenordner`
- `dokumente`
- `vorlagen`
- `dokument_counter`
- `waitlist` (historical lead-capture table, no longer the primary launch funnel)

Recent migrations harden:

- free-plan document counting
- storage policies for logo uploads
- waitlist policies
- production constraints and helper functions

## Security Notes

Security controls in the current codebase include:

- nonce-based CSP generated in middleware
- hardened response headers in `next.config.ts`
- origin validation for mutation endpoints
- payload size limits
- rate limiting with Upstash or memory fallback
- auth enforcement with Supabase server sessions
- row-level security in Supabase
- HMAC verification for Lemon Squeezy webhooks

## Testing Status

Current baseline:

- `180` tests passing via Vitest
- production build passing via `next build`

The current test suite is strongest around domain logic and protected flows. Browser-level E2E coverage is a logical next step for future hardening.

## Exit-Oriented Notes

For long-term maintainability and future diligence:

- keep SQL migrations authoritative and ordered
- keep `.env.local.example` complete when adding new services
- keep the docs in `docs/` updated when flows or vendors change
- avoid undocumented service dependencies or one-off admin fixes

The dedicated diligence summary lives in [docs/DUE_DILIGENCE.md](docs/DUE_DILIGENCE.md).

For a broader documentation overview including product, GTM, launch, and exit-preparation materials, start at [docs/README.md](docs/README.md).
