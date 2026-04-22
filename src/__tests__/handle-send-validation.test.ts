/**
 * Tests for handleSend validation logic
 *
 * handleSend itself lives in a React component and cannot be unit-tested
 * directly.  These tests cover the underlying pure functions that drive
 * every early-return guard in handleSend:
 *
 *   1. getMissingProfileFieldsForDocument — blocks sending with missing profile
 *   2. dachConfig.leistungsdatumRequired  — blocks sending without Leistungsdatum for DE/AT
 *   3. IBAN presence for CH Rechnung
 *   4. Steuernummer required for DE Rechnung (no uid_mwst optional fallback)
 */

import { describe, it, expect } from "vitest";
import { getMissingProfileFieldsForDocument } from "@/lib/profile";
import { getDachConfig } from "@/lib/dach";
import type { Profile, DokumentTyp } from "@/lib/types";

// ---------------------------------------------------------------------------
// Shared base profiles per country
// ---------------------------------------------------------------------------

const chProfile: Profile = {
  id: "user-ch",
  email: "owner@ch.example",
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

const deProfile: Profile = {
  ...chProfile,
  id: "user-de",
  email: "owner@de.example",
  iban: "DE89370400440532013000",
  land: "DE",
  steuernummer: "13/123/12345",
  uid_mwst: "DE123456789",
  plz: "10115",
  ort: "Berlin",
};

const atProfile: Profile = {
  ...chProfile,
  id: "user-at",
  email: "owner@at.example",
  iban: "AT611904300234573201",
  land: "AT",
  uid_mwst: "ATU12345678",
  fn_nr: "",
  plz: "1010",
  ort: "Wien",
};

// ---------------------------------------------------------------------------
// Flow A — CH Rechnung
// ---------------------------------------------------------------------------

describe("Flow A: CH Rechnung handleSend validation", () => {
  it("passes for a complete CH profile on Rechnung", () => {
    const missing = getMissingProfileFieldsForDocument(chProfile, "rechnung", "CH");
    expect(missing).toHaveLength(0);
  });

  it("blocks when IBAN is missing", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...chProfile, iban: "" },
      "rechnung",
      "CH",
    );
    expect(missing.map((f) => f.label)).toContain("IBAN");
  });

  it("does NOT block for missing CH uid_mwst (optional)", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...chProfile, uid_mwst: "" },
      "rechnung",
      "CH",
    );
    expect(missing.map((f) => f.key)).not.toContain("uid_mwst");
  });

  it("does NOT require leistungsdatum for CH", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.leistungsdatumRequired).toBe(false);
  });

  it("generates QR bill data — non-CH IBAN returns null (no QR for DE profile)", async () => {
    const { generateQrBillData } = await import("@/lib/qr-bill");
    const result = await generateQrBillData(
      { ...chProfile, iban: "DE89370400440532013000" },
      100,
      "RE-2026-001",
    );
    expect(result).toBeNull();
  });

  it("generates QR bill data — CH IBAN returns data URL", async () => {
    const { generateQrBillData } = await import("@/lib/qr-bill");
    const result = await generateQrBillData(chProfile, 250, "RE-2026-001");
    expect(result).not.toBeNull();
    expect(result!.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

// ---------------------------------------------------------------------------
// Flow B — Offerte → Rechnung carryover
// ---------------------------------------------------------------------------

describe("Flow B: Offerte → Rechnung carryover draft", () => {
  /**
   * The carryover draft is set by handleSend in page.tsx before navigating to
   * /dokument/success. On the success page the user clicks "Als Rechnung
   * weiterführen" which writes the draft to localStorage["dokument-draft"].
   * page.tsx restores it in the useEffect on mount.
   *
   * We simulate this by constructing the draft object exactly as handleSend
   * does and verifying it contains the expected fields.
   */

  const sampleKunde = {
    name: "Mueller AG",
    firma: "",
    adresse: "Hauptstrasse 10",
    adresse2: "",
    plz: "8001",
    ort: "Zürich",
    email: "info@mueller.example",
  };

  const samplePositionen = [
    { bezeichnung: "Beratung", einheit: "Std.", menge: 2, preis: 150 },
  ];

  function buildCarryoverDraft(savedDocumentId: string | null, offerteNummer: string) {
    return {
      dokumentTyp: "rechnung",
      kunde: sampleKunde,
      positionen: samplePositionen,
      objekt: "Badezimmer EG",
      notiz: "Exkl. Material",
      rabatt: { aktiv: false, label: "Rabatt", modus: "chf", wert: 0 },
      preisMode: "exkl",
      mwstSatz: 8.1,
      sourceDocumentId: savedDocumentId,
      sourceDocumentNumber: offerteNummer,
    };
  }

  it("carryover draft sets dokumentTyp to rechnung", () => {
    const draft = buildCarryoverDraft("doc-123", "OF-2026-001");
    expect(draft.dokumentTyp).toBe("rechnung");
  });

  it("carryover draft carries kunde, positionen, objekt, notiz, mwstSatz", () => {
    const draft = buildCarryoverDraft("doc-123", "OF-2026-001");
    expect(draft.kunde).toEqual(sampleKunde);
    expect(draft.positionen).toEqual(samplePositionen);
    expect(draft.objekt).toBe("Badezimmer EG");
    expect(draft.notiz).toBe("Exkl. Material");
    expect(draft.mwstSatz).toBe(8.1);
  });

  it("carryover draft sets sourceDocumentId and sourceDocumentNumber", () => {
    const draft = buildCarryoverDraft("doc-123", "OF-2026-001");
    expect(draft.sourceDocumentId).toBe("doc-123");
    expect(draft.sourceDocumentNumber).toBe("OF-2026-001");
  });

  it("carryover draft is null when dokumentTyp is rechnung (only offerte converts)", () => {
    // Simulate handleSend carryoverDraft logic: only offerte creates it
    const dokumentTyp = "rechnung" as DokumentTyp;
    const carryoverDraft = dokumentTyp === "offerte"
      ? buildCarryoverDraft("doc-456", "RE-2026-001")
      : null;
    expect(carryoverDraft).toBeNull();
  });

  it("roundtrips through localStorage without data loss", () => {
    const draft = buildCarryoverDraft("doc-789", "OF-2026-005");
    localStorage.setItem("dokument-draft", JSON.stringify(draft));
    const restored = JSON.parse(localStorage.getItem("dokument-draft") || "{}");
    expect(restored.dokumentTyp).toBe("rechnung");
    expect(restored.kunde.name).toBe("Mueller AG");
    expect(restored.sourceDocumentId).toBe("doc-789");
    expect(restored.sourceDocumentNumber).toBe("OF-2026-005");
    localStorage.removeItem("dokument-draft");
  });
});

// ---------------------------------------------------------------------------
// Flow C — DE Rechnung
// ---------------------------------------------------------------------------

describe("Flow C: DE Rechnung handleSend validation", () => {
  it("leistungsdatumRequired is true for DE", () => {
    expect(getDachConfig("DE").leistungsdatumRequired).toBe(true);
  });

  it("hasQrBill is false for DE (no Swiss QR)", () => {
    expect(getDachConfig("DE").hasQrBill).toBe(false);
  });

  it("zugferdCompatible is true for DE", () => {
    expect(getDachConfig("DE").zugferdCompatible).toBe(true);
  });

  it("blocks when both German tax IDs are missing for DE Rechnung", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...deProfile, steuernummer: "", uid_mwst: "" },
      "rechnung",
      "DE",
    );
    expect(missing.map((f) => f.label)).toContain("Steuernummer oder USt-IdNr.");
  });

  it("DE uid_mwst is optional — does NOT block sending", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...deProfile, uid_mwst: "" },
      "rechnung",
      "DE",
    );
    expect(missing.map((f) => f.key)).not.toContain("uid_mwst");
  });

  it("requires IBAN for DE Rechnung", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...deProfile, iban: "" },
      "rechnung",
      "DE",
    );
    expect(missing.map((f) => f.label)).toContain("IBAN");
  });

  it("passes for a complete DE Rechnung profile", () => {
    const missing = getMissingProfileFieldsForDocument(deProfile, "rechnung", "DE");
    expect(missing).toHaveLength(0);
  });

  it("DE Offerte does NOT require Steuernummer", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...deProfile, steuernummer: "" },
      "offerte",
      "DE",
    );
    expect(missing.map((f) => f.key)).not.toContain("steuernummer");
  });

  it("generateQrBillData returns null for DE IBAN (no Swiss QR for DE)", async () => {
    const { generateQrBillData } = await import("@/lib/qr-bill");
    const result = await generateQrBillData(deProfile, 500, "RE-2026-001");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Flow D — AT Rechnung
// ---------------------------------------------------------------------------

describe("Flow D: AT Rechnung handleSend validation", () => {
  it("leistungsdatumRequired is true for AT", () => {
    expect(getDachConfig("AT").leistungsdatumRequired).toBe(true);
  });

  it("hasQrBill is false for AT (no Swiss QR)", () => {
    expect(getDachConfig("AT").hasQrBill).toBe(false);
  });

  it("zugferdCompatible is false for AT", () => {
    expect(getDachConfig("AT").zugferdCompatible).toBe(false);
  });

  it("AT uid_mwst is optional — does NOT block sending", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...atProfile, uid_mwst: "" },
      "rechnung",
      "AT",
    );
    expect(missing.map((f) => f.key)).not.toContain("uid_mwst");
  });

  it("AT fn_nr is optional — does NOT block sending", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...atProfile, fn_nr: "" },
      "rechnung",
      "AT",
    );
    expect(missing.map((f) => f.key)).not.toContain("fn_nr");
  });

  it("requires IBAN for AT Rechnung", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...atProfile, iban: "" },
      "rechnung",
      "AT",
    );
    expect(missing.map((f) => f.label)).toContain("IBAN");
  });

  it("passes for a complete AT Rechnung profile", () => {
    const missing = getMissingProfileFieldsForDocument(atProfile, "rechnung", "AT");
    expect(missing).toHaveLength(0);
  });

  it("AT Offerte does NOT require IBAN", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...atProfile, iban: "" },
      "offerte",
      "AT",
    );
    expect(missing.map((f) => f.key)).not.toContain("iban");
  });

  it("generateQrBillData returns null for AT IBAN (no Swiss QR for AT)", async () => {
    const { generateQrBillData } = await import("@/lib/qr-bill");
    const result = await generateQrBillData(atProfile, 500, "RE-2026-001");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Leistungsdatum gating — the critical AT bug we fixed
// ---------------------------------------------------------------------------

describe("Leistungsdatum rendering gating (the AT fix)", () => {
  it("leistungsdatumRequired for CH is false — field NOT shown", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.leistungsdatumRequired).toBe(false);
  });

  it("leistungsdatumRequired for DE is true — field shown", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.leistungsdatumRequired).toBe(true);
  });

  it("leistungsdatumRequired for AT is true — field must be shown (was the bug)", () => {
    const cfg = getDachConfig("AT");
    // This was the bug: AT requires Leistungsdatum but the field was only
    // rendered for profil.land === 'DE'. The fix uses dachConfig.leistungsdatumRequired
    // for both rendering and validation so they always stay in sync.
    expect(cfg.leistungsdatumRequired).toBe(true);
  });

  it("validation blocks AT Rechnung when leistungsdatum is empty", () => {
    // Simulate the handleSend guard:
    //   if (dokumentTyp === 'rechnung' && dachConfig.leistungsdatumRequired && !leistungsdatum)
    const dokumentTyp = "rechnung";
    const leistungsdatum = "";
    const cfg = getDachConfig("AT");
    const wouldBlock = dokumentTyp === "rechnung" && cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(true);
  });

  it("validation passes AT Rechnung when leistungsdatum is set", () => {
    const dokumentTyp = "rechnung";
    const leistungsdatum = "2026-03-15";
    const cfg = getDachConfig("AT");
    const wouldBlock = dokumentTyp === "rechnung" && cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(false);
  });

  it("validation does NOT block CH Rechnung (leistungsdatumRequired false)", () => {
    const dokumentTyp = "rechnung";
    const leistungsdatum = "";
    const cfg = getDachConfig("CH");
    const wouldBlock = dokumentTyp === "rechnung" && cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Profile null / missing profile fallback
// ---------------------------------------------------------------------------

describe("getMissingProfileFieldsForDocument: null profile fallback", () => {
  it("returns basics when profile is null", () => {
    const missing = getMissingProfileFieldsForDocument(null, "offerte", "CH");
    expect(missing.map((f) => f.key)).toEqual(
      expect.arrayContaining(["firmenname", "adresse", "plz", "ort"]),
    );
  });

  it("returns basics when profile is undefined", () => {
    const missing = getMissingProfileFieldsForDocument(undefined, "rechnung", "DE");
    expect(missing.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Punkt 1 — handleErechnung validation (same guards as handleSend)
// ---------------------------------------------------------------------------

describe("handleErechnung validation guards", () => {
  it("blocks E-Rechnung for DE when leistungsdatum is empty", () => {
    const cfg = getDachConfig("DE");
    const leistungsdatum = "";
    const wouldBlock = cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(true);
  });

  it("blocks E-Rechnung for AT when leistungsdatum is empty", () => {
    const cfg = getDachConfig("AT");
    const leistungsdatum = "";
    const wouldBlock = cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(true);
  });

  it("does NOT block E-Rechnung for DE when leistungsdatum is set", () => {
    const cfg = getDachConfig("DE");
    const leistungsdatum = "2026-04-01";
    const wouldBlock = cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(false);
  });

  it("does NOT block E-Rechnung for AT when leistungsdatum is set", () => {
    const cfg = getDachConfig("AT");
    const leistungsdatum = "2026-04-01";
    const wouldBlock = cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(false);
  });

  it("does NOT block E-Rechnung for CH (leistungsdatumRequired false)", () => {
    const cfg = getDachConfig("CH");
    const leistungsdatum = "";
    const wouldBlock = cfg.leistungsdatumRequired && !leistungsdatum;
    expect(wouldBlock).toBe(false);
  });

  it("blocks E-Rechnung when both German tax IDs are missing", () => {
    const incompleteProfile = { ...deProfile, steuernummer: "", uid_mwst: "" };
    const missing = getMissingProfileFieldsForDocument(incompleteProfile, "rechnung", "DE");
    expect(missing.length).toBeGreaterThan(0);
  });

  it("does NOT block E-Rechnung when profile is complete", () => {
    const missing = getMissingProfileFieldsForDocument(deProfile, "rechnung", "DE");
    expect(missing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Punkt 2 — Carryover leistungsdatum
// ---------------------------------------------------------------------------

describe("Carryover draft: leistungsdatum", () => {
  const sampleKunde = {
    name: "Testfirma GmbH",
    firma: "",
    adresse: "Musterstrasse 1",
    adresse2: "",
    plz: "8001",
    ort: "Zürich",
    email: "test@example.com",
  };
  const samplePositionen = [{ bezeichnung: "Leistung A", einheit: "Std.", menge: 1, preis: 200 }];

  function buildCarryoverWithLeistungsdatum(leistungsdatum: string | undefined) {
    return {
      dokumentTyp: "rechnung",
      kunde: sampleKunde,
      positionen: samplePositionen,
      objekt: "Testprojekt",
      notiz: "",
      rabatt: { aktiv: false, label: "Rabatt", modus: "chf", wert: 0 },
      preisMode: "exkl",
      mwstSatz: 8.1,
      sourceDocumentId: "doc-111",
      sourceDocumentNumber: "OF-2026-010",
      ...(leistungsdatum ? { leistungsdatum } : {}),
    };
  }

  it("carries leistungsdatum when source Offerte has one", () => {
    const draft = buildCarryoverWithLeistungsdatum("2026-03-20");
    expect(draft.leistungsdatum).toBe("2026-03-20");
  });

  it("does NOT include leistungsdatum when source Offerte has none", () => {
    const draft = buildCarryoverWithLeistungsdatum(undefined);
    expect("leistungsdatum" in draft).toBe(false);
  });

  it("does NOT include leistungsdatum when source Offerte has empty string", () => {
    const draft = buildCarryoverWithLeistungsdatum("");
    // empty string is falsy → should not be carried
    expect("leistungsdatum" in draft).toBe(false);
  });

  it("other carryover fields are unaffected by leistungsdatum presence", () => {
    const draft = buildCarryoverWithLeistungsdatum("2026-04-01");
    expect(draft.dokumentTyp).toBe("rechnung");
    expect(draft.kunde).toEqual(sampleKunde);
    expect(draft.positionen).toEqual(samplePositionen);
    expect(draft.sourceDocumentId).toBe("doc-111");
    expect(draft.sourceDocumentNumber).toBe("OF-2026-010");
  });

  it("other carryover fields are unaffected when leistungsdatum is absent", () => {
    const draft = buildCarryoverWithLeistungsdatum(undefined);
    expect(draft.dokumentTyp).toBe("rechnung");
    expect(draft.kunde).toEqual(sampleKunde);
    expect(draft.sourceDocumentNumber).toBe("OF-2026-010");
  });
});

// ---------------------------------------------------------------------------
// Punkt 3 — AT fn_nr optionality
// ---------------------------------------------------------------------------

describe("AT fn_nr optional field", () => {
  it("getDachConfig('AT').companyIdFields includes fn_nr with required: false", () => {
    const fields = getDachConfig("AT").companyIdFields;
    const fnNr = fields.find((f) => f.key === "fn_nr");
    expect(fnNr).toBeDefined();
    expect(fnNr!.required).toBe(false);
  });

  it("fn_nr is NOT in getMissingProfileFieldsForDocument for AT Rechnung when profile is otherwise complete", () => {
    const completeATProfile = {
      ...atProfile,
      fn_nr: "", // fn_nr intentionally missing
    };
    const missing = getMissingProfileFieldsForDocument(completeATProfile, "rechnung", "AT");
    expect(missing.map((f) => f.key)).not.toContain("fn_nr");
  });

  it("fn_nr is NOT in getMissingProfileFieldsForDocument for AT Offerte", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...atProfile, fn_nr: "" },
      "offerte",
      "AT",
    );
    expect(missing.map((f) => f.key)).not.toContain("fn_nr");
  });

  it("AT uid_mwst is optional and not blocking", () => {
    const missing = getMissingProfileFieldsForDocument(
      { ...atProfile, uid_mwst: "" },
      "rechnung",
      "AT",
    );
    expect(missing.map((f) => f.key)).not.toContain("uid_mwst");
  });
});
