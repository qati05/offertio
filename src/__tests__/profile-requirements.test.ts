import { describe, expect, it } from "vitest";
import { getMissingProfileFieldsForDocument } from "@/lib/profile";
import type { Profile } from "@/lib/types";

const baseProfile: Profile = {
  id: "user-1",
  email: "owner@example.com",
  firmenname: "Offertio GmbH",
  vorname: "Anna",
  nachname: "Muster",
  adresse: "Bahnhofstrasse 1",
  plz: "8001",
  ort: "Zuerich",
  telefon: "",
  iban: "CH9300762011623852957",
  bic: "",
  uid_mwst: "CHE-123",
  logo_url: "",
  land: "CH",
  sprache: "de",
  beruf: "Handwerk",
  zahlungsfrist: 30,
  plan: "free",
  onboarding_complete: true,
  created_at: "2026-04-01T00:00:00Z",
};

describe("profile requirements for documents", () => {
  it("requires only sender basics for offers", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...baseProfile, firmenname: "", adresse: "", plz: "" },
      "offerte",
      "CH",
    );

    expect(missing.map((field) => field.label)).toEqual(["Firmenname", "Adresse", "PLZ"]);
  });

  it("requires iban and one German tax ID for invoices in germany", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...baseProfile, land: "DE", iban: "", steuernummer: "", uid_mwst: "" },
      "rechnung",
      "DE",
    );

    expect(missing.map((field) => field.label)).toEqual(
      expect.arrayContaining(["IBAN", "Steuernummer oder USt-IdNr."]),
    );
  });

  it("CH uid_mwst is optional — does NOT appear in missing fields for CH Rechnung", () => {
    // CH uid_mwst has required: false in dach.ts, so it must never block invoice creation.
    const missing = getMissingProfileFieldsForDocument(
      { ...baseProfile, uid_mwst: "" },
      "rechnung",
      "CH",
    );

    expect(missing.map((f) => f.key)).not.toContain("uid_mwst");
  });

  it("CH Rechnung requires IBAN when missing", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...baseProfile, iban: "" },
      "rechnung",
      "CH",
    );

    expect(missing.map((f) => f.label)).toContain("IBAN");
  });

  it("CH Offerte does NOT require IBAN", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...baseProfile, iban: "" },
      "offerte",
      "CH",
    );

    expect(missing.map((f) => f.key)).not.toContain("iban");
  });

  it("AT Rechnung does NOT require Firmenbuchnummer (fn_nr is optional)", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...baseProfile, land: "AT", fn_nr: "" },
      "rechnung",
      "AT",
    );

    // AT fn_nr and uid_mwst are both optional
    expect(missing.map((f) => f.key)).not.toContain("fn_nr");
    expect(missing.map((f) => f.key)).not.toContain("uid_mwst");
  });

  it("returns empty array for a fully complete CH profile on Rechnung", () => {
    const missing = getMissingProfileFieldsForDocument(baseProfile, "rechnung", "CH");
    expect(missing).toHaveLength(0);
  });
});
