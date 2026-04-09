# Offertio risk fix pass — 2026-04-09

## Scope
Focused only on the three remaining product risks called out in the 2026-04-08 QA/release review:
1. document-number desync
2. free-limit drift
3. cloud-draft staleness

Reviewed first:
- `research/offertio-product-tech-report-2026-04-08.md`
- `research/offertio-qa-review-report-2026-04-08.md`

## What I fixed

### 1) Free-limit drift: reduced client/server mismatch
Files:
- `src/app/(app)/dokument/neu/page.tsx`
- `src/app/(app)/dashboard/page.tsx`

Changes:
- Removed the blind local `incrementMonthlyDocCount()` after send.
- The create flow now updates local UI state only from the server `/api/dokument/check-limit` POST response.
- If the increment endpoint returns `403`, the UI now explicitly marks the free limit as exhausted.
- Dashboard now reads the current free-plan remaining count from `/api/dokument/check-limit` instead of localStorage math.

Impact:
- The dashboard and send flow now rely on the server as source of truth for free-plan quota.
- This closes the highest-risk support/trust issue where the client could drift after a failed increment or stale localStorage.

### 2) Cloud-draft staleness: existing cloud drafts now update
Files:
- `src/app/(app)/dokument/neu/page.tsx`
- `src/app/api/dokument/save/route.ts`

Changes:
- Removed the early return in `saveDraft()` when `cloudDraftId` already exists.
- Draft saves now pass `existingDocumentId` to `/api/dokument/save`.
- The save route now supports updating an existing owned draft record instead of always inserting a new document.
- Number collision resolution now ignores the current draft itself during updates.
- Local draft state is refreshed with the persisted `cloudDraftId`, updated `_savedAt`, and any resolved server-side `nummer`.
- Save toast now distinguishes first cloud save vs update (`Cloud-Entwurf aktualisiert.`).

Impact:
- Re-saving a cloud draft now updates the cloud record instead of leaving cross-device state stale after the first save.

### 3) Document-number desync: narrowed the mismatch after save
Files:
- `src/app/(app)/dokument/neu/page.tsx`

Changes:
- After `/api/dokument/save`, the client now adopts `saveData.document.nummer` as the final persisted document number.
- That resolved number now flows into:
  - local document history entry
  - success-page session payload
  - success-page URL params
  - offerte → rechnung carryover source number

Impact:
- The app UI now converges on the persisted server number after duplicate-number resolution.
- This removes the most dangerous post-save UI/history inconsistency.

## What remains

### Remaining partial risk: downloaded/shared PDF can still contain the pre-save number
The PDF is generated before `/api/dokument/save` resolves duplicate-number collisions. That means:
- the stored metadata/UI now use the resolved server number,
- but a PDF already downloaded/shared in that send action can still contain the original client number.

I did **not** attempt a deeper sequence change here because it would require either:
- reserving/finalizing a number before PDF generation, or
- regenerating/re-uploading the PDF after the server resolves a collision.

That is fixable, but it is a slightly larger behavioral change than the other two risk fixes.

## Verification

### Targeted tests
Command:
- `npm test -- --run src/__tests__/payment.test.ts src/__tests__/handle-send-validation.test.ts src/__tests__/success-flow.test.tsx`

Result:
- 3/3 files passed
- 85/85 tests passed

### Production build
Command:
- `npm run build`

Result:
- passed
- Next.js production build completed successfully after one route typing fix during this pass

## Recommended next actions
1. **Ship these fixes before launch** — they materially improve quota trust and draft reliability.
2. **Do one focused follow-up on document numbering**:
   - reserve/finalize document number before PDF generation, or
   - regenerate the PDF when the server resolves a collision.
3. **Add one integration test per risk path**:
   - duplicate number returns suffixed `nummer` and success/history reflect it
   - failed counter increment does not drift UI quota
   - second draft save updates the same cloud draft record

## Final status
- free-limit drift: **substantially fixed**
- cloud-draft staleness: **fixed**
- document-number desync: **partially fixed** (UI/persisted state reconciled; PDF numbering edge still remains)
