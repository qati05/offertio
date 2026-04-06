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
 * Sanitize user input to prevent XSS in PDF/email output.
 */
export function sanitize(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
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

export function isValidBase64(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function isSafeDocumentIdentifier(value: unknown, maxLength = 50): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9._\-/]+$/.test(value) &&
    !value.includes("..") &&
    !value.startsWith("/")
  );
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
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
