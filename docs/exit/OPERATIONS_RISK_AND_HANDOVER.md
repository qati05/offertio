# Offertio Operations, Risk, and Handover

## 1. Goal of this document

This document answers the practical question:

> If a founder disappeared tomorrow, what would a new owner or operator need in order to run, maintain, and improve Offertio safely?

## 2. What is already documented

The current repo already has operational support in:

- [Operations](../OPERATIONS.md)
- [Architecture](../ARCHITECTURE.md)
- [Due Diligence](../DUE_DILIGENCE.md)

This document adds an exit/handover lens on top.

## 3. Core operating dependencies

An acquiring operator would need control over:

- source repository
- deployment target / hosting configuration
- Supabase project
- Resend account and sender configuration
- Lemon Squeezy products, webhook config, and billing settings
- Upstash project if production rate limiting is enabled
- analytics accounts, if used
- domain / DNS / email-domain configuration

## 4. Handover package that should exist

### Required

- source code access
- environment variable inventory
- Supabase project ownership transfer or admin access
- payment vendor admin access
- mail vendor admin access
- deployment account access
- product domain / DNS ownership

### Strongly recommended

- founder walkthrough recording
- architecture walkthrough
- current roadmap summary
- open incidents / known bugs list
- active customer/pilot list
- vendor contract / billing owner list

## 5. Operational risk register

### Risk 1 — Hidden platform state

Problem:
Some critical settings may live in vendor dashboards instead of the repository.

Impact:
New operators may be blocked or may misconfigure integrations.

Mitigation:
Export and document all environment variables, webhook URLs, storage buckets, auth settings, and billing configuration.

### Risk 2 — Incomplete commercial transfer context

Problem:
The repository contains GTM intent, but not necessarily the complete state of active leads, pilots, and customer conversations.

Impact:
The software may transfer more easily than the revenue engine.

Mitigation:
Prepare a commercial handover packet covering ICP, pipeline, active conversations, and known objections.

### Risk 3 — No browser-level end-to-end suite

Problem:
Static checks are good, but some cross-route regressions may still escape.

Impact:
Buyer confidence and post-handover safety are somewhat lower than ideal.

Mitigation:
Add at least one smoke E2E flow covering login → onboarding → first document → success → history.

### Risk 4 — Knowledge concentration

Problem:
Some product reasoning may still be founder-held, even if a lot is already written down.

Impact:
Buyer may need founder support longer than planned.

Mitigation:
Create a short “why the product is shaped this way” handover memo and recorded walkthrough.

## 6. Recommended handover sequence

1. transfer repo and deployment access
2. transfer Supabase ownership/access
3. transfer billing/email vendors
4. validate environment variables in target owner’s control
5. run smoke checks with new owner observing
6. review product logic and roadmap docs
7. review active GTM materials and launch/pilot plans
8. hand over customer / lead context

## 7. Practical runbook priorities

The minimum runbook set for exit-grade handover should cover:

- user signup/login issues
- onboarding failures
- document save/PDF generation failures
- email sending fallback behavior
- payment webhook verification
- document counter / plan enforcement issues
- Supabase auth/storage/database access checks

## 8. Current state assessment

### Good

- software behavior is increasingly documented
- product logic is explicitly written down
- technical structure is understandable
- verification baseline is reasonably strong

### Still needed for true exit readiness

- full external system inventory
- access and ownership transfer checklist
- pipeline/customer handover materials
- legal/commercial data room completeness

## 9. Recommended next artifact set

If preparing for a real transaction, produce:

- secrets and environment inventory
- vendor ownership matrix
- production incident log
- active customer / pilot ledger
- legal and commercial diligence folder
- founder handover memo
