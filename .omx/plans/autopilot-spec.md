# Autopilot Spec — Offertio Auth + Onboarding Redesign Slice

## Requirements Summary
- Redesign auth and onboarding in the active Offertio local-dev workspace.
- Keep the experience warm, calm, and premium.
- Make DACH country selection visible and understandable.
- Keep the product simple and operational; do not make onboarding feel like heavy setup.
- Preserve password-first login, with magic-link fallback.

## Technical Direction
- Reuse the existing token system in `globals.css` and add minimal new primitives only where needed.
- Simplify auth layout from a split marketing-heavy screen toward a centered, calmer entry surface.
- Replace onboarding country dropdown with country cards and make the country consequences visible.
- Expand onboarding to capture practical profile data that improves first-document quality, but keep required fields minimal.

## Acceptance Criteria
1. Login page renders with a calmer single-surface layout and still supports signup/login plus optional Google/magic fallback.
2. Onboarding visibly supports CH / DE / AT and explains why country matters.
3. Onboarding collects stronger business setup information than before.
4. `npm run build` succeeds after changes.
