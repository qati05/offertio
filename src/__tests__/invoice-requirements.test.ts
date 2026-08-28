import { describe, it, expect } from "vitest";
import { checkInvoiceRequirements } from "@/lib/invoice-requirements";

/**
 * Country-specific mandatory invoice fields, in one place.
 *
 * Previously these lived inline in /api/dokument/save, one country at a time.
 * Collecting them makes the gaps visible: Austria had two rules, Germany one,
 * and Switzerland none at all — even though Art. 26 MWSTG is just as explicit
 * as §11 UStG.
 */
function invoice(overrides: Record<string, unknown> = {}) {
  return {
    typ: "rechnung" as const,
    land: "CH",
    betrag: 500,
    mwstSatz: 8.1,
    leistungsdatum: "2026-02-28",
    sellerUid: "CHE-123.456.789 MWST",
    recipientUid: null,
    kleinunternehmer: false,
    ...overrides,
  };
}

describe("invoice requirements · Switzerland (Art. 26 MWSTG)", () => {
  it("accepts an invoice carrying the issuer's UID", () => {
    expect(checkInvoiceRequirements(invoice())).toEqual({ ok: true });
  });

  it("refuses to charge MWST without the issuer's UID", () => {
    // Art. 26 Abs. 2 lit. a MWSTG: the supplier's UID is mandatory. Without it
    // the recipient cannot deduct the input tax, so the invoice is worthless to
    // them — while the issuer has still charged and owes the tax.
    const result = checkInvoiceRequirements(invoice({ sellerUid: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ch_seller_uid_required");
      expect(result.message).toMatch(/UID/);
    }
  });

  it("allows a Kleinunternehmer without a UID", () => {
    // Not VAT-registered, so there is no UID to state and no MWST is charged.
    expect(
      checkInvoiceRequirements(invoice({ sellerUid: "", kleinunternehmer: true, mwstSatz: 0 })),
    ).toEqual({ ok: true });
  });

  it("allows a 0% invoice without a UID", () => {
    expect(checkInvoiceRequirements(invoice({ sellerUid: "", mwstSatz: 0 }))).toEqual({ ok: true });
  });

  it("does not require a Leistungsdatum", () => {
    // Art. 26 Abs. 2 lit. c MWSTG asks for it only where it differs from the
    // invoice date, so it stays optional.
    expect(checkInvoiceRequirements(invoice({ leistungsdatum: null }))).toEqual({ ok: true });
  });
});

describe("invoice requirements · Austria (§11 UStG)", () => {
  const at = (o: Record<string, unknown> = {}) =>
    invoice({ land: "AT", mwstSatz: 20, sellerUid: "ATU12345678", ...o });

  it("requires a Leistungsdatum", () => {
    const result = checkInvoiceRequirements(at({ leistungsdatum: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("leistungsdatum_required");
  });

  it("requires the issuer's UID unless Kleinunternehmer", () => {
    const result = checkInvoiceRequirements(at({ sellerUid: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("at_seller_uid_required");

    expect(checkInvoiceRequirements(at({ sellerUid: "", kleinunternehmer: true }))).toEqual({ ok: true });
  });

  it("requires the recipient's UID from EUR 10 000 gross", () => {
    expect(checkInvoiceRequirements(at({ betrag: 9999 }))).toEqual({ ok: true });
    const result = checkInvoiceRequirements(at({ betrag: 10_000 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("at_recipient_uid_required");
    expect(checkInvoiceRequirements(at({ betrag: 10_000, recipientUid: "ATU87654321" }))).toEqual({ ok: true });
  });
});

describe("invoice requirements · Germany (§14 UStG)", () => {
  const de = (o: Record<string, unknown> = {}) =>
    invoice({ land: "DE", mwstSatz: 19, sellerUid: "DE123456789", ...o });

  it("requires a Leistungsdatum", () => {
    const result = checkInvoiceRequirements(de({ leistungsdatum: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("leistungsdatum_required");
  });

  it("does not require the recipient's UID on an ordinary invoice", () => {
    expect(checkInvoiceRequirements(de({ betrag: 50_000 }))).toEqual({ ok: true });
  });
});

describe("invoice requirements · scope", () => {
  it("checks nothing on an Offerte", () => {
    // A quotation is not an invoice; none of these statutes apply to it.
    expect(
      checkInvoiceRequirements(invoice({ typ: "offerte", land: "AT", leistungsdatum: null, sellerUid: "" })),
    ).toEqual({ ok: true });
  });

  it("treats an unknown country as unconstrained rather than failing", () => {
    expect(checkInvoiceRequirements(invoice({ land: "FR", sellerUid: "" }))).toEqual({ ok: true });
  });

  it("explains every refusal in German", () => {
    for (const input of [
      invoice({ sellerUid: "" }),
      invoice({ land: "AT", mwstSatz: 20, sellerUid: "" }),
      invoice({ land: "DE", mwstSatz: 19, leistungsdatum: null }),
    ]) {
      const result = checkInvoiceRequirements(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(20);
    }
  });
});
