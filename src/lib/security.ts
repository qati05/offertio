/**
 * Mask IBAN for display: CH93 0076 **** **** **** 7
 */
export function maskIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, "");
  if (clean.length < 8) return iban;
  const prefix = clean.slice(0, 8);
  const suffix = clean.slice(-1);
  const masked = clean.slice(8, -1).replace(/./g, "•");
  return `${prefix}${masked}${suffix}`.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Sanitize user input to prevent XSS in PDF/HTML output and CSV/formula
 * injection (spreadsheet formula injection via leading =, +, -, @, \t, \r).
 */
export function sanitize(input: string): string {
  let result = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  // Strip leading formula-injection characters to prevent CSV/spreadsheet
  // formula execution if this value is ever exported to CSV.
  result = result.replace(/^[=+\-@\t\r]+/, "");

  return result;
}

/**
 * Validate email format.
 * Explicitly rejects control characters (null bytes, newlines, etc.)
 * before applying the structural regex.
 */
export function isValidEmail(email: string): boolean {
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate Swiss IBAN format.
 */
export function isValidSwissIBAN(iban: string): boolean {
  const clean = iban.replace(/\s/g, "");
  return /^CH\d{2}\d{17}$/.test(clean);
}

/**
 * Validate UUID format.
 */
export function isValidUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Strip control characters and prevent CRLF/LF header injection.
 *
 * Takes only the content before the first line boundary — CRLF injection
 * requires a literal newline to start a new header. Any injected headers
 * (e.g. "Subject: foo\r\nBcc: hacker@evil.com") are eliminated because only
 * "Subject: foo" survives. Remaining control chars are then removed.
 *
 * Use before embedding user input into email headers, subjects, or filenames.
 */
export function stripControlChars(input: string): string {
  // Take only the first line segment — drops everything after \r\n, \r, or \n
  const firstLine = input.split(/\r\n|\r|\n/)[0] ?? "";
  // Remove remaining C0/C1 control characters (null bytes, etc.)
  // eslint-disable-next-line no-control-regex
  return firstLine.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
}

// Max base64 payload: 10 MB encoded ≈ ~13.7 MB base64 chars. Cap at 15 MB of
// characters to prevent ReDoS on pathological inputs before the regex runs.
const MAX_BASE64_CHARS = 15 * 1024 * 1024;

export function isValidBase64(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_BASE64_CHARS) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(value);
}

export function isSafeDocumentIdentifier(value: unknown, maxLength = 50): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9._-]+$/.test(value) &&
    !value.includes("..") &&
    !value.startsWith("/")
  );
}

const IPV4_RE = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
// Intentionally loose: accepts the full IPv6 grammar including zone IDs and
// IPv4-mapped forms. Rejects obvious junk (spaces, letters beyond hex, etc.).
const IPV6_RE = /^[0-9a-f:]+(?:%[0-9a-z]+)?$/i;

function isIpLike(value: string): boolean {
  if (!value) return false;
  return IPV4_RE.test(value) || (value.includes(":") && IPV6_RE.test(value));
}

/**
 * Extract the client IP from proxy headers safely.
 *
 * `x-forwarded-for` is the primary header (Vercel, most reverse proxies put
 * the real client IP in the first position), but it is technically
 * client-settable — a malicious client could send
 * "x-forwarded-for: attacker.example" and have the proxy append the real IP,
 * poisoning rate-limit buckets. We therefore validate that the first entry
 * actually looks like an IP address before trusting it, and fall back to
 * `x-real-ip` (also validated) otherwise.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (isIpLike(first)) return first;
  }

  const real = headers.get("x-real-ip")?.trim();
  if (real && isIpLike(real)) return real;

  return "unknown";
}

export function isAllowedOrigin(requestUrl: string, origin: string | null): boolean {
  if (!origin) return false;

  try {
    const req = new URL(requestUrl);
    const ori = new URL(origin);
    return req.protocol === ori.protocol && req.host === ori.host;
  } catch {
    return false;
  }
}
