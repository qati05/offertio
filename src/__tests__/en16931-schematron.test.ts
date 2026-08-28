import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildZugferdXml } from "@/lib/zugferd-xml";
import type { OfferteData } from "@/lib/types";

/**
 * Validates the XML Offertio actually generates against the OFFICIAL EN 16931
 * rules — the compiled Schematron from ConnectingEurope/eInvoicing-EN16931, run
 * with Saxon. Nothing here reimplements a rule by hand.
 *
 * This exists because hand-written assertions only ever cover the rules someone
 * thought of. The C3 defect (a discount silently subtracted from BT-106) sat
 * behind 32 passing string-matching tests. When this harness was first pointed
 * at that same XML it reported not one violation but two: BR-CO-10 and BR-S-08.
 *
 * Not part of `npm test`: it needs a JDK and ~6.5 MB of downloaded artefacts,
 * and each document takes about a second to validate. Run
 * `npm run test:en16931`, which fetches the artefacts and sets the flag below.
 * When it cannot run it skips — it never reports success without having
 * actually validated anything.
 */

const CACHE = path.resolve(process.cwd(), ".en16931-cache");
const XSLT = path.join(CACHE, "EN16931-CII-validation.xslt");
const SAXON = path.join(CACHE, "saxon-he-10.9.jar");

// Opt-in, so the fast unit suite stays offline and JDK-free.
const enabled = process.env.EN16931_VALIDATE === "1";
const artefactsPresent = existsSync(XSLT) && existsSync(SAXON);

let workDir: string;

function hasJava(): boolean {
  try {
    execFileSync("java", ["-version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const runnable = enabled && artefactsPresent && hasJava();

/** Run the official validator and return the ids of every violated rule. */
function violations(xml: string, name: string): string[] {
  const file = path.join(workDir, `${name}.xml`);
  writeFileSync(file, xml, "utf8");

  const svrl = execFileSync(
    "java",
    ["-cp", SAXON, "net.sf.saxon.Transform", `-s:${file}`, `-xsl:${XSLT}`],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
  );

  // A run that produced no SVRL at all means the processor failed, not that the
  // document is clean. Treating that as "valid" is exactly how a broken
  // validator hides real defects, so fail loudly instead.
  if (!svrl.includes("schematron-output")) {
    throw new Error(`Validator produced no SVRL for ${name}. Output:\n${svrl.slice(0, 800)}`);
  }

  return [
    ...new Set(
      [...svrl.matchAll(/<svrl:failed-assert[\s\S]*?<svrl:text>([\s\S]*?)<\/svrl:text>/g)]
        .map((m) => /\[([A-Z0-9-]+)\]/.exec(m[1])?.[1])
        .filter((id): id is string => Boolean(id)),
    ),
  ].sort();
}

// ── Fixtures: the document shapes Offertio can produce today ────────────────

const seller = {
  firmenname: "Bau GmbH",
  adresse: "Hauptstrasse 1",
  plz: "10115",
  ort: "Berlin",
  land: "DE",
  steuernummer: "13/123/12345",
  uid_mwst: "DE123456789",
  iban: "DE02120300000000202051",
  bic: "COBADEFFXXX",
  zahlungsfrist: 30,
};

function invoice(overrides: Record<string, unknown> = {}): OfferteData {
  const data = {
    nummer: "R-2026-001",
    datum: "2026-03-01",
    mwstSatz: 19,
    profil: { ...seller },
    kunde: {
      name: "Kunde AG",
      adresse: "Weg 2",
      plz: "80331",
      ort: "München",
      uid_mwst: "DE987654321",
    },
    positionen: [
      { bezeichnung: "Leistung A", menge: 1, preis: 1000 },
      { bezeichnung: "Leistung B", menge: 2, preis: 500 },
    ],
    ...overrides,
  };
  return data as unknown as OfferteData;
}

function kleinunternehmer(extra: Record<string, unknown> = {}): OfferteData {
  return invoice({
    mwstSatz: 0,
    profil: { ...seller, kleinunternehmer: true },
    ...extra,
  });
}

/**
 * Rule violations that Offertio's output currently produces, with the decision
 * behind each. The test asserts the ACTUAL set equals this set — so a new
 * defect fails the build, and fixing a known one also fails it, forcing this
 * list to be kept honest rather than quietly growing.
 */
const KNOWN_GAPS: Record<string, { rules: string[]; why: string }> = {
  "zero-rated": {
    rules: ["BR-Z-10"],
    why:
      "zugferd-xml.ts emits ExemptionReason 'Nullsatz' for a 0% rate. BR-Z-10 " +
      "forbids an exemption reason on category Z — the opposite of category E, " +
      "where BR-E-10 requires one. Reported, not yet fixed.",
  },
  "seller-without-vat-id": {
    rules: ["BR-CO-26"],
    why:
      "A seller carrying only a Steuernummer (schemeID FC) fails BR-CO-26, which " +
      "accepts BT-29, BT-30 or BT-31 (schemeID VA) — not FC. dach.ts treats " +
      "Steuernummer and USt-IdNr. as interchangeable per §14 Abs. 4 Nr. 2 UStG, " +
      "which holds for a paper invoice but not for an EN 16931 e-invoice. " +
      "Reported, not yet fixed.",
  },
};

describe.skipIf(!runnable)("EN 16931 · official Schematron validation", () => {
  beforeAll(() => {
    workDir = mkdtempSync(path.join(tmpdir(), "en16931-"));
  });

  describe("document shapes that must be clean", () => {
    const clean: Array<[string, OfferteData]> = [
      ["standard 19%", invoice()],
      ["reduced rate 7%", invoice({ mwstSatz: 7 })],
      ["percentage discount", invoice({ rabatt: { aktiv: true, modus: "prozent", wert: 10 } })],
      ["fixed discount", invoice({ rabatt: { aktiv: true, modus: "chf", wert: 250 } })],
      ["inactive discount", invoice({ rabatt: { aktiv: false, modus: "prozent", wert: 10 } })],
      ["Kleinunternehmer", kleinunternehmer()],
      [
        "Kleinunternehmer with discount",
        kleinunternehmer({ rabatt: { aktiv: true, modus: "prozent", wert: 10 } }),
      ],
      [
        "amounts that do not divide evenly",
        invoice({
          positionen: [
            { bezeichnung: "A", menge: 3, preis: 33.33 },
            { bezeichnung: "B", menge: 7, preis: 1.11 },
          ],
          rabatt: { aktiv: true, modus: "prozent", wert: 7.5 },
        }),
      ],
      ["no BIC", invoice({ profil: { ...seller, bic: undefined } })],
      ["single line item", invoice({ positionen: [{ bezeichnung: "Nur eine", menge: 1, preis: 500 }] })],
      ["buyer without VAT id", invoice({ kunde: { name: "Privat AG", adresse: "Weg 2", plz: "80331", ort: "München" } })],
      // §13b Abs. 2 Nr. 4 — reverse charge. Exercises the whole BR-AE family
      // (BR-AE-01 through BR-AE-10) against the official rules.
      ["reverse charge §13b", invoice({ steuerfall: "reverse_charge_13b_4", mwstSatz: 0 })],
      [
        "reverse charge §13b with a discount",
        invoice({
          steuerfall: "reverse_charge_13b_4",
          mwstSatz: 0,
          rabatt: { aktiv: true, modus: "prozent", wert: 10 },
        }),
      ],
      [
        "reverse charge §13b with a fixed discount",
        invoice({
          steuerfall: "reverse_charge_13b_4",
          mwstSatz: 0,
          rabatt: { aktiv: true, modus: "chf", wert: 250 },
        }),
      ],
    ];

    it.each(clean)("%s produces no rule violations", (_label, data) => {
      expect(violations(buildZugferdXml(data, "2026-02-28"), "clean")).toEqual([]);
    });
  });

  describe("known gaps — reported, awaiting a decision", () => {
    it("zero-rated invoice still carries a forbidden exemption reason", () => {
      const xml = buildZugferdXml(invoice({ mwstSatz: 0 }), "2026-02-28");
      expect(violations(xml, "zero-rated")).toEqual(KNOWN_GAPS["zero-rated"].rules);
    });

    it("seller with only a Steuernummer is not identifiable to EN 16931", () => {
      const xml = buildZugferdXml(
        invoice({ profil: { ...seller, uid_mwst: undefined } }),
        "2026-02-28",
      );
      expect(violations(xml, "seller-without-vat-id")).toEqual(
        KNOWN_GAPS["seller-without-vat-id"].rules,
      );
    });
  });

  describe("the harness itself detects violations", () => {
    it("catches the C3 defect when it is reintroduced", () => {
      // Negative control. Without this, a validator that silently fails to run
      // would report every document as clean and this whole file would be
      // theatre. Reconstructs the pre-C3 shape: the discount subtracted from
      // BT-106 with no allowance element.
      const good = buildZugferdXml(
        invoice({ rabatt: { aktiv: true, modus: "prozent", wert: 10 } }),
        "2026-02-28",
      );
      const broken = good
        .replace(/\s*<ram:SpecifiedTradeAllowanceCharge>[\s\S]*?<\/ram:SpecifiedTradeAllowanceCharge>/, "")
        .replace(/\s*<ram:AllowanceTotalAmount>[\d.]+<\/ram:AllowanceTotalAmount>/, "")
        .replace(
          "<ram:LineTotalAmount>2000.00</ram:LineTotalAmount>",
          "<ram:LineTotalAmount>1800.00</ram:LineTotalAmount>",
        );

      const found = violations(broken, "negative-control");
      expect(found).toContain("BR-CO-10");
      expect(found).toContain("BR-S-08");
    });
  });
});

describe.skipIf(runnable)("EN 16931 · official Schematron validation (disabled)", () => {
  it("runs via `npm run test:en16931`, not as part of the unit suite", () => {
    // Deliberately not a failure: the unit suite must stay runnable without a
    // JDK. The opt-in flag is what makes the difference visible, so a green
    // `npm test` is never mistaken for "the XML was validated".
    expect(runnable).toBe(false);
  });
});
