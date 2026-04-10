import type { Profile } from "./types";

/**
 * Thrown when the profile uses a QR-IBAN but no valid QRR reference can be
 * derived from the document number.  Kept for backwards-compatibility — callers
 * that already catch this should continue to work, but under normal operation
 * this error is no longer thrown because generateQrrReference handles all
 * document numbers.
 */
export class QrIbanError extends Error {
  constructor() {
    super("QR-IBAN requires a 27-digit QRR reference — not yet supported");
    this.name = "QrIbanError";
  }
}

/**
 * Derives a valid 27-digit QRR (Swiss QR-Reference) from any document number.
 *
 * Algorithm:
 *   1. Extract only digit characters from `nummer`.
 *   2. Left-pad with zeros to exactly 26 digits (take last 26 if longer).
 *   3. Append the Modulo-10-recursive checksum digit.
 *
 * The result is always a 27-digit numeric string accepted by swissqrbill and
 * the Swiss QR-bill standard when paired with a QR-IBAN.
 *
 * @example
 *   generateQrrReference("RE-2026-001")  // "000000000000000000020260010"
 *   generateQrrReference("REK-2024-001") // "000000000000000000020240019"
 */
export function generateQrrReference(nummer: string): string {
  // Keep only digit characters
  const digits = nummer.replace(/\D/g, "");
  // Ensure exactly 26 digits (left-pad; take last 26 if somehow longer)
  const padded = digits.length >= 26
    ? digits.slice(-26)
    : digits.padStart(26, "0");
  // Compute checksum using the Modulo-10 recursive algorithm (Swiss QR-bill §4.7)
  const checksum = _modulo10Recursive(padded);
  return padded + checksum;
}

/**
 * Modulo-10 recursive (Luhn-like) checksum used by the Swiss QR-bill standard.
 * Returns a single digit string ("0"–"9").
 */
function _modulo10Recursive(reference: string): string {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const ch of reference) {
    carry = table[(carry + parseInt(ch, 10)) % 10];
  }
  return String((10 - carry) % 10);
}

/** Result returned by {@link generateQrBillData}. */
export interface QrBillData {
  /** SVG data URL suitable for embedding in @react-pdf/renderer <Image>. */
  dataUrl: string;
  /**
   * The 27-digit QRR that was encoded in the QR code.
   * Only set when the profile IBAN is a QR-IBAN; `null` for regular IBANs
   * where an unstructured message is used instead.
   */
  qrReference: string | null;
}

/**
 * Generates Swiss QR Code SVG data URL **and** returns the QRR reference when
 * a QR-IBAN is used.  Prefer this function over the legacy
 * {@link generateQrCodeDataUrl} when you need to display the structured
 * reference in the human-readable part of the QR-bill PDF.
 *
 * Returns `null` when no QR code should be generated (non-CH IBAN or empty
 * IBAN).
 *
 * For regular CH-IBANs the document number is passed as an unstructured
 * `message` (reference type NON).
 *
 * For QR-IBANs (IIN 30–31) a valid 27-digit QRR is derived automatically from
 * the document number via {@link generateQrrReference}.
 */
export async function generateQrBillData(
  profil: Profile,
  total: number,
  nummer: string,
): Promise<QrBillData | null> {
  const cleanIban = profil.iban?.replace(/\s/g, "") ?? "";
  if (!cleanIban.startsWith("CH")) {
    return null;
  }

  try {
    const [{ SwissQRCode }, { isQRIBAN }] = await Promise.all([
      import("swissqrbill/svg"),
      import("swissqrbill/utils"),
    ]);

    const isQrIban = isQRIBAN(cleanIban);

    const creditor = {
      account: cleanIban,
      name: profil.firmenname || `${profil.vorname} ${profil.nachname}`.trim(),
      address: profil.adresse || "",
      zip: profil.plz || "",
      city: profil.ort || "",
      country: "CH" as const,
    };

    let qrReference: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;

    if (isQrIban) {
      // QR-IBAN requires a structured 27-digit QRR reference.
      qrReference = generateQrrReference(nummer);
      data = {
        creditor,
        currency: "CHF" as const,
        amount: Math.round(total * 100) / 100,
        reference: qrReference,
      };
    } else {
      // Regular CH-IBAN: use unstructured message (reference type NON).
      data = {
        creditor,
        currency: "CHF" as const,
        amount: Math.round(total * 100) / 100,
        message: nummer,
      };
    }

    const qrCode = new SwissQRCode(data);
    const svgString = qrCode.toString();

    // btoa requires a Latin-1 safe string. swissqrbill SVG output is ASCII-only,
    // but we use encodeURIComponent + replacement to be safe against any future
    // non-ASCII chars without relying on the deprecated `unescape` global.
    const base64 = btoa(
      encodeURIComponent(svgString).replace(
        /%([0-9A-F]{2})/gi,
        (_, hex) => String.fromCharCode(parseInt(hex, 16)),
      ),
    );
    return {
      dataUrl: `data:image/svg+xml;base64,${base64}`,
      qrReference,
    };
  } catch (err) {
    if (err instanceof QrIbanError) {
      throw err;
    }
    // QR code generation failed — return null so caller can handle gracefully
    return null;
  }
}

/**
 * Generate Swiss QR Code SVG data URL for embedding in PDF or preview.
 *
 * This is the legacy single-return-value API.  New code should use
 * {@link generateQrBillData} which also returns the QRR reference.
 *
 * For regular CH-IBANs the document number is passed as an unstructured
 * `message` (reference type NON).  For QR-IBANs a valid QRR is derived
 * automatically — the function no longer throws {@link QrIbanError} under
 * normal conditions.
 *
 * @throws {QrIbanError} never thrown in normal operation; kept for
 *   backwards-compatibility only.
 */
export async function generateQrCodeDataUrl(
  profil: Profile,
  total: number,
  nummer: string
): Promise<string | null> {
  const result = await generateQrBillData(profil, total, nummer);
  return result ? result.dataUrl : null;
}
