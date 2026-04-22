/**
 * Format an ISO `YYYY-MM-DD` string as a Swiss-style date (`dd.mm.yyyy`).
 *
 * `new Date("2025-04-20")` is parsed as midnight UTC by the spec, not local
 * time. In timezones west of UTC this causes the displayed day to shift one
 * back (e.g. 2025-04-20 renders as 2025-04-19 for a user in the Americas)
 * — which silently corrupts legally relevant fields like invoice date and
 * due date. Parsing the parts manually and constructing the Date via the
 * local-time constructor keeps the displayed day identical to what the user
 * typed regardless of their timezone.
 */
export function formatSwissDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Add N days to an ISO `YYYY-MM-DD` string, returning the result in the same
 * format. Timezone-safe: constructs the date in local time and reads the
 * components back without going through UTC.
 */
export function addDaysIso(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
