# Test Spec - Offertio Finish-to-Launch

## Goal
Define the checks needed to confidently call Offertio launch-ready.

## Verification Levels

### 1. Static verification
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

### 2. Auth verification
- New user signup with password-first path
- Existing user login with password
- Duplicate signup message behaves correctly
- Email confirmation link callback behaves correctly when used
- Magic Link fallback still works if kept

### 3. Onboarding verification
- New user reaches onboarding
- Required profile fields save correctly
- Completion routes user into dashboard

### 4. Document workflow verification
- Offer creation
- Invoice creation
- PDF generation
- success page
- dashboard history visibility
- storage / metadata persistence

### 5. Email/send verification
- server email send path if configured
- graceful fallback if not configured

### 6. Payments / upgrade verification
- checkout link opens correctly
- webhook updates `profiles.plan`
- UI reflects upgraded plan state

### 7. Product-facing UX verification
- landing and login do not contradict each other
- no visible waitlist-first path remains
- CTAs lead to immediate product use
- copy is customer-facing, not internal-note-like

## Suggested manual smoke checklist
1. Visit landing
2. Click primary CTA
3. Create account with new email
4. Confirm email if required
5. Login with password
6. Complete onboarding
7. Create first offer
8. Generate/send first PDF
9. Verify dashboard/history
10. Inspect pricing/upgrade path

## Suggested automated additions
- Browser-level smoke test for login/signup/onboarding
- Browser-level smoke test for first document creation

## Launch gate
Offertio is launch-ready only if:
- auth path is stable
- first document path is stable
- pricing/upgrade promises are honest
- product-facing UX is coherent
- all core static checks are green
