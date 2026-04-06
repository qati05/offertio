/**
 * Guardian of Compliance — Mandatory Fields Tests
 *
 * Validates that each DACH region correctly enforces its legal requirements:
 *   CH  — IBAN required for Rechnungen (QR-Bill)
 *   DE  — Leistungsdatum + Steuernummer/USt-IdNr required for Rechnungen
 *   AT  — Leistungsdatum always required; UID of issuer + recipient required ≥ EUR 10 000
 *
 * "Fix code, not tests."
 */

import { describe, it, expect } from "vitest";
import { validateForRegion, type DocumentInput } from "@/lib/validation";
import { getRequiredFields } from "@/lib/dach";

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseInput(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    dokumentTyp: "rechnung",
    datum: "2026-04-01",
    profil: { land: "CH", iban: "CH9300762011623852957", uid_mwst: "", steuernummer: "" },
    ...overrides,
  };
}

// ── Swiss (CH) ────────────────────────────────────────────────────────────────

describe("CH — Swiss invoice validation", () => {
  it("accepts a valid CH Rechnung with IBAN", () => {
    const result = validateForRegion(
      baseInput({ profil: { land: "CH", iban: "CH9300762011623852957" } }),
      "CH",
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rejects a CH Rechnung without IBAN", () => {
    const result = validateForRegion(
      baseInput({ profil: { land: "CH", iban: "" } }),
      "CH",
    );
    expect(result.valid).toBe(false);
    expect(result.errors["profil.iban"]).toMatch(/IBAN/i);
  });

  it("accepts a CH Rechnung with null IBAN as invalid (empty string same as null)", () => {
    const result = validateForRegion(
      baseInput({ profil: { land: "CH", iban: null } }),
      "CH",
    );
    expect(result.valid).toBe(false);
  });

  it("accepts a CH Offerte without IBAN — offerte has no IBAN requirement", () => {
    const result = validateForRegion(
      baseInput({ dokumentTyp: "offerte", profil: { land: "CH", iban: "" } }),
      "CH",
    );
    expect(result.valid).toBe(true);
  });

  it("UID/MWST-Nr is NOT a hard block for CH invoices (optional field)", () => {
    const result = validateForRegion(
      baseInput({ profil: { land: "CH", iban: "CH93...", uid_mwst: "" } }),
      "CH",
    );
    // Should be valid — CH uid_mwst is optional per dach.ts (required: false)
    expect(result.valid).toBe(true);
    expect(result.errors["profil.uid_mwst"]).toBeUndefined();
  });
});

// ── German (DE) ───────────────────────────────────────────────────────────────

describe("DE — German invoice validation", () => {
  const deProfile = { land: "DE", steuernummer: "13/123/12345", uid_mwst: "", iban: "DE44500105175407324931" };

  it("rejects a DE Rechnung without Leistungsdatum", () => {
    const result = validateForRegion(
      baseInput({ dokumentTyp: "rechnung", profil: deProfile, leistungsdatum: "" }),
      "DE",
    );
    expect(result.valid).toBe(false);
    expect(result.errors["leistungsdatum"]).toMatch(/§14/);
  });

  it("accepts a DE Rechnung with Leistungsdatum and Steuernummer", () => {
    const result = validateForRegion(
      baseInput({ profil: deProfile, leistungsdatum: "2026-03-28" }),
      "DE",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts a DE Rechnung with Leistungsdatum and USt-IdNr (no Steuernummer)", () => {
    const profileUstId = { land: "DE", steuernummer: "", uid_mwst: "DE123456789", iban: "DE44..." };
    const result = validateForRegion(
      baseInput({ profil: profileUstId, leistungsdatum: "2026-03-28" }),
      "DE",
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a DE Rechnung without Steuernummer AND without USt-IdNr", () => {
    const profileNoTax = { land: "DE", steuernummer: "", uid_mwst: "", iban: "DE44..." };
    const result = validateForRegion(
      baseInput({ profil: profileNoTax, leistungsdatum: "2026-03-28" }),
      "DE",
    );
    expect(result.valid).toBe(false);
    expect(result.errors["profil.steuernummer"]).toMatch(/Steuernummer|USt-IdNr/i);
  });

  it("reports leistungsdatum error when both leistungsdatum and tax number are missing", () => {
    const profileNoTax = { land: "DE", steuernummer: "", uid_mwst: "", iban: "" };
    const result = validateForRegion(
      baseInput({ profil: profileNoTax, leistungsdatum: "" }),
      "DE",
    );
    expect(result.valid).toBe(false);
    // Both errors present
    expect(result.errors["leistungsdatum"]).toBeDefined();
    expect(result.errors["profil.steuernummer"]).toBeDefined();
  });

  it("DE Offerte is always valid — no legal requirements on offers", () => {
    const result = validateForRegion(
      baseInput({ dokumentTyp: "offerte", profil: deProfile }),
      "DE",
    );
    expect(result.valid).toBe(true);
  });
});

// ── Austrian (AT) ─────────────────────────────────────────────────────────────

describe("AT — Austrian invoice validation", () => {
  const atProfileWithUid = { land: "AT", uid_mwst: "ATU12345678", steuernummer: "", iban: "AT483200000012345864" };
  const atProfileNoUid  = { land: "AT", uid_mwst: "",             steuernummer: "", iban: "AT48..." };

  it("rejects a AT Rechnung without Leistungsdatum", () => {
    const result = validateForRegion(
      baseInput({ profil: atProfileWithUid, leistungsdatum: "" }),
      "AT",
    );
    expect(result.valid).toBe(false);
    expect(result.errors["leistungsdatum"]).toMatch(/§11/);
  });

  it("accepts a AT Rechnung with Leistungsdatum, betrag < 10 000, no UID", () => {
    const result = validateForRegion(
      baseInput({ profil: atProfileNoUid, leistungsdatum: "2026-03-15", betrag: 5_000 }),
      "AT",
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a AT Rechnung with betrag ≥ 10 000 when issuer UID is missing", () => {
    const result = validateForRegion(
      baseInput({
        profil: atProfileNoUid,
        leistungsdatum: "2026-03-15",
        betrag: 10_000,
        kundeUidMwst: "ATU99887766",
      }),
      "AT",
    );
    expect(result.valid).toBe(false);
    expect(result.errors["profil.uid_mwst"]).toMatch(/EUR 10.000/);
  });

  it("rejects a AT Rechnung with betrag ≥ 10 000 when recipient UID is missing", () => {
    const result = validateForRegion(
      baseInput({
        profil: atProfileWithUid,
        leistungsdatum: "2026-03-15",
        betrag: 15_000,
        kundeUidMwst: "",
      }),
      "AT",
    );
    expect(result.valid).toBe(false);
    expect(result.errors["kundeUidMwst"]).toMatch(/Empfängers/);
  });

  it("accepts a AT Rechnung with betrag ≥ 10 000 when both UIDs are present", () => {
    const result = validateForRegion(
      baseInput({
        profil: atProfileWithUid,
        leistungsdatum: "2026-03-15",
        betrag: 12_500,
        kundeUidMwst: "ATU99887766",
      }),
      "AT",
    );
    expect(result.valid).toBe(true);
  });

  it("boundary: betrag exactly 9 999.99 EUR — UID not required", () => {
    const result = validateForRegion(
      baseInput({
        profil: atProfileNoUid,
        leistungsdatum: "2026-03-15",
        betrag: 9_999.99,
        kundeUidMwst: "",
      }),
      "AT",
    );
    expect(result.valid).toBe(true);
  });

  it("boundary: betrag exactly 10 000.00 EUR — UID IS required", () => {
    const result = validateForRegion(
      baseInput({
        profil: atProfileNoUid,
        leistungsdatum: "2026-03-15",
        betrag: 10_000,
        kundeUidMwst: "",
      }),
      "AT",
    );
    expect(result.valid).toBe(false);
  });

  it("AT Offerte is always valid — no legal requirements on offers", () => {
    const result = validateForRegion(
      baseInput({ dokumentTyp: "offerte", profil: atProfileNoUid }),
      "AT",
    );
    expect(result.valid).toBe(true);
  });
});

// ── getRequiredFields ─────────────────────────────────────────────────────────

describe("getRequiredFields — required fields matrix", () => {
  it("CH Rechnung requires IBAN", () => {
    const fields = getRequiredFields("CH", "rechnung");
    const keys = fields.map((f) => f.key);
    expect(keys).toContain("profil.iban");
  });

  it("DE Rechnung requires leistungsdatum and steuernummer", () => {
    const fields = getRequiredFields("DE", "rechnung");
    const keys = fields.map((f) => f.key);
    expect(keys).toContain("leistungsdatum");
    expect(keys).toContain("profil.steuernummer");
  });

  it("DE leistungsdatum field references §14 UStG", () => {
    const fields = getRequiredFields("DE", "rechnung");
    const ld = fields.find((f) => f.key === "leistungsdatum");
    expect(ld?.lawReference).toContain("§14");
  });

  it("AT Rechnung requires leistungsdatum", () => {
    const fields = getRequiredFields("AT", "rechnung");
    const keys = fields.map((f) => f.key);
    expect(keys).toContain("leistungsdatum");
  });

  it("AT uid_mwst is conditional (≥ 10 000 EUR)", () => {
    const fields = getRequiredFields("AT", "rechnung");
    const uid = fields.find((f) => f.key === "profil.uid_mwst");
    expect(uid?.conditional).toMatch(/10000/);
  });

  it("Offerte returns no required fields for any region", () => {
    expect(getRequiredFields("CH", "offerte")).toHaveLength(0);
    expect(getRequiredFields("DE", "offerte")).toHaveLength(0);
    expect(getRequiredFields("AT", "offerte")).toHaveLength(0);
  });

  it("unknown region returns empty array", () => {
    expect(getRequiredFields("FR", "rechnung")).toHaveLength(0);
  });
});

// ── Error message quality ─────────────────────────────────────────────────────

describe("error messages — human-readable, law-cited", () => {
  it("DE leistungsdatum error message cites §14 UStG", () => {
    const result = validateForRegion(
      baseInput({
        profil: { land: "DE", steuernummer: "13/123/12345", uid_mwst: "", iban: "DE44..." },
        leistungsdatum: "",
      }),
      "DE",
    );
    expect(result.errors["leistungsdatum"]).toContain("§14");
    expect(result.errors["leistungsdatum"]).toContain("UStG");
  });

  it("AT leistungsdatum error message cites §11 UStG", () => {
    const result = validateForRegion(
      baseInput({
        profil: { land: "AT", uid_mwst: "ATU12345678", steuernummer: "", iban: "" },
        leistungsdatum: null,
      }),
      "AT",
    );
    expect(result.errors["leistungsdatum"]).toContain("§11");
  });

  it("AT UID threshold error mentions EUR 10.000", () => {
    const result = validateForRegion(
      baseInput({
        profil: { land: "AT", uid_mwst: "", steuernummer: "", iban: "" },
        leistungsdatum: "2026-03-15",
        betrag: 10_001,
        kundeUidMwst: "ATU...",
      }),
      "AT",
    );
    expect(result.errors["profil.uid_mwst"]).toContain("10.000");
  });

  it("CH IBAN error mentions IBAN", () => {
    const result = validateForRegion(
      baseInput({ profil: { land: "CH", iban: "" } }),
      "CH",
    );
    expect(result.errors["profil.iban"]).toContain("IBAN");
  });
});
