# OFFERTIO_PRODUCT_LOGIC

## Purpose
This document defines the intended product logic behind Offertio so product, design, engineering, and marketing decisions stay aligned.

Offertio is not a CRM monster.
Offertio is the fastest and most professional way for small DACH businesses to create offers and invoices directly after a customer appointment.

---

## 1. Product Core

### What Offertio is
Offertio is:
- a simple offer and invoice creator
- mobile-first
- DACH-aware
- fast to understand
- fast to use
- professional in output
- calmer and lighter than old CRM / ERP dinosaurs

### What Offertio is not
Offertio is not:
- a full CRM
- a money-tracking app
- a bookkeeping suite
- a pipeline manager
- a backoffice monster
- software that forces heavy setup before value

### Main promise
A user should be able to:
1. finish onboarding quickly
2. enter the workspace immediately
3. create a professional offer or invoice fast
4. send or export it with low friction
5. keep customer-linked document history over time

---

## 2. Workspace Logic

### First screen after onboarding
After onboarding, users land in the **Workspace / Overview**.

### Workspace feeling
The workspace should feel:
- calm
- premium
- simple
- like a financial / payment-style overview
- but without becoming a money-tracking product

### Primary workspace content
The overview should emphasize:
- last created documents
- simple orientation
- one dominant primary CTA

### Primary CTA
Primary CTA:
- **Neues Dokument erstellen**

### Secondary workspace areas
Secondary navigation should include:
- History / Dokumente
- Profil
- Vorlagen (if needed)
- customer-related history as a secondary area, not the main home screen

### Empty state behavior
If no documents exist yet, the empty state should:
- stay simple
- offer a short explanation of what Offertio does
- show a clear start action
- include a small 3-step orientation

Recommended 3-step logic:
- **Erfassen**
- **Prüfen**
- **Abschicken**

This 3-step logic should appear:
- in the overview / empty state
- and in the document flow itself

---

## 3. New Document Logic

### Document creation entry
When the user clicks **Neues Dokument erstellen**, they must explicitly choose:
- **Offerte**
- **Rechnung**

Offertio should not decide this implicitly.

### Document editor structure
Document creation should remain on **one page**, not be split into a complex multi-step wizard.

Reason:
- users should see where things belong
- users should understand the complete structure
- it feels simpler and more controllable

### One-page flow with sections
The one-page editor should still be visually structured into clear sections, for example:
- Kunde
- Positionen
- Details
- Total
- Versand / Ausgabe

---

## 4. Preview Logic

### General rule
Users should see a **real document preview**, not just a rough placeholder.

The preview should feel close to the final PDF / final document.

### Desktop behavior
On desktop:
- preview should remain visible as a live preview
- user should immediately see where entered data appears

### Mobile behavior
On mobile:
- default mode should be **Bearbeiten**
- preview should be **umschaltbar**
- preview should only render when the user switches to it
- preview must be easy to reach, not hidden deeply

Reason:
- mobile screen space is limited
- edit mode should remain fast and focused
- preview still matters for trust and control

---

## 5. Customer Logic

### Customer creation model
Offertio should be **document-first**, not customer-admin-first.

That means:
- users should not have to manually create a customer before creating a document
- when a new customer is used in an offer or invoice, Offertio should automatically create the customer context / folder in the background

### Customer folders
Each customer should have a customer folder / customer record in the background.

That folder should hold:
- customer identity
- linked offers
- linked invoices

### Search behavior
Search should search for:
- **customer folders only**

Search should not mix:
- random documents
- unrelated results
- CRM-style noisy entity lists

### Customer folder display
Inside the customer folder, documents should be:
- ordered clearly
- newest first
- more like a clean document history than a CRM activity feed

The default sort should be:
- newest first

### Reuse behavior
When an existing customer is recognized:
- some customer data may be gently prefilled
- a small quiet info can indicate reused customer data
- Offertio should not feel creepy or over-smart
- it should not say things that make the user feel watched

### What may be reused automatically
Safe to reuse quietly:
- customer identity fields
- address
- email
- stable customer-related data

### What should NOT be auto-applied silently
Do not auto-apply without explicit user control:
- positions
- prices
- discounts
- invoice content decisions

Offertio should feel helpful, not invasive.

---

## 6. Offer -> Invoice Conversion Logic

### Core principle
Offertio should support a strong:
- **one-click Offerte -> Rechnung conversion**

### Behavior
When converting an offer to an invoice:
- Offertio should not create and send a final invoice blindly
- instead, it should open a **fully prefilled invoice view**
- the user can review it quickly
- then confirm / send / export

### Why
This gives:
- speed
- continuity
- control
- trust

### Relationship visibility
Offer and invoice should be visibly linked.

The user should be able to understand:
- this invoice came from this offer

This link should be visible in:
- customer folder / history
- document context where useful

### Original offer state
The original offer should simply remain as it is.
No extra special status is required if the link between offer and invoice is already clear.

---

## 7. Onboarding Logic

### Onboarding philosophy
Onboarding should be:
- light
- fast
- not over-blocking
- enough to get into the workspace quickly

### Important rule
Onboarding should **not fully block the user** just to force all accounting/profile information upfront.

Reason:
- free users should reach value quickly
- too much setup creates drop-off
- Offertio should not feel like bureaucratic software before first use

### Country / DACH role
Country selection matters because Offertio must adapt to:
- tax logic
- required fields
- payment standards
- document conventions
- DACH-specific requirements

### Stable user/company data
Users may provide stable reusable data such as:
- company name
- address
- IBAN
- tax IDs / UID / Steuernummer / similar land-specific fields
- payment defaults

These are helpful defaults, not reasons to create unnecessary onboarding friction.

---

## 8. Inline Requirement / Validation Logic

### Key rule
If required data is missing, Offertio should resolve that **inside the document flow**, not by sending the user away to profile settings.

### Example
Not:
- “Go to profile first”

Instead:
- highlight what is missing inline
- explain why it is required
- let the user continue immediately after fixing it

### Validation behavior
If a required field is missing:
- the relevant field should be focused or brought into view
- it should be visually highlighted (for example red)
- the reason should be shown

### Error copy style
Offertio should not only say:
- “Pflichtfeld fehlt”

It should also say why, for example:
- “Für Rechnungen in DE ist Leistungsdatum erforderlich”

This is important because many users will create documents on the go and benefit from clear reason-based guidance.

### Rule for compliance
Users should not be able to send clearly invalid / incomplete invoices when country-specific required data is missing.

---

## 9. DACH Logic

### Overall rule
Offertio is for the DACH region, but country-specific complexity should remain mostly internal.

The user should experience:
- smart adaptation
- low cognitive load
- no compliance overload on the surface

### Germany
Germany should support:
- country-specific invoice requirements
- E-Rechnung / ZUGFeRD where applicable
- required fields relevant to German invoice standards

### Switzerland
Switzerland should support:
- Swiss-specific payment / invoice logic
- QR-related behavior where applicable

### Austria
Austria should support:
- Austrian-specific required fields and invoice behavior
- but Offertio must not promise standards it does not actually support yet

### Product principle
Country-specific logic should appear only when relevant.
It should not make the product feel bureaucratic.

---

## 10. Delivery Logic

### Final step behavior
At the final step, the user should be able to:
- send via email where supported/available
- or download PDF
- or use the appropriate available output path

### Truthfulness rule
UI labels and CTAs must always describe the **actual output mode** truthfully.
No UI wording should overpromise “send” if the actual result is download/share/fallback.

---

## 11. Export / Retention Logic

### Retention goal
A churn-reduction feature should help users and their bookkeeping / accounting process.

### Export feature
Offertio should include an export feature where the user can choose:
- time period
- optional customer filter
- then export all relevant documents

### Best first formats
The best value-first export is:
- **CSV / Excel-compatible export**
- plus optional PDF package / archival export

### Why not PDF only
PDF alone is useful for reading/archiving, but not enough for bookkeeping workflows.
Structured export gives more real-world value.

### ZUGFeRD distinction
ZUGFeRD / E-Rechnung support for Germany is part of invoice logic.
It is not the same thing as broader bookkeeping export.

---

## 12. Simplicity Rules

Offertio should always prefer:
- fewer decisions
- clear defaults
- visible structure
- honest automation
- user control on critical document content

Offertio should avoid:
- CRM-style complexity
- hidden magic
- creepy “we know everything” suggestions
- backoffice overload
- workflow interruptions that send users into settings when they are trying to finish a document

---

## 13. Summary Product Logic

The intended product logic is:
- lightweight onboarding
- workspace-first activation
- explicit document-type choice
- one-page editor with clear sections
- real preview
- desktop always-on preview
- mobile toggle preview
- automatic customer folders in the background
- customer search only
- newest-first customer history
- one-click offer-to-invoice conversion with review
- inline requirement handling with reasoned guidance
- DACH-aware but simple on the surface
- truthful delivery logic
- bookkeeping-friendly export later / alongside the core workflow

This is the logic that should keep Offertio:
- simple
- fast
- professional
- sticky
- and clearly different from old CRM dinosaurs.
