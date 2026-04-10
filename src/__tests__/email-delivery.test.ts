import { describe, expect, it } from "vitest";

/**
 * Tests for the email delivery feature (mailto: link generation).
 *
 * The email feature works by:
 * 1. Downloading the PDF to the user's device
 * 2. Opening a mailto: link with pre-filled recipient, subject, and body
 * 3. The user attaches the PDF manually from their downloads
 *
 * This is by design — customers send documents from their own email client.
 */

function buildMailtoUrl(params: {
  kundeEmail: string;
  kundeName?: string;
  typLabel: string;
  nummer: string;
  firmenname?: string;
}): string {
  const { kundeEmail, kundeName, typLabel, nummer, firmenname } = params;
  const subject = encodeURIComponent(
    `${typLabel} ${nummer}${firmenname ? ` — ${firmenname}` : ""}`,
  );
  const body = encodeURIComponent(
    `Guten Tag${kundeName ? ` ${kundeName}` : ""},\n\n` +
    `anbei erhalten Sie ${typLabel === "Offerte" ? "unsere Offerte" : "unsere Rechnung"} ${nummer}.\n` +
    `Bitte finden Sie das PDF im Anhang.\n\n` +
    `Freundliche Grüsse\n${firmenname || ""}`,
  );
  return `mailto:${encodeURIComponent(kundeEmail)}?subject=${subject}&body=${body}`;
}

describe("email delivery — mailto URL builder", () => {
  it("builds mailto with all fields for Offerte", () => {
    const url = buildMailtoUrl({
      kundeEmail: "hans@muster.ch",
      kundeName: "Hans Muster",
      typLabel: "Offerte",
      nummer: "OF-2026-001",
      firmenname: "Meine Firma GmbH",
    });

    expect(url).toContain("mailto:hans%40muster.ch");
    expect(url).toContain("subject=");
    expect(url).toContain("body=");

    const decodedSubject = decodeURIComponent(url.split("subject=")[1].split("&")[0]);
    expect(decodedSubject).toBe("Offerte OF-2026-001 — Meine Firma GmbH");

    const decodedBody = decodeURIComponent(url.split("body=")[1]);
    expect(decodedBody).toContain("Guten Tag Hans Muster");
    expect(decodedBody).toContain("unsere Offerte OF-2026-001");
    expect(decodedBody).toContain("PDF im Anhang");
    expect(decodedBody).toContain("Meine Firma GmbH");
  });

  it("builds mailto for Rechnung", () => {
    const url = buildMailtoUrl({
      kundeEmail: "info@firma.de",
      kundeName: "Anna Schmidt",
      typLabel: "Rechnung",
      nummer: "RG-2026-042",
      firmenname: "Test AG",
    });

    const decodedSubject = decodeURIComponent(url.split("subject=")[1].split("&")[0]);
    expect(decodedSubject).toBe("Rechnung RG-2026-042 — Test AG");

    const decodedBody = decodeURIComponent(url.split("body=")[1]);
    expect(decodedBody).toContain("unsere Rechnung RG-2026-042");
  });

  it("handles missing customer name gracefully", () => {
    const url = buildMailtoUrl({
      kundeEmail: "test@example.com",
      typLabel: "Offerte",
      nummer: "OF-001",
    });

    const decodedBody = decodeURIComponent(url.split("body=")[1]);
    expect(decodedBody).toContain("Guten Tag,");
    expect(decodedBody).not.toContain("Guten Tag ,");
  });

  it("handles missing company name", () => {
    const url = buildMailtoUrl({
      kundeEmail: "test@example.com",
      kundeName: "Max",
      typLabel: "Offerte",
      nummer: "OF-001",
    });

    const decodedSubject = decodeURIComponent(url.split("subject=")[1].split("&")[0]);
    expect(decodedSubject).toBe("Offerte OF-001");
    expect(decodedSubject).not.toContain("—");
  });

  it("encodes special characters in email address", () => {
    const url = buildMailtoUrl({
      kundeEmail: "user+tag@domain.co.at",
      typLabel: "Rechnung",
      nummer: "RG-001",
    });

    expect(url).toContain("mailto:user%2Btag%40domain.co.at");
  });

  it("encodes umlauts in customer name", () => {
    const url = buildMailtoUrl({
      kundeEmail: "test@test.ch",
      kundeName: "Müller Günther",
      typLabel: "Offerte",
      nummer: "OF-001",
    });

    const decodedBody = decodeURIComponent(url.split("body=")[1]);
    expect(decodedBody).toContain("Müller Günther");
  });
});

describe("email delivery — success page mailto", () => {
  it("builds success page mailto for customer with email", () => {
    const kundeEmail = "kunde@firma.ch";
    const kundeName = "Test Kunde";
    const typ = "offerte" as const;
    const nummer = "OF-2026-001";

    const href = `mailto:${encodeURIComponent(kundeEmail)}?subject=${encodeURIComponent(
      `${typ === "offerte" ? "Offerte" : "Rechnung"} ${nummer}`,
    )}&body=${encodeURIComponent(
      `Guten Tag${kundeName ? ` ${kundeName}` : ""},\n\n` +
      `anbei erhalten Sie ${typ === "offerte" ? "unsere Offerte" : "unsere Rechnung"} ${nummer}.\n` +
      `Bitte finden Sie das PDF im Anhang.\n\nFreundliche Grüsse`,
    )}`;

    expect(href).toContain("mailto:kunde%40firma.ch");
    expect(href).toContain("Offerte%20OF-2026-001");
    const decodedBody = decodeURIComponent(href.split("body=")[1]);
    expect(decodedBody).toContain("Guten Tag Test Kunde");
    expect(decodedBody).toContain("unsere Offerte");
  });
});
