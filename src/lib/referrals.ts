/**
 * Referral program — small pure helpers.
 *
 * The referral code is an 8-char alphanumeric token generated server-side
 * on profile creation (see migration 024). This module only contains
 * pure utilities (URL builders, validation) used by UI code.
 *
 * Flow summary:
 *   1. Any user's /einstellungen page shows their code + share URL.
 *   2. Share URL looks like "https://offertio.ch/?ref=ABCD1234".
 *   3. /login reads ?ref= from the URL and stashes it into cookies/localStorage.
 *   4. On first successful sign-up, the signup completion handler inserts a
 *      `referrals` row (server-side) linking referrer → new user.
 *   5. Pro conversion webhooks flip the referrals.status to "qualified".
 */

export const REFERRAL_CODE_REGEX = /^[A-HJKMNP-Z2-9]{8}$/;

/** Returns true if the string looks like a legit referral code. */
export function isValidReferralCode(value: unknown): value is string {
  return typeof value === "string" && REFERRAL_CODE_REGEX.test(value);
}

/** Build the shareable signup URL for a given referral code. */
export function buildReferralShareUrl(baseUrl: string, code: string): string {
  if (!isValidReferralCode(code)) {
    throw new Error("Invalid referral code");
  }
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("ref", code);
    return url.toString();
  } catch {
    // Fallback for malformed bases — still safe because we validated the code.
    return `${baseUrl.replace(/\/$/, "")}/?ref=${code}`;
  }
}

/** Extract a referral code from a URL (query string) if present & valid. */
export function extractReferralCode(url: string | URL): string | null {
  try {
    const u = typeof url === "string" ? new URL(url) : url;
    const code = u.searchParams.get("ref");
    return code && isValidReferralCode(code) ? code : null;
  } catch {
    return null;
  }
}

/**
 * Compose the suggested share text for a given locale. Keeps the message
 * short and non-pushy — this is not a growth-hack blast.
 */
export function buildShareMessage(
  shareUrl: string,
  locale: "de" | "fr" | "it" = "de",
): string {
  switch (locale) {
    case "fr":
      return `Je fais mes devis et factures avec Offertio — teste-le gratuitement pendant 14 jours : ${shareUrl}`;
    case "it":
      return `Uso Offertio per offerte e fatture — provalo gratis per 14 giorni: ${shareUrl}`;
    case "de":
    default:
      return `Ich schreibe meine Offerten & Rechnungen mit Offertio — 14 Tage gratis testen: ${shareUrl}`;
  }
}
