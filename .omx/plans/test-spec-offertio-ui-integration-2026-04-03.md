# Test Spec — Offertio UI Integration

_Date: 2026-04-03_

## Purpose
Verify that the Stitch-based redesign improves product quality without regressing auth, document creation, PDF/send behavior, or upgrade flows.

## Scope
Covers:
- landing page
- app shell / dashboard
- document creator
- onboarding
- upgrade screen
- shared tokens/primitives

Does not require backend or payment-logic rewrites.

## Test Categories

### 1. Static verification
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

### 2. Route rendering
All of these routes render without blank states or hydration regressions:
- `/`
- `/login`
- `/onboarding`
- `/dashboard`
- `/dokument/neu`

### 3. Visual coherence checks
For each route above verify:
- shared typography and spacing language
- same CTA hierarchy and button styling
- same surface layering logic
- no “landing is premium, app is bland” mismatch
- no “app looks like admin template” regressions

### 4. Workflow smoke tests
#### Auth + onboarding
- sign up or log in
- complete onboarding
- land on dashboard successfully

#### Dashboard
- primary CTA visible and meaningful
- overview cards render with live/fallback data
- recent activity renders cleanly

#### Document creator
- open document creator
- edit customer fields
- add/edit line items
- preview remains usable
- generate/send path still works
- upgrade gating still works for free-plan thresholds

#### Upgrade
- upgrade screen opens cleanly
- price toggle works
- checkout CTA remains connected to Lemon configuration

### 5. Responsive checks
At minimum verify:
- mobile width ~390px
- tablet width ~768px
- desktop width ~1280px

### 6. Visual reference checks against Stitch
Compare implemented screens to:
- `stitch/landing_page/screen.png`
- `stitch/dashboard/screen.png`
- `stitch/document_creator/screen.png`
- `stitch/onboarding_flow/screen.png`
- `stitch/upgrade_to_pro/screen.png`

Criteria:
- similar hierarchy
- similar trust level
- similar calm/premium tone
- adapted, not blindly cloned

## Pass Criteria

### Must pass
- build/tests/typecheck all pass
- no broken auth/document/upgrade flows
- no blank landing/app routes
- landing and workspace visibly share one design system
- dashboard + document creator clearly improve in perceived quality

### Nice to have
- motion polish
- more editorial desktop composition
- further microcopy refinements

## Failure Triggers
- losing existing document-generation behavior
- broken onboarding or auth routes
- upgrade CTA stops working
- token drift between landing and workspace
- visual system feels inconsistent after redesign

## Final Manual Signoff Checklist
- [ ] Landing feels premium and believable
- [ ] Dashboard feels like a real product workspace
- [ ] Document creator feels like the product centerpiece
- [ ] Onboarding is calm and clear
- [ ] Upgrade screen matches pricing language
- [ ] Product feels unified end-to-end
