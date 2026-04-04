# OFFERTIO_IMPLEMENTATION_SPEC

## Purpose
This document translates `OFFERTIO_PRODUCT_LOGIC.md` into an implementation-oriented view:
- what already exists
- what is partially implemented
- what still needs to be built
- what order gives the highest product and business leverage

---

## 1. Current Product Logic Coverage

### A. Workspace / Overview
**Target logic**
- users land in a calm workspace after onboarding
- overview shows recent documents
- one dominant CTA: Neues Dokument erstellen
- history is secondary

**Status**
- **Implemented**

**Evidence**
- dashboard exists and has a primary CTA
- recent document/history surfaces exist
- dedicated history route `/dokumente` exists

**Gaps**
- overview can still be refined visually / information hierarchy-wise
- customer-folder model is not yet surfaced as a real feature

---

### B. New Document entry
**Target logic**
- explicit choice between Offerte and Rechnung

**Status**
- **Implemented**

**Evidence**
- document type toggle exists in the document flow

**Gaps**
- the explicit choice can be made even more productized from the main CTA flow later if needed

---

### C. One-page document editor
**Target logic**
- one page
- clear sections
- simple and controllable

**Status**
- **Implemented, but still polishable**

**Evidence**
- document flow is on one page
- clear sections exist
- preview/send separated but same main workspace context

**Gaps**
- still some UX/accessibility refinement possible
- labels and semantic grouping could still be improved further over time

---

### D. Preview logic
**Target logic**
- real document preview
- desktop always-on or strongly visible
- mobile preview toggle

**Status**
- **Partially implemented**

**Evidence**
- real PDF-like preview exists
- preview step exists

**Gaps**
- not yet a fully ideal mobile/desktop split model as specified in the product logic
- preview is still more step-based than the final ideal model

---

### E. Customer folder logic
**Target logic**
- customers created implicitly through document work
- customer folders in background
- search finds customer folders only
- newest-first document history per customer

**Status**
- **Not fully implemented**

**What exists**
- document history exists
- customer data is tied to document creation

**What is missing**
- explicit customer-folder domain model / UI
- customer-folder search
- customer-level grouped history
- customer-centric navigation surface

**Priority**
- **High product-value feature**, but not strictly required before initial launch if launch focus remains narrow

---

### F. Reuse behavior for existing customers
**Target logic**
- quiet reuse of stable customer data
- no creepy over-intelligence

**Status**
- **Mostly not implemented as a full product feature**

**What exists**
- some carryover / reuse logic exists in document flows

**Missing**
- explicit customer lookup and quiet prefilling strategy
- “data reused” soft signal

---

### G. Offer -> Invoice conversion
**Target logic**
- one-click conversion
- opens prefilled invoice view
- visible relationship between offer and invoice

**Status**
- **Partially implemented**

**Evidence**
- carryover flow exists
- success page can continue from offer to invoice
- carryover data is stored and reused

**Missing**
- full visible linking model in a customer folder/history context
- stronger “relationship view” between original offer and resulting invoice

---

### H. Onboarding
**Target logic**
- light and fast
- not over-blocking
- enough to enter workspace quickly
- not a bureaucratic setup wall

**Status**
- **Implemented in the intended direction**

**Evidence**
- onboarding was redesigned
- DACH country selection is visible
- setup is more helpful without fully hard-blocking first value

**Missing / future polish**
- continued UX polish
- maybe better transition from onboarding to first document experience

---

### I. Inline validation / missing required data
**Target logic**
- missing required data handled inline in document flow
- explain why required
- focus and highlight missing field

**Status**
- **Partially implemented**

**Evidence**
- required-field checks exist
- some reason-based validation exists (for example DE invoice logic)

**Missing**
- stronger focus/scroll-to-field behavior
- more comprehensive field highlighting UX
- more systematic inline requirement handling across all relevant cases

**Priority**
- **Very high**

---

### J. DACH logic
**Target logic**
- DACH-aware
- country-specific requirements internalized
- complexity mostly hidden unless needed

**Status**
- **Strongly implemented**

**Evidence**
- country configs exist for CH/DE/AT
- tax/payment/document behavior varies by land
- DE ZUGFeRD/E-Rechnung support exists
- QR / SEPA distinctions exist

**Missing**
- mostly product-surface and UX polish, not core logic

---

### K. Delivery logic
**Target logic**
- truthful labels based on actual output mode
- send / download / share should be clearly represented

**Status**
- **Implemented much better now, but still a continuing UX responsibility**

**Evidence**
- CTA labels have been corrected to better reflect behavior
- landing promise softened to match actual system behavior

**Priority**
- keep monitoring, but no longer the main blocker it was

---

### L. Export / bookkeeping retention feature
**Target logic**
- user chooses timeframe
- optional customer filter
- useful export for bookkeeping
- CSV/Excel-compatible export first
- PDF export optional as complement

**Status**
- **Not implemented yet**

**Priority**
- **High retention / churn-reduction feature**
- strong post-launch or near-launch feature candidate

---

## 2. What already feels strong
- DACH-aware rules and compliance direction
- improved login / onboarding flow
- stronger dashboard and history presence
- working document generation and send/download paths
- offer-to-invoice carryover base
- marketing and outreach assets now exist

---

## 3. Biggest logic gaps still left

### Gap 1 — Customer folder model
This is one of the strongest product-stickiness ideas and is not fully realized yet.

### Gap 2 — Export feature
This is one of the strongest bookkeeping / retention features and is still missing.

### Gap 3 — Inline requirement UX
The underlying rules exist, but the user experience can still become more obvious and graceful.

### Gap 4 — Preview model
The current preview works, but it is not yet the ideal long-term desktop/mobile preview model from the product logic.

---

## 4. Recommended implementation order

### Phase 1 — Launch-stability closeout
1. final manual journey check
2. live lemon/upgrade validation
3. final product truth / copy check

### Phase 2 — Customer intelligence without CRM bloat
1. implicit customer-folder model in data + UI
2. customer-folder search
3. grouped customer document view (newest first)
4. visible offer/invoice relationship in that customer context

### Phase 3 — Inline smartness and trust
1. stronger missing-field focus behavior
2. clearer reason-based inline validation
3. quieter customer-data reuse hints

### Phase 4 — Retention features
1. bookkeeping export
2. timeframe filter
3. optional customer filter
4. CSV/Excel export first
5. optional PDF batch export

### Phase 5 — Preview evolution
1. desktop stronger persistent live preview
2. mobile toggle preview refined
3. render/load behavior optimized for performance and clarity

---

## 5. What to build next if the goal is launch
If the goal is immediate launch:
1. final full manual launch check
2. payment/upgrade live verification
3. one more pass on inline validation experience

## 6. What to build next if the goal is product stickiness
If the goal is reducing churn and increasing re-use:
1. customer folders
2. customer search
3. offer-invoice link visibility
4. bookkeeping export

---

## 7. Summary
Offertio already has a strong foundation for:
- DACH-aware document creation
- simple document-first workflow
- professional offer/invoice generation
- onboarding and workspace activation

The next major product gains are no longer basic app survival.
They come from:
- better customer memory without turning into a CRM
- better inline guidance
- better bookkeeping/export value
- stronger long-term retention mechanics
