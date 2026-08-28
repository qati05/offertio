import { describe, it, expect } from "vitest";
import { buildCreditor } from "@/lib/qr-bill";
import type { Profile } from "@/lib/types";

const profil = {
  firmenname: "Reinigung Muster GmbH",
  vorname: "Max",
  nachname: "Muster",
  adresse: "Hauptstrasse 12",
  plz: "8000",
  ort: "Zürich",
} as unknown as Profile;

/**
 * Address handling in the Swiss QR code.
 *
 * From 21 November 2025 the Swiss QR code accepts only structured addresses
 * (type "S"); the combined type "K" is withdrawn, and from 21 November 2026 the
 * structured address becomes mandatory for payments generally.
 *
 * swissqrbill 4.x writes the type letter as a literal "S", so Offertio cannot
 * emit type K at all — the deadline is not a blocker. What these tests pin is
 * the remaining gap: the house number is not in its own field.
 */
describe("QR-bill · creditor address", () => {
  it("supplies the separate structured fields the standard expects", () => {
    const creditor = buildCreditor(profil, "CH9300762011623852957");
    expect(creditor.zip).toBe("8000");
    expect(creditor.city).toBe("Zürich");
    expect(creditor.country).toBe("CH");
    expect(creditor.account).toBe("CH9300762011623852957");
  });

  it("falls back to the person's name when no company name is set", () => {
    const ohneFirma = { ...profil, firmenname: "" } as unknown as Profile;
    expect(buildCreditor(ohneFirma, "CH93").name).toBe("Max Muster");
  });

  it("KNOWN GAP: the house number is not in its own field", () => {
    // Structured addresses separate street (StrtNm) from house number (BldgNb).
    // The profile stores one address line, so the number rides along in the
    // street field and buildingNumber is never set. Still address type S, but
    // the number is in the wrong element.
    //
    // Fixing it needs separate profile fields (a product decision) rather than
    // heuristic parsing of a free-text line, which does not belong in payment
    // data. This assertion documents the current state; when the fields are
    // added it will fail and must be updated deliberately.
    const creditor = buildCreditor(profil, "CH93") as Record<string, unknown>;
    expect(creditor.address).toBe("Hauptstrasse 12");
    expect(creditor.buildingNumber).toBeUndefined();
  });
});
