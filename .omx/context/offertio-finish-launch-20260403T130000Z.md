# Context Snapshot - Offertio Finish-to-Launch

## Task statement
Plan what is still required to make Offertio truly “fix und fertig” / launch-ready.

## Desired outcome
A clear, prioritized launch plan that covers product readiness, auth, UX, payments, email, verification, demo assets, and growth handoff.

## Known facts / evidence
- Product repo path: `C:\Users\resha\OneDrive\Desktop\Offertio\Offerte-claude-offertio-landing-page-oeati`
- Stack: Next.js 15, React 19, Supabase, Resend, Lemon Squeezy, Upstash, Vitest
- Supabase auth, profile, template, PDF upload, and `dokumente` live checks succeeded
- Auth was switched to **password-first** with Magic Link as fallback
- Callback route now handles both `code` and `token_hash + type`
- Waitlist still exists in docs/migrations, but should be removed from the product-facing funnel
- Tests currently pass: `npm test`
- Typecheck passes: `npx tsc --noEmit`
- Production build passes: `npm run build`
- User still judges the landing/design as not fully there yet
- There is no real browser-level E2E suite yet
- Lemon Squeezy checkout/webhook readiness still needs end-to-end verification
- Demo/video assets are still a meaningful launch requirement

## Constraints
- Product should feel trustworthy and usable for small Swiss service businesses
- Avoid generic/sloppy marketing language
- Reduce auth friction
- Keep product truth honest
- No fake social proof
- Focus on direct product usage, not waitlist gating

## Unknowns / open questions
- Final visual direction still depends on the new design explorations
- Whether email confirmation should remain on for launch or be relaxed further
- Whether Google auth should be launched now or later
- Exact launch channel readiness for marketing/traffic

## Likely codebase touchpoints
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/callback/route.ts`
- `src/app/page.tsx`
- `src/components/Landing*.tsx`
- `src/app/(app)/**`
- `src/app/api/**`
- `supabase/migrations/**`
- `docs/ARCHITECTURE.md`
- `docs/OPERATIONS.md`
- `docs/DUE_DILIGENCE.md`
