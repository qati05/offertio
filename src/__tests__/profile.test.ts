import { describe, expect, it } from "vitest";
import { getMissingProfileFieldsForDocument, isProfileComplete } from "@/lib/profile";

describe("profile completeness", () => {
  it("returns true for a complete profile", () => {
    expect(
      isProfileComplete({
        firmenname: "Muster AG",
        beruf: "Elektriker",
        vorname: "Max",
        nachname: "Muster",
        iban: "CH93 0076 2011 6238 5295 7",
      })
    ).toBe(true);
  });

  it("returns false for missing required fields", () => {
    expect(
      isProfileComplete({
        firmenname: "",
        beruf: "Elektriker",
        vorname: "Max",
        nachname: "Muster",
        iban: "CH93 0076 2011 6238 5295 7",
      })
    ).toBe(false);

    expect(isProfileComplete(null)).toBe(false);
  });

  it("lists document-specific missing profile fields inline", () => {
    // CH uid_mwst is optional (required: false) — IBAN is the only payment field required.
    expect(
      getMissingProfileFieldsForDocument(
        {
          firmenname: "Muster AG",
          adresse: "",
          plz: "",
          ort: "Zürich",
          iban: "",
          uid_mwst: "",
          land: "CH",
        },
        "rechnung",
        "CH",
      ).map((field) => field.label),
    ).toEqual(["Adresse", "PLZ", "IBAN"]);

    expect(
      getMissingProfileFieldsForDocument(
        {
          firmenname: "Muster AG",
          adresse: "Bahnhofstrasse 1",
          plz: "10115",
          ort: "Berlin",
          iban: "DE123",
          steuernummer: "",
          land: "DE",
        },
        "rechnung",
        "DE",
      ).map((field) => field.label),
    ).toContain("Steuernummer");
  });
});
