# Due Diligence Notes

## Purpose

This document is intended as a compact technical briefing for future diligence, fundraising, acquisition review, or handover.

## What Offertio Is

Offertio is a DACH-oriented SaaS for tradespeople and small service businesses. It combines:

- lead generation and conversion landing pages
- authentication and onboarding
- quote and invoice creation
- branded PDF generation
- Swiss QR-bills for Switzerland
- ZUGFeRD-compatible invoice generation for Germany
- template reuse and light operational tooling

## Technology Inventory

Core technologies:

- Next.js 15 / React 19 / TypeScript
- Supabase Auth, Postgres, Storage
- React PDF + pdf-lib
- Upstash Redis
- Resend
- Lemon Squeezy
- Vitest

All first-party application logic lives in this repository. Database schema evolution is versioned in SQL migrations.

## Key Technical Assets

### Code assets

- marketing site
- authenticated product app
- pricing and upgrade logic
- PDF rendering pipeline
- DACH compliance abstraction
- API integrations

### Data assets

- user profiles
- reusable templates
- document usage counters
- historical waitlist leads

### Infrastructure assets

- Supabase project
- storage bucket for logos
- optional external vendors for mail, rate limiting, analytics, and payments

## Architectural Strengths

- single-repo deployment model
- centralized DACH compliance logic
- secure-by-default middleware posture
- migration-backed database history
- clear split between browser, server, and admin Supabase clients
- optional services degrade gracefully instead of crashing the core app

## Third-Party Dependencies and Lock-In

### Supabase

Strong dependency for auth, database, and storage.

Migration path if needed:

- Postgres data is portable
- SQL migrations are versioned
- auth and storage migration would require dedicated effort

### Lemon Squeezy

Used for subscriptions and checkout. Replacing it would mainly affect:

- checkout URLs
- webhook handling
- plan reconciliation logic

### Resend

Transactional email vendor. Replacement scope is limited to the mail route and operational setup.

### Upstash

Production abuse control vendor. Replacement scope is modest because the code already abstracts rate limiting behind `src/lib/rate-limit.ts`.

## Security Posture

Current strengths:

- CSP with per-request nonce
- hardened security headers
- origin validation
- auth-gated protected routes
- payload limits and input validation
- row-level security
- webhook signature verification

Current operational follow-up:

- keep Supabase Auth leaked-password protection enabled
- review Auth provider configuration before exposing new login methods

## Data Ownership and Portability

Data portability is strongest at the database layer because:

- schema changes are tracked in SQL
- tables are conventional and comprehensible
- the most important business entities are not hidden in vendor-only systems

For future diligence, keep these artifacts current:

- database backups/export process
- production schema revision
- list of enabled storage buckets
- current env var matrix

## Documentation Assets Added In This Repository

- [README.md](../README.md)
- [Architecture](ARCHITECTURE.md)
- [Operations](OPERATIONS.md)
- [Environment example](../.env.local.example)

## Recommended Diligence Hygiene Going Forward

To maximize future exit readiness:

1. Keep every production schema change backed by a migration file.
2. Keep `.env.local.example` complete whenever a new vendor is added.
3. Record every new external dependency in `docs/OPERATIONS.md`.
4. Add browser-level E2E tests for signup, onboarding, document creation, and upgrade.
5. Keep legal/compliance assumptions in `src/lib/dach.ts` documented when tax rules change.
6. Avoid one-off manual dashboard changes without writing down why they were needed.

## Buyer Questions This Repo Should Help Answer

The current repository should now help a technical reviewer answer:

- What does the product do?
- What are the critical user flows?
- Which vendors are essential vs optional?
- Where is compliance logic implemented?
- How is access control enforced?
- How is the database evolved over time?
- What must be configured to run the product in production?

## Open Areas To Improve Over Time

Reasonable future diligence upgrades:

- E2E/browser regression suite
- architectural decision records for major product shifts
- fuller localization documentation if FR/IT become real product priorities
- explicit data retention and deletion runbooks
