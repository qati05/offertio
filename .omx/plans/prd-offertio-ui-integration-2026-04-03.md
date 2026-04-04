# Offertio UI Integration Plan — Stitch to Product System

_Date: 2026-04-03_

## Requirements Summary

Integrate the Stitch direction in `C:\Users\resha\OneDrive\Desktop\stitch` into the real Offertio product so the landing page and workspace feel like one premium Swiss operational tool instead of two separate design languages.

### Grounding
- The landing currently composes a full section stack from isolated components in `src/app/page.tsx:14-31`.
- The app already has a warm-premium token base in `src/app/globals.css:5-26`, reveal handling in `src/app/globals.css:106-117`, and workspace utility classes like `.app-stat-card` / `.btn-premium` in `src/app/globals.css:333-383`.
- The dashboard currently centers on stat cards, a `Neues Dokument` CTA, and recent documents in `src/app/(app)/dashboard/page.tsx:66-178`.
- The document creator is the most important workflow and currently mixes edit / preview / send in one large file at `src/app/(app)/dokument/neu/page.tsx:17-916` and beyond.
- Onboarding is a 3-step utilitarian flow in `src/app/(app)/onboarding/page.tsx:30-175`.
- Upgrade is a standalone simple pricing module in `src/components/UpgradeScreen.tsx:21-182`.
- Stitch provides aligned visual references for landing, dashboard, document creator, onboarding, and upgrade under `Desktop/stitch/*`, plus a strong design system in `Desktop/stitch/atelier_swiss/DESIGN.md`.

## Decision

Adopt the Stitch package as the new visual source-of-truth for Offertio’s product surfaces, but port it into the existing Next.js codebase incrementally in a system-first order:
1. tokens + primitives
2. app shell
3. dashboard
4. document creator
5. onboarding + upgrade
6. landing harmonization

## Acceptance Criteria

1. Offertio uses one coherent visual system across landing and app, based on the “Swiss Precision & Tactile Craft / Alpine Ledger” direction.
2. The landing, dashboard, document creator, onboarding, and upgrade screens share the same typography, spacing, surface, and CTA language.
3. The document creator remains functionally intact while visually moving closer to the Stitch workflow.
4. No major auth, payment, or document-generation flows regress.
5. The result is testable in browser previews on both landing and app routes.

## Design Principles

1. **One product, one brand language** — landing promise and workspace reality must match.
2. **Warm precision over startup hype** — keep warm neutrals + restrained orange, avoid dark AI tropes.
3. **Operational clarity beats feature density** — emphasize “next useful action”, not dashboard noise.
4. **Mobile-first, desktop-respectful** — Stitch mobile screens set the interaction model, but desktop layouts must not feel like stretched phone mocks.
5. **System before screens** — build reusable primitives/tokens first so redesign does not become one-off page painting.

## Screen-by-Screen Integration Mapping

### A. Global Visual System
**Source:** `stitch/atelier_swiss/DESIGN.md`

**Adopt directly**
- warm stone surfaces
- restrained orange as surgical accent
- Manrope/Inter editorial hierarchy equivalent
- tonal layering instead of hard dividers
- ghost borders and ambient depth

**Target files**
- `src/app/globals.css`
- new shared UI primitives under `src/components/ui/*` or `src/components/app/*`
- `src/components/OffertioLogo.tsx`

**Outcome**
- unify landing and workspace tokens
- reduce ad hoc inline styling in app screens

---

### B. Landing Page
**Source:** `stitch/landing_page/screen.png`, `stitch/landing_page/code.html`

**What to keep from current app**
- current route structure and component composition in `src/app/page.tsx`
- existing section model (hero, trust, pain, workflow, pricing, FAQ, CTA)

**What to replace / upgrade**
- hero composition: more editorial headline + product visualization balance
- section density: tighter rhythm, less filler, fewer “generic SaaS” cards
- pricing section should visually align with upgrade screen
- CTA styling should match in-product CTAs

**Target files**
- `src/components/LandingHero.tsx`
- `src/components/LandingTrustBar.tsx`
- `src/components/LandingPain.tsx`
- `src/components/LandingHowItWorks.tsx`
- `src/components/LandingFeatures.tsx`
- `src/components/LandingPricing.tsx`
- `src/components/LandingCta.tsx`
- `src/components/LandingFooter.tsx`

**Key adaptation note**
- do not clone the Stitch landing 1:1; use it to tighten hierarchy and make desktop composition stronger.

---

### C. Dashboard / App Shell
**Source:** `stitch/dashboard/screen.png`, `stitch/dashboard/code.html`

**Current state**
- strong data baseline, weak product mood
- current dashboard already has a stats + recent-activity structure in `src/app/(app)/dashboard/page.tsx:66-178`

**Integration target**
- move to a clearer overview with:
  - one primary revenue/overview card
  - two strong primary actions
  - recent activity as product feed
  - bottom/mobile nav logic informing the app shell
- upgrade CTA should feel embedded, not bolted on

**Target files**
- `src/app/(app)/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`
- likely new shell/nav components under `src/components/app/*`

**Important choice**
- adopt the Stitch dashboard as the baseline app shell direction.

---

### D. Document Creator (highest-value screen)
**Source:** `stitch/document_creator/screen.png`, `stitch/document_creator/code.html`

**Current state**
- functionally rich but visually heavy and monolithic in `src/app/(app)/dokument/neu/page.tsx`

**Integration target**
- convert the current workflow into a clearer “guided operational form”:
  - customer identity
  - service details / line items
  - Swiss settlement / payment block
  - document preview
  - anchored primary send CTA
- preserve current logic for PDF, save, send, limits, QR, and preview
- split the giant page into smaller components before or during visual port

**Target files**
- `src/app/(app)/dokument/neu/page.tsx`
- optionally `src/app/(app)/offerte/neu/page.tsx`
- new components like:
  - `src/components/document/CustomerCard.tsx`
  - `src/components/document/PositionListCard.tsx`
  - `src/components/document/SettlementCard.tsx`
  - `src/components/document/PreviewPane.tsx`
  - `src/components/document/ComposerActions.tsx`

**Important choice**
- this is the first workspace screen to fully port after shell/tokens because it is the product’s trust core.

---

### E. Onboarding
**Source:** `stitch/onboarding_flow/screen.png`, `stitch/onboarding_flow/code.html`

**Current state**
- 3-step flow works but feels utilitarian in `src/app/(app)/onboarding/page.tsx:30-175`

**Integration target**
- keep 3-step logic
- move to calmer card-based presentation
- stronger branded welcome moment
- progress bar and CTA should match workspace system

**Target files**
- `src/app/(app)/onboarding/page.tsx`

---

### F. Upgrade / Pro
**Source:** `stitch/upgrade_to_pro/screen.png`, `stitch/upgrade_to_pro/code.html`

**Current state**
- functionally adequate, visually isolated in `src/components/UpgradeScreen.tsx:21-182`

**Integration target**
- align with landing pricing and app shell
- make feature list and premium framing feel calmer and more credible
- keep Lemon checkout behavior unchanged

**Target files**
- `src/components/UpgradeScreen.tsx`
- `src/components/LandingPricing.tsx`

## Implementation Steps

### Phase 1 — Token and primitive reset
1. Translate `atelier_swiss/DESIGN.md` into final app tokens in `src/app/globals.css`.
2. Replace remaining competing workspace/landing surface rules with one shared token system.
3. Extract shared primitives for:
   - cards
   - section headers
   - primary/secondary buttons
   - chips/badges
   - input shells
   - stacked mobile nav / action bars

### Phase 2 — App shell and dashboard
1. Refactor `src/app/(app)/layout.tsx` into a clearer premium shell.
2. Rebuild `dashboard/page.tsx` to follow the Stitch overview structure.
3. Preserve live data and current payment/profile logic while swapping presentation.

### Phase 3 — Document creator refactor + redesign
1. Split `dokument/neu/page.tsx` into smaller render components.
2. Port the Stitch composition onto the existing logic.
3. Ensure preview, PDF generation, send flow, upgrade gating, and offline behavior remain intact.

### Phase 4 — Onboarding and upgrade alignment
1. Restyle onboarding to match the new shell.
2. Port upgrade screen styling and unify with landing pricing.
3. Make Pro messaging consistent across app and landing.

### Phase 5 — Landing harmonization
1. Tighten landing composition to match the new app language.
2. Reuse upgraded primitives instead of landing-only one-offs.
3. Ensure hero, pricing, CTA, and footer feel like a continuation of the workspace.

### Phase 6 — Visual QA and final polish
1. Run browser previews on landing + app routes.
2. Compare against Stitch screenshots for hierarchy, spacing, and tone.
3. Fix inconsistencies, especially CTA styling, typography, and spacing rhythm.

## Risks and Mitigations

### Risk 1 — Visual polish breaks functional flows
**Mitigation:** Treat `dokument/neu/page.tsx` as a refactor-with-UI-port. Preserve logic first, then change presentation in slices.

### Risk 2 — Landing and app drift again
**Mitigation:** Shared token/primitives phase comes first; do not redesign screens independently.

### Risk 3 — Stitch is too mobile-only
**Mitigation:** Use Stitch for hierarchy and tone, not literal desktop layout duplication. Desktop should become editorial and spacious, not giant phone mockups.

### Risk 4 — Scope balloons into full rewrite
**Mitigation:** Keep auth, payment, and backend logic intact. This is a UI system + screen integration project, not a product rebuild.

## Verification Steps

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run build`
4. Visual route check:
   - `/`
   - `/login`
   - `/onboarding`
   - `/dashboard`
   - `/dokument/neu`
5. Manual smoke:
   - signup/login
   - onboarding completion
   - create offer
   - create invoice
   - PDF/send path
   - upgrade CTA path

## ADR

### Decision
Adopt the Stitch package as the new unified product UI direction and port it into the real Offertio app incrementally.

### Drivers
- current app and landing still feel misaligned
- Stitch gives a coherent landing + workspace direction
- document creator and dashboard need a premium operational redesign, not more backend work

### Alternatives considered
1. **Keep iterating the current UI incrementally** — rejected because the design language remains too fragmented.
2. **Clone Stitch screens directly into HTML-like components** — rejected because it would likely break product logic and produce brittle desktop behavior.
3. **Landing-only redesign** — rejected because the workspace is the real trust surface.

### Why chosen
This path upgrades the brand and product together while preserving the working backend, auth, and document engine.

### Consequences
- requires a focused UI refactor pass
- will touch many surface files
- should materially improve launch readiness and perceived product quality

### Follow-ups
- execute Phase 1 first before touching individual screens
- use visual review after each major screen port
- only then run final launch smoke

## Suggested Execution Order

1. `globals.css` + primitives
2. app shell/layout
3. dashboard
4. document creator
5. onboarding
6. upgrade
7. landing
8. final polish + smoke
