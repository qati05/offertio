# Autopilot Implementation Plan — Offertio Auth + Onboarding Redesign Slice

## Step 1 — Foundation touch-ups
- Add/adjust a few shared workspace/auth/onboarding primitives in `src/app/globals.css`
- Keep changes small and compatible with existing pages

## Step 2 — Auth redesign
- Rework `src/app/(auth)/login/page.tsx` into a calmer centered auth experience
- Keep password-first and existing Supabase behavior
- Keep optional Google auth and magic-link fallback, but demote them in hierarchy

## Step 3 — Onboarding redesign
- Rework `src/app/(app)/onboarding/page.tsx`
- Add country cards, clearer DACH explanation, and an additional setup step for practical business data
- Keep friction reasonable; avoid turning optional profile data into excessive blockers

## Step 4 — Verification
- Run `npm run build`
- If time allows, run relevant tests or smoke checks
