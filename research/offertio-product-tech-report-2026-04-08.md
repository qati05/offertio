# Offertio product tech report — 2026-04-08

## Scope
Product/code lane review focused on:
1. DE contract inconsistency
2. Bug fixes only
3. Architecture/runtime risk review
4. Concise technical status

## Executive summary
I stabilized the current DE invoice tax-ID contract around the legally consistent rule already used by runtime validation: **for DE invoices, `Steuernummer` OR `USt-IdNr.` is sufficient**.

The concrete product bug was in the profile settings save flow: it still blocked DE users unless `Steuernummer` was filled, even when `USt-IdNr.` was present. That runtime path now matches the validation and country config.

## What I changed
### 1) Fixed DE profile save validation mismatch
File: `src/app/(app)/einstellungen/profil/page.tsx`

- Replaced the old single-field check with group-aware tax-ID validation.
- Result: DE users can save their profile with either `Steuernummer` or `USt-IdNr.` filled.

### 2) Added reusable group-aware helper
File: `src/lib/profile.ts`

- Added `hasRequiredTaxId(...)` to evaluate country tax-ID requirements consistently.
- Keeps DE OR-group logic in one place instead of duplicating ad-hoc checks.

### 3) Updated tests to match the chosen DE contract
Files:
- `src/__tests__/dach.test.ts`
- `src/__tests__/dach-extended.test.ts`
- `src/__tests__/profile-requirements.test.ts`
- `src/__tests__/profile.test.ts`
- `src/__tests__/handle-send-validation.test.ts`

- Replaced assertions that expected `Steuernummer` alone to be mandatory.
- Tests now assert the intended rule: **DE requires one German tax ID, not specifically Steuernummer**.

## Build/test status
### Test status
- Command: `npm test`
- Result: **pass**
- Summary: **28/28 test files passed, 451/451 tests passed**

### Build status
- Command: `npm run build`
- Result: **pass**
- Next.js production build completed successfully.

## Bugs fixed
1. **DE profile settings save bug**
   - Before: save was blocked if `Steuernummer` was empty, even with valid `USt-IdNr.`
   - After: save works when either DE tax ID is present.

2. **DE contract/test mismatch**
   - Before: validation/runtime and test/config expectations disagreed.
   - After: runtime and tests align on one DE invoice contract.

## Remaining risks / observations
### 1) UX risk: DE OR-rule is still not very explicit in forms
The logic is correct now, but the UI may still be mildly ambiguous because neither DE field is visually marked as individually required. That is acceptable technically, but users may not immediately understand that **one of the two** is needed for invoices.

Recommendation: keep as-is for now if feature freeze is strict; otherwise add helper copy later (report-only recommendation, not implemented).

### 2) Validation/legal rule complexity remains distributed
Country rules currently live across:
- `src/lib/dach.ts`
- `src/lib/profile.ts`
- `src/lib/validation.ts`
- UI pages/tests

This is manageable today, but DACH compliance changes can drift again if product checks and final document validation evolve separately.

Recommendation: later centralize "document requirement contract" into one source of truth consumed by UI + save guards + tests.

### 3) Existing unrelated repo changes were already present
There were unrelated modified files in the repo before this work (for example dashboard/landing/analytics/validation and `.omx` state files). I did not normalize or expand that surface area beyond the DE contract fix and aligned tests.

## Recommended next actions
1. **Ship this DE consistency fix first** — it removes a real runtime blocker and stabilizes tests/build.
2. **Do one small UX follow-up later** — add explicit helper text for DE: "Steuernummer oder USt-IdNr. erforderlich".
3. **Create a single compliance contract module** if more country/legal work is planned, to reduce future drift.
4. **Keep `validation.ts` under review** — there are already signs of evolving legal/product contract decisions there, so future edits should be treated carefully and test-backed.

## Final status snapshot
- Chosen DE contract: **Steuernummer OR USt-IdNr. for DE invoices**
- Product runtime: **aligned**
- Tests: **green**
- Production build: **green**
- Remaining blockers found in this lane: **none critical after fix**
