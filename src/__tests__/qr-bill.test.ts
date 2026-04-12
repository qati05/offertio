import { describe, it, expect } from "vitest";
import { generateQrCodeDataUrl, generateQrBillData, generateQrrReference, QrIbanError, IbanValidationError } from "@/lib/qr-bill";
import type { Profile } from "@/lib/types";

/** Minimal CH profile with a regular CH-IBAN */
const chProfile: Profile = {
  id: "user-ch",
  email: "owner@example.com",
  firmenname: "Muster AG",
  vorname: "Max",
  nachname: "Muster",
  adresse: "Bahnhofstrasse 1",
  plz: "8001",
  ort: "Zürich",
  telefon: "",
  iban: "CH9300762011623852957",
  bic: "",
  uid_mwst: "",
  logo_url: "",
  land: "CH",
  sprache: "de",
  beruf: "Handwerk",
  zahlungsfrist: 30,
  plan: "free",
  created_at: "2026-01-01T00:00:00Z",
};

/** A QR-IBAN (IIN 30000–31999 — Postfinance QR range) */
const qrIbanProfile: Profile = {
  ...chProfile,
  iban: "CH4431999123000889012",
};

/** A DE profile — should return null regardless */
const deProfile: Profile = {
  ...chProfile,
  iban: "DE89370400440532013000",
  land: "DE",
};

describe("generateQrCodeDataUrl", () => {
  it("returns a data URL for a CH Rechnung with a regular CH-IBAN", async () => {
    const result = await generateQrCodeDataUrl(chProfile, 1234.56, "REK-2024-001");
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
    expect(result!.startsWith("data:image/svg+xml;base64,")).toBe(true);
    // Verify the base64 part is non-empty
    const base64Part = result!.replace("data:image/svg+xml;base64,", "");
    expect(base64Part.length).toBeGreaterThan(100);
  });

  it("returns a valid base64 SVG data URL for a different document number", async () => {
    // The QR matrix encodes the message — the SVG itself is pixel data, not human-readable text.
    // We just verify the output is a well-formed data URL with non-trivial content.
    const result = await generateQrCodeDataUrl(chProfile, 500, "REK-2024-TESTMSG");
    expect(result).not.toBeNull();
    expect(result!.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const base64Part = result!.replace("data:image/svg+xml;base64,", "");
    // Decode and verify it is valid SVG
    const decoded = atob(base64Part);
    expect(decoded).toContain("<svg");
    expect(decoded).toContain("</svg>");
  });

  it("returns a data URL (not throws) for a QR-IBAN — QRR is generated automatically", async () => {
    const result = await generateQrCodeDataUrl(qrIbanProfile, 100, "REK-2024-001");
    expect(result).not.toBeNull();
    expect(result!.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("returns null for a non-CH IBAN (DE)", async () => {
    const result = await generateQrCodeDataUrl(deProfile, 100, "RE-001");
    expect(result).toBeNull();
  });

  it("throws IbanValidationError for a CH IBAN with invalid MOD-97 checksum", async () => {
    // CH9008080009726692255 has an incorrect check digit — swissqrbill rejects it
    await expect(
      generateQrCodeDataUrl({ ...chProfile, iban: "CH9008080009726692255" }, 100, "RE-001"),
    ).rejects.toThrow(IbanValidationError);
  });

  it("returns null when IBAN is missing", async () => {
    const result = await generateQrCodeDataUrl(
      { ...chProfile, iban: "" },
      100,
      "REK-001",
    );
    expect(result).toBeNull();
  });

  it("returns null when IBAN is only whitespace", async () => {
    const result = await generateQrCodeDataUrl(
      { ...chProfile, iban: "   " },
      100,
      "REK-001",
    );
    expect(result).toBeNull();
  });

  it("handles zero amount without crashing", async () => {
    const result = await generateQrCodeDataUrl(chProfile, 0, "REK-2024-ZERO");
    // swissqrbill allows amount 0 — should return a data URL, not throw
    expect(result).not.toBeNull();
    expect(result!.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("handles a creditor name built from vorname+nachname when firmenname is empty", async () => {
    const profileNoFirma: Profile = { ...chProfile, firmenname: "" };
    const result = await generateQrCodeDataUrl(profileNoFirma, 200, "REK-001");
    expect(result).not.toBeNull();
    expect(result!.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });
});

describe("generateQrBillData", () => {
  it("returns dataUrl and null qrReference for regular CH-IBAN", async () => {
    const result = await generateQrBillData(chProfile, 500, "RE-2026-001");
    expect(result).not.toBeNull();
    expect(result!.dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(result!.qrReference).toBeNull();
  });

  it("returns dataUrl and 27-digit qrReference for QR-IBAN", async () => {
    const result = await generateQrBillData(qrIbanProfile, 100, "REK-2024-001");
    expect(result).not.toBeNull();
    expect(result!.dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(typeof result!.qrReference).toBe("string");
    expect(result!.qrReference).toHaveLength(27);
    expect(/^\d{27}$/.test(result!.qrReference!)).toBe(true);
  });

  it("returns a valid SVG for QR-IBAN", async () => {
    const result = await generateQrBillData(qrIbanProfile, 250, "RE-2026-001");
    expect(result).not.toBeNull();
    const decoded = atob(result!.dataUrl.replace("data:image/svg+xml;base64,", ""));
    expect(decoded).toContain("<svg");
  });

  it("returns null for non-CH IBAN", async () => {
    const result = await generateQrBillData(deProfile, 100, "RE-001");
    expect(result).toBeNull();
  });

  it("returns null for empty IBAN", async () => {
    const result = await generateQrBillData({ ...chProfile, iban: "" }, 100, "RE-001");
    expect(result).toBeNull();
  });
});

describe("generateQrrReference", () => {
  it("returns a 27-digit numeric string for a typical invoice number", () => {
    const ref = generateQrrReference("RE-2026-001");
    expect(ref).toHaveLength(27);
    expect(/^\d{27}$/.test(ref)).toBe(true);
  });

  it("produces known-good checksum for RE-2026-001", () => {
    // Digits: 2026001 → padded: 00000000000000000002026001 → checksum: 0
    expect(generateQrrReference("RE-2026-001")).toBe("000000000000000000020260010");
  });

  it("produces known-good checksum for REK-2024-001", () => {
    // Digits: 2024001 → padded: 00000000000000000002024001 → checksum: 9
    expect(generateQrrReference("REK-2024-001")).toBe("000000000000000000020240019");
  });

  it("handles a purely numeric input", () => {
    const ref = generateQrrReference("123");
    expect(ref).toHaveLength(27);
    expect(/^\d{27}$/.test(ref)).toBe(true);
  });

  it("handles a single digit input", () => {
    const ref = generateQrrReference("1");
    expect(ref).toHaveLength(27);
  });

  it("handles a number string longer than 26 digits (takes last 26)", () => {
    const long = "1".repeat(30);
    const ref = generateQrrReference(long);
    expect(ref).toHaveLength(27);
    expect(/^\d{27}$/.test(ref)).toBe(true);
  });

  it("handles a document number with no digits (returns all-zeros + checksum)", () => {
    const ref = generateQrrReference("ABCDE");
    expect(ref).toHaveLength(27);
    // All zeros padded → checksum of 26 zeros = 0
    expect(ref).toBe("000000000000000000000000000");
  });

  it("is consistent — same input always returns same output", () => {
    const a = generateQrrReference("RE-2026-100");
    const b = generateQrrReference("RE-2026-100");
    expect(a).toBe(b);
  });
});

describe("QrIbanError", () => {
  it("is instanceof Error", () => {
    const err = new QrIbanError();
    expect(err).toBeInstanceOf(Error);
  });

  it("has name QrIbanError", () => {
    expect(new QrIbanError().name).toBe("QrIbanError");
  });

  it("has a descriptive message", () => {
    expect(new QrIbanError().message).toMatch(/QR-IBAN/i);
  });
});
