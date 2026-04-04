# Offertio Go-to-Market Decision Memo

_Prepared: April 4, 2026_

## Decision

**GO for a soft launch / pilot launch.**

**Not recommended yet for a broad, high-spend scale launch.**

## Executive Summary

Offertio appears strong enough to enter the market in a focused way because it solves a real and recurring workflow pain:

- small businesses delay offers and invoices until the evening
- existing software often feels too heavy, fragmented, or backoffice-first
- DACH-specific compliance requirements increase friction
- mobile-first execution directly after the appointment remains underserved in product experience, even when larger competitors already cover parts of the workflow

Offertio’s strongest position is not “generic invoicing software.” Its strongest position is:

> the fastest and most professional way for small DACH businesses to create offers and invoices directly after the customer appointment, without CRM/ERP ballast.

## Market View

### Why the timing is good

Two structural forces support the product thesis:

1. **Germany**
   - E-invoicing requirements have materially increased urgency and compliance sensitivity for B2B invoicing.
   - A plain PDF is not enough to fully answer the underlying requirement where a structured e-invoice is required.

2. **Switzerland**
   - QR-bill usage is standard and still operationally relevant for software providers.
   - This creates a real advantage for products that treat Swiss payment logic as native product behavior.

### Competitive reality

The market is not empty. Established players such as sevdesk, Lexware Office, and bexio already cover many core capabilities:

- offers and invoices
- mobile access
- customer administration
- accounting adjacency
- established market trust

That means Offertio should **not** try to win by claiming broad parity.

It should win by being:

- faster
- calmer
- more mobile-first in feel
- more document-moment-focused
- more opinionated for DACH field-service and trade workflows

## Pain Points Offertio Appears to Cover Well

From market and user-sentiment review, the most relevant pain points include:

- still relying on Word/Excel or fragmented manual workflows
- losing time after appointments because documents are written too late
- difficulty keeping customer-linked document history organized
- frustration with software that feels too complex for simple quoting/invoicing
- need for country-aware requirements without compliance overload

Offertio directly addresses these areas through:

- one-page document flow
- customer folders and document grouping
- offer-to-invoice continuation
- DACH-aware requirements
- Swiss QR-bill support
- German ZUGFeRD / e-invoice support

## Current Product Readiness Assessment

### Strong enough now

- onboarding and workspace exist
- core offer/invoice flow exists
- PDF generation exists
- customer history exists
- bookkeeping-oriented CSV export exists
- DACH logic is materially implemented
- inline required-data handling is stronger than before
- offer-to-invoice relationship visibility is present
- tests and build verification are currently green

### Still limiting for a broad launch

- no browser-level end-to-end smoke suite yet
- little market proof contained in the repo
- no strong testimonial layer yet
- no evidence yet of broad support/load handling in real customer conditions
- positioning must remain narrow to avoid direct comparison on breadth with incumbents

## Recommended Go-to-Market Posture

### Recommended: GO

Launch if the posture is:

- founder-led sales
- pilot-driven
- narrow ICP
- low-volume, high-feedback
- credibility-first

### Not recommended yet

Avoid:

- broad paid acquisition
- “for all handwerk / all SMB accounting” messaging
- claiming deep ERP or bookkeeping replacement behavior
- scaling marketing ahead of trust proof and real customer feedback

## Best Initial ICP

Recommended starting profile:

- CH and DE first
- 1–10 employee service/trade businesses
- founder-led or owner-led teams
- strong pain around after-hours admin
- appointment/field-visit-driven quoting behavior

Particularly promising segments:

- cleaning businesses
- local trades
- small field-service operators
- owner-operated businesses with low software tolerance

## Go / No-Go Frame

### GO if:

- launch is framed as a pilot or controlled market entry
- messaging stays narrow and sharp
- demos and outreach are founder-led
- customer feedback is used to tighten the wedge quickly

### NO-GO if:

- launch assumes broad category competition immediately
- positioning becomes generic invoicing/accounting software
- paid scale is attempted before strong conversion proof
- operational trust is not yet proven with real pilot usage

## Top Risks

1. **Positioning too broad**
   - Risk: Offertio gets compared feature-for-feature against larger incumbents.

2. **Not enough trust proof**
   - Risk: prospects hesitate without testimonials, pilots, or real customer evidence.

3. **Insufficient E2E confidence**
   - Risk: hidden cross-route issues may surface during live usage.

4. **Overbuilding too early**
   - Risk: product focus gets diluted before market wedge is validated.

5. **Overpromising**
   - Risk: product claims drift toward ERP/accounting-suite expectations.

## 30-Day Launch Recommendation

### Week 1

- finalize launch messaging
- verify payment/upgrade path in production-like conditions
- prepare demo accounts
- add at least one browser-level smoke flow

### Week 2

- reach out to 20–30 highly targeted prospects
- run 5–8 demos
- collect objections and friction points

### Week 3

- onboard 2–3 pilot users
- observe real document workflows
- fix the most painful friction immediately

### Week 4

- capture testimonials or short case snippets
- tighten the landing around the best-performing ICP
- decide whether to deepen within one segment or open a second adjacent segment

## Final Recommendation

**Offertio should be brought to market now — but as a disciplined soft launch, not as a broad-scale rollout.**

The product looks strongest when sold as a focused operational wedge for small DACH businesses that want to send a professional offer or invoice immediately after the customer interaction.

That is a believable and differentiated market position.

## Supporting References

- BMF e-invoice FAQ: https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html
- SIX QR-bill information: https://www.six-group.com/de/products-services/banking-services/payment-standardization/standards/qr-bill.html
- sevdesk Handwerk: https://sevdesk.de/branchen/buchhaltung-handwerker/
- Lexware Office Handwerk: https://www.lexware.de/branche/handwerker/
- Lexware offers/invoices onboarding: https://help.lexware.de/de-form/articles/9220063-schnelleinstieg-angebote-rechnungen-co-fur-einsteiger
