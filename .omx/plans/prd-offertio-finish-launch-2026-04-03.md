# PRD - Offertio Finish-to-Launch Plan

## Goal
Take Offertio from “mostly working and partially polished” to a coherent, launch-ready SaaS product that can handle real user traffic, convert first users, and support early sales/marketing activity without fragile edges.

## Product outcome
At launch, a new visitor should be able to:
1. understand what Offertio does quickly
2. trust the product enough to try it
3. create an account with low friction
4. complete onboarding
5. create and send the first real document
6. understand the free-to-Pro upgrade path

## User
Primary user:
- small Swiss service and trade businesses
- low software tolerance
- wants a clean, mobile-first, professional workflow

## Current state
### Strong already
- core app exists
- auth works better now
- onboarding exists
- document creation works
- Supabase document sync path has been repaired
- tests, typecheck, and build are green

### Not fully launch-ready yet
- landing/design still not fully convincing
- auth UX still needs one final pass decision (confirm email / fallback behavior)
- no true browser-level E2E test suite
- Lemon Squeezy live validation still incomplete
- product demo / video assets still incomplete
- some docs still mention waitlist while the product direction has moved away from it

## Must-have before launch

### M1. Product-facing UX is coherent
- landing, login, onboarding, dashboard, document flow all feel like one product
- no contradictory waitlist / direct-use messaging
- auth UX is clear and low-friction

### M2. First-run flow is trustworthy
- signup/login path is stable
- callback / confirmation path is stable
- onboarding completion leads correctly into app

### M3. Core document workflow is reliable
- create offer
- create invoice
- generate PDF
- send/share
- success feedback
- cloud persistence

### M4. Payment/upgrade path is real
- Lemon Squeezy checkout URLs are active
- webhook updates plan state correctly
- pricing UI matches reality

### M5. Operational readiness exists
- launch checklist
- smoke checks
- docs reflect current truth
- recovery path for common incidents

## Should-have before launch

### S1. Better visual premium layer
- final landing refinement after design comparison
- product demo visuals feel premium and specific

### S2. Real demo asset
- `demo.mp4` or equivalent product walkthrough asset
- reusable for landing / social / marketing

### S3. End-to-end validation
- browser-level smoke test for:
  - signup/login
  - onboarding
  - document creation
  - success flow

## Can-wait items
- advanced multi-language rollout polish
- deeper analytics instrumentation beyond core funnel
- more advanced growth automation
- additional auth providers beyond what launch truly needs

## Decision Drivers
1. Reduce friction to first real document
2. Increase trust at first glance
3. Keep launch scope tight enough to finish
4. Avoid “almost ready forever” behavior

## Implementation workstreams

### Workstream A - Landing / Conversion
Objective:
- make the landing clearly stronger and less generic

Steps:
1. Review new visual direction(s)
2. Pick final direction
3. Do one last high-signal landing/copy pass
4. Align landing claims with current product truth
5. Remove waitlist-first language everywhere product-facing

### Workstream B - Auth / Entry Flow
Objective:
- make auth feel stable and boring in the best way

Steps:
1. Keep password-first as default
2. Keep Magic Link as fallback only
3. Decide whether email confirmation remains on at launch
4. Verify callback flow for real confirmation links
5. Tighten auth feedback messages

### Workstream C - Product Workflow
Objective:
- validate first-document path end-to-end

Steps:
1. Run real signup/login
2. Run onboarding
3. Create first offer
4. Create/send invoice
5. Confirm persistence and success behavior

### Workstream D - Payments / Pro
Objective:
- make Pro upgrade path real, not theoretical

Steps:
1. Confirm Lemon Squeezy products/URLs
2. Verify webhook secret and plan updates
3. Test upgrade from UI to webhook reconciliation
4. Confirm pricing copy matches actual plans

### Workstream E - Docs / Ops / Launch
Objective:
- reduce launch risk and future confusion

Steps:
1. Remove stale waitlist assumptions in docs where product direction changed
2. Refresh operations doc for current auth/payment reality
3. Create launch checklist
4. Create issue-level smoke checklist

## Acceptance Criteria
- Password-first auth works for a new user
- Existing-user duplicate signup gives correct guidance
- Callback handles confirmation links correctly
- Onboarding leads into dashboard without dead ends
- Offer/invoice creation works for a real test account
- PDF generation and send/share path work
- Lemon Squeezy upgrade path is either fully verified or explicitly removed from launch promises
- Landing copy and CTA no longer feel generic/sloppy
- Waitlist is not a primary user path anymore
- Launch docs and operations docs reflect current reality

## Risks
### R1. Landing still underperforms
Mitigation:
- choose one final direction and stop endlessly iterating

### R2. Auth mail/delivery still confuses users
Mitigation:
- password-first path and reduced dependence on magic-link style flows

### R3. Payments look live but are not truly validated
Mitigation:
- force a real upgrade/webhook check before calling launch complete

### R4. No browser-level smoke validation
Mitigation:
- at least create and run a manual launch checklist if Playwright is not added immediately

## ADR
### Decision
Treat Offertio as a launch-hardening project now, not a broad product-expansion project.

### Drivers
- Core app is close enough
- biggest remaining value is reliability + clarity + trust
- launch scope must stay finishable

### Alternatives considered
1. Keep polishing visuals before validating core flows  
   Rejected: too risky to optimize the wrapper before validating the product path
2. Keep adding product features before launch  
   Rejected: dilutes focus and delays launch

### Consequences
- forces prioritization
- may defer some “nice” polish
- increases probability of a real usable launch

### Follow-ups
- after launch-hardening, move into growth and distribution systems
