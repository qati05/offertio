import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getStornoConfirmation } from "@/lib/status-transitions";
import { checkStornoTransition } from "@/lib/dokument-immutability";

/**
 * Cancelling an invoice has to be reachable from the product.
 *
 * /api/dokument/storno was built, hardened and tested — and no button anywhere
 * called it. The immutability error text tells the user in so many words
 * "Storniere sie und erstelle eine neue Rechnung", pointing at a function that
 * did not exist in the interface. The only ways out were a support call or a
 * second invoice leaving the wrong one standing.
 */

const ARCHIVE = "src/app/(app)/dokumente/page.tsx";

describe("cancelling an invoice is reachable from the archive", () => {
  const source = readFileSync(ARCHIVE, "utf8");

  it("the archive calls the storno route", () => {
    expect(source).toContain("/api/dokument/storno");
  });

  it("it decides who may cancel with the same rule the server uses", () => {
    // One truth, not two: checkStornoTransition already answers this for
    // /api/dokument/storno. A second copy in the UI would drift.
    expect(source).toContain("checkStornoTransition");
  });

  it("it asks before cancelling", () => {
    expect(source).toContain("getStornoConfirmation");
  });
});

describe("the cancellation question says what it costs", () => {
  it("names the invoice and warns that nothing can be undone", () => {
    const text = getStornoConfirmation("RE-2026-0001", "Muster Reinigung AG");
    expect(text).toContain("RE-2026-0001");
    expect(text).toContain("Muster Reinigung AG");
    expect(text).toMatch(/nicht rückgängig/);
    expect(text).toMatch(/Nummer bleibt|Rechnungsnummer bleibt/);
  });

  it("leaves out the recipient when there is none", () => {
    for (const kundenname of [null, undefined, "", "   "]) {
      const text = getStornoConfirmation("RE-1", kundenname);
      expect(text).toContain("RE-1");
      expect(text).not.toMatch(/ an\s+stornieren/);
    }
  });
});

describe("who may cancel", () => {
  it("an issued invoice may, a draft and a quotation may not", () => {
    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "gesendet" }).ok).toBe(true);
    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "bezahlt" }).ok).toBe(true);
    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "entwurf" }).ok).toBe(false);
    expect(checkStornoTransition({ typ: "offerte", currentStatus: "gesendet" }).ok).toBe(false);
  });

  it("an already cancelled invoice may not be cancelled again", () => {
    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "storniert" }).ok).toBe(false);
  });
});

describe("a cancelled invoice does not lie about its state", () => {
  const source = readFileSync(ARCHIVE, "utf8");

  it("renders a static badge instead of the dropdown", () => {
    // statusOptionsFor has no "storniert", and a controlled <select> with no
    // matching <option> shows the FIRST option — so a cancelled invoice
    // displayed as "Entwurf".
    expect(source).toContain("canEdit && !isCancelled ?");
  });

  it("hides the follow-up actions on a cancelled invoice", () => {
    // "✓ Bezahlt" was offered on cancelled invoices; the Mahnung route accepted
    // them outright.
    expect(source).toMatch(/canMarkPaid =.*!isCancelled/);
    expect(source).toMatch(/canMahnen =.*!isCancelled/);
  });
});

describe("the type system knows the status exists", () => {
  it("DokumentHistorie allows storniert", () => {
    const types = readFileSync("src/lib/types.ts", "utf8");
    expect(types).toContain('| "storniert"');
    expect(types).toContain("storniert_at");
  });
});
