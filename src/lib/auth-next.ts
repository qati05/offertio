/** Allowlisted post-login paths. Anything else is ignored (no open redirect). */
export const AUTH_NEXT_PATHS = ["/gruenderplatz", "/einrichtung"] as const;

export type AuthNextPath = (typeof AUTH_NEXT_PATHS)[number];

const AUTH_NEXT_SET = new Set<string>(AUTH_NEXT_PATHS);

export function parseAuthNext(value: string | null | undefined): AuthNextPath | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!AUTH_NEXT_SET.has(decoded)) return null;
  return decoded as AuthNextPath;
}
