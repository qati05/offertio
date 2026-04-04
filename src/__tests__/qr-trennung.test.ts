import { describe, it, expect } from "vitest";
import { getDachConfig } from "@/lib/dach";

describe("QR-Trennung: DE/AT vs CH", () => {
  it("CH hat Swiss QR-Bill aktiviert", () => {
    expect(getDachConfig("CH").hasQrBill).toBe(true);
  });

  it("DE hat KEINEN Swiss QR-Bill", () => {
    expect(getDachConfig("DE").hasQrBill).toBe(false);
  });

  it("AT hat KEINEN Swiss QR-Bill", () => {
    expect(getDachConfig("AT").hasQrBill).toBe(false);
  });

  it("CH hat SEPA nicht aktiviert", () => {
    expect(getDachConfig("CH").sepaEnabled).toBe(false);
  });

  it("DE hat SEPA aktiviert", () => {
    expect(getDachConfig("DE").sepaEnabled).toBe(true);
  });

  it("AT hat SEPA aktiviert", () => {
    expect(getDachConfig("AT").sepaEnabled).toBe(true);
  });
});

describe("Steuernummer-Label pro Land", () => {
  it("DE: pdfUidLabel ist 'Steuernummer'", () => {
    expect(getDachConfig("DE").pdfUidLabel).toBe("Steuernummer");
  });

  it("AT: pdfUidLabel ist 'Steuernummer / UID'", () => {
    expect(getDachConfig("AT").pdfUidLabel).toBe("Steuernummer / UID");
  });

  it("CH: pdfMwstNrLabel ist 'MWST-Nr.'", () => {
    expect(getDachConfig("CH").pdfMwstNrLabel).toBe("MWST-Nr.");
  });
});
