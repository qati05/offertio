# Offertio — Security Posture

This document summarizes the security model of Offertio and the concrete
defenses implemented in code. It's aimed at reviewers, auditors, and new
engineers onboarding to the project.

## 1. Threat model

Offertio stores commercially sensitive data: customer contacts, offers,
invoices, PDFs, and DACH-specific tax identifiers (UID / USt-IdNr.). We
defend primarily against:

| Threat                           | Impact                              | Mitigations (see §3)      |
|----------------------------------|-------------------------------------|---------------------------|
| Cross-tenant data access         | Leak of another user's documents    | RLS, `user_id` filters    |
| Stolen or leaked credentials     | Account takeover                    | Supabase Auth, short-lived sessions |
| XSS in PDFs / rendered HTML      | Script execution, data exfiltration | `sanitize()` everywhere we render |
| CSV formula injection            | Malicious spreadsheet payloads      | `sanitize()` strips `= + - @ \t \r` prefixes |
| Path traversal in Storage writes | Overwriting other users' PDFs       | `isSafeDocumentIdentifier()` + per-user path prefix |
| Oversized uploads / DoS          | Server overload                     | `content-length` guard + base64 size cap |
| Abuse of PDF / email endpoints   | Spam, bill shock                    | Upstash Redis sliding-window rate limiting |
| CSRF from other origins          | Forged write ops                    | `isAllowedOrigin()` on mutating routes |
| Header / email injection         | Unauthorized BCC, spoofed headers   | `stripControlChars()` before embedding user input |
| Prompt-injection via CSV export  | Formula execution in Excel          | Leading-char strip in `sanitize()` |

## 2. Boundaries

- **Browser ↔ Next.js API routes**: authenticated via Supabase Auth cookie.
- **Next.js ↔ Supabase Postgres**: service-role (`supabase-admin`) only
  for multi-row operations that RLS would otherwise block (e.g. webhook
  plan updates). All other queries go through the user-scoped client.
- **Next.js ↔ Supabase Storage**: PDFs stored under `${userId}/*.pdf`;
  the `isSafeDocumentIdentifier()` check guarantees no user-controlled
  path segment can escape their bucket prefix.
- **Webhooks (Lemon Squeezy)**: HMAC-signature verified on every request.
  Rejected requests never touch the database.

## 3. Key defenses (with file references)

### Row-Level Security
Every user-facing table (`dokumente`, `customers`, `vorlagen`,
`profiles`, `share_links`) has RLS enabled. Policies are defined in
`supabase/migrations/` and enforce `user_id = auth.uid()` on read/write.
API routes pass `createSupabaseServer()` or, for RLS-bypass operations,
`getSupabaseAdmin()` with an explicit `user_id` scope filter.

### Input validation & sanitization
Central helpers live in `src/lib/security.ts`:
- `sanitize()` — HTML/CSV-safe escaping, used for every field rendered
  into PDF HTML or exported to CSV.
- `isValidEmail()` / `normalizeEmail()` — email gate on send paths.
- `isValidUUID()` — applied before any `eq("id", …)` DB query.
- `isSafeDocumentIdentifier()` — validates document number used in
  storage paths; prevents `..` traversal and absolute paths.
- `isValidBase64()` — size-bounded (15 MB chars) to prevent ReDoS, then
  regex-validated.
- `stripControlChars()` — used before embedding user input into email
  headers, subjects, and filenames to defeat CRLF injection.

### Size caps
- `/api/dokument/save`: `MAX_PDF_BYTES = 7 MB`, `MAX_REQUEST_BYTES = 12 MB`.
  Checked against `Content-Length` before JSON parsing.
- Customer display name, Objekt, Kundenname: length-capped at 500 chars
  before reaching the DB.

### Rate limiting
`src/lib/rate-limit.ts` uses Upstash Redis for sliding-window limits.
Current limits:
- `dokument-save`: 30 saves / 60 s / user
- `dokument-share`: 20 shares / 60 s / user
- `dokument-update-status`: 60 updates / 60 s / user
- `account-export`: 3 exports / 60 s / user
- `account-delete`: 1 deletion / 60 s / user

On limit, the endpoint responds `429` with a `Retry-After` header.

### Origin & CSRF
`isAllowedOrigin()` enforces same-origin on all mutating endpoints.
State-changing requests from foreign origins are rejected with `403`.

### Authentication
- Supabase Auth handles session cookies (HTTP-only, SameSite=Lax).
- No long-lived refresh tokens exposed to client JS.
- `middleware.ts` guards the `(app)` route group — unauthenticated
  requests are redirected to `/login`.

### Logging
`src/lib/logger.ts` emits structured events. We deliberately do NOT log
- PDF bytes or base64 payloads,
- email addresses in error messages,
- raw webhook bodies after signature verification.

## 4. Known limitations / accepted risks

- **Offline drafts** live in `localStorage`. A hostile browser extension
  could read drafts. We document this trade-off to users in
  `/einstellungen/datenschutz`.
- **Multi-device simultaneous edit**: last-writer-wins on the
  `dokumente` row. Conflicts are rare in practice (single-operator
  businesses), but we do not lock.
- **PDF parsing**: we never parse user-supplied PDFs. All PDFs are
  generated server-side from our own template — no attack surface.

## 5. Reporting a vulnerability

Send details to `security@offertio.ch` with PoC. We acknowledge within
72 h. Critical issues are patched and deployed within 7 days. A public
write-up follows after fix deployment with credit (opt-in).

## 6. Audit trail

- 2026-03-22: Migration `015` introduced customer records + document
  links with RLS-scoped policies.
- 2026-03-29: `security.ts` consolidated — single entry point for input
  validation and sanitization.
- 2026-04-18: This document created.
