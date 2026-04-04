# Offertio Technical Diligence Addendum

## 1. Purpose

This document supplements:

- [Architecture](../ARCHITECTURE.md)
- [Operations](../OPERATIONS.md)
- [Due Diligence](../DUE_DILIGENCE.md)

It is written in a buyer-facing style: what the codebase contains, how transferable it is, what dependencies matter, and where remaining technical risks still sit.

## 2. Current architecture summary

Offertio is implemented as a single Next.js application with:

- public landing/auth routes
- protected SaaS routes
- App Router API endpoints
- Supabase-backed auth, database, and storage
- document PDF generation inside the app stack

This is an attractive packaging model for diligence because the core application logic is concentrated in one repository.

## 3. Technical strengths

### 3.1 Focused architecture

The codebase is opinionated but not sprawling:

- UI routes in `src/app`
- shared components in `src/components`
- domain/integration logic in `src/lib`
- schema history in `supabase/migrations`
- tests in `src/__tests__`

### 3.2 Country-specific logic is centralized

Country rules are not scattered randomly through the codebase. The DACH adaptation is primarily concentrated in dedicated helpers, which reduces maintenance cost.

### 3.3 Schema evolution exists as SQL history

The database is not “magic state” only living in a cloud console. Migrations are versioned in `supabase/migrations`, which materially improves portability and diligence quality.

### 3.4 Product logic and implementation logic are documented

The repository includes explicit product and implementation thinking, which is uncommon for an early-stage code asset and helpful for transfer.

## 4. Dependencies and portability

### 4.1 Supabase

Supabase is the single most important platform dependency because it backs:

- authentication
- Postgres
- storage

**Assessment:** meaningful dependency, but not a black box.

Why portability is still decent:

- SQL migrations exist
- Postgres data model is inspectable
- business logic is mainly application-side

Migration cost would still be non-trivial because auth + storage migration would require execution effort.

### 4.2 Resend

Resend is used for transactional email sending.

**Assessment:** replaceable vendor with relatively low switching cost.

### 4.3 Lemon Squeezy

Lemon Squeezy is used for checkout/subscription flows and webhook-driven plan updates.

**Assessment:** medium switching cost; mostly isolated to pricing and webhook integration points.

### 4.4 Upstash

Upstash is used for production rate limiting with fallback behavior when unavailable.

**Assessment:** low-to-medium switching cost because the app degrades gracefully.

## 5. Current implementation depth

The application includes more than static scaffolding. It already contains:

- protected auth/session enforcement
- onboarding
- customer-linked document workflows
- offer and invoice creation
- PDF rendering
- country-aware invoice requirements
- QR-bill and ZUGFeRD handling
- customer folders
- bookkeeping-style CSV export

This is meaningful because a buyer is not just acquiring presentation code; they are acquiring domain and workflow logic.

## 6. Verification baseline as of April 4, 2026

Workspace verification completed:

- `181` passing tests
- TypeScript no-emit clean
- production build successful

Recent implementation hardening also improved:

- inline document-flow requirements
- customer reuse
- offer-to-invoice linkage visibility
- preview behavior

## 7. Codebase transferability

### Positive signs

- explicit docs exist
- tests exist
- environment variables are documented
- infra assumptions are understandable
- migrations are versioned

### Transfer friction

- some business context still lives in markdown rather than formal product systems
- external service credentials and production console state are not captured inside repo
- no browser-level E2E suite yet
- local snapshot is not a Git checkout in this directory

## 8. Main technical risks

### 8.1 Vendor-state gap

A buyer will still need the actual production settings, secrets, webhooks, and service-console configuration outside the repository.

### 8.2 E2E coverage gap

The test suite is good for unit/integration confidence, but browser-level smoke coverage is still a missing quality layer.

### 8.3 Operations documentation needs continued discipline

The repo has a good base, but exit-grade readiness depends on keeping docs synchronized with real production behavior.

## 9. Technical exit-readiness assessment

### Software asset quality

**Strong for stage**

### Diligence readiness

**Good, but not yet complete**

### Transfer readiness

**Reasonable if paired with credentials, cloud-console exports, and founder handover**

## 10. Recommended next steps

1. add browser-level smoke tests
2. capture real production deployment settings in a controlled handover packet
3. document webhook/payment runbooks in more detail
4. create a buyer-facing environment and secrets inventory
5. ensure the canonical repo is preserved with clean Git history
