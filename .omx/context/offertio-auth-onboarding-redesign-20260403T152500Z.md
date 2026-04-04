# Offertio Auth + Onboarding Redesign Slice Context

Timestamp: 2026-04-03T15:25:00Z
Task statement: Implement the highest-leverage Offertio redesign slice while Opus is blocked: stabilize the design-system foundation enough to support a warmer unified product feel, then redesign auth and onboarding in the active local-dev workspace.

Desired outcome:
- Auth and onboarding feel like the same premium DACH-aware product as the landing/workspace
- Country selection is clearer and visibly meaningful
- The onboarding flow captures stronger setup context without turning into CRM bureaucracy
- No auth or onboarding regressions

Known facts / evidence:
- Active local workspace is `C:\Users\resha\OneDrive\Desktop\Offertio\Offerte-claude-offertio-landing-page-oeati`
- DACH logic already exists in `src/lib/dach.ts`
- Onboarding currently selects land/language, then company/industry/name, then final confirmation; it does not collect address/IBAN/tax info during onboarding (`src/app/(app)/onboarding/page.tsx`)
- Login is already password-first but still presents multiple auth modes and a large marketing-heavy split layout (`src/app/(auth)/login/page.tsx`)
- Shared design tokens live in `src/app/globals.css`
- Build currently passes before this slice

Constraints:
- Preserve existing Supabase auth behavior
- Preserve DACH-aware document/payment logic
- Keep the product simple; do not turn onboarding into a heavy CRM setup wizard
- Avoid reintroducing dark/AI-SaaS styling

Unknowns / open questions:
- Exact ideal level of required detail in onboarding vs later profile settings
- Whether Google auth should remain visually prominent if enabled

Likely codebase touchpoints:
- `src/app/globals.css`
- `src/app/(auth)/login/page.tsx`
- `src/app/(app)/onboarding/page.tsx`
- possibly `src/lib/dach.ts`, `src/lib/i18n/translations.ts`, `src/app/(app)/einstellungen/profil/page.tsx`
