import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * "Als Entwurf speichern", then "Senden", must update the one document — not
 * create a second one.
 *
 * saveDraft passes `existingDocumentId: cloudDraftId`, so the route takes its
 * UPDATE branch. handleSend omitted it, so the route took the INSERT branch
 * instead, and three things went wrong at once:
 *
 *   1. resolveUniqueNummer (api/dokument/save) excludes the CURRENT document
 *      from the taken-numbers set via `doc.id !== currentDocumentId`. With no
 *      id to exclude, the draft's own number counted as taken and the invoice
 *      was renumbered to "<nummer>-1" — after the PDF carrying the original
 *      number had already gone to the customer.
 *   2. The free-plan quota is charged only `if (!existingDocumentId)`, so one
 *      invoice consumed two of the five monthly documents.
 *   3. The orphaned draft stayed in the archive with no way to open or delete
 *      it.
 *
 * This is a source-level guard because the defect was a missing field in a
 * fetch body, not a wrong result from a function: there is nothing to call.
 * The assertion is deliberately narrow — it reads the save call inside
 * handleSend and nothing else.
 */

const SOURCE = readFileSync("src/app/(app)/dokument/neu/page.tsx", "utf8");

/** The body of the /api/dokument/save call inside a given function. */
function saveCallBody(functionSignature: string): string {
  const start = SOURCE.indexOf(functionSignature);
  expect(start, `${functionSignature} not found`).toBeGreaterThan(-1);
  const call = SOURCE.indexOf('fetch("/api/dokument/save"', start);
  expect(call, `no save call in ${functionSignature}`).toBeGreaterThan(-1);
  // The body literal ends at the closing "})" of the fetch options.
  return SOURCE.slice(call, SOURCE.indexOf("});", call));
}

describe("send reuses the cloud draft instead of creating a second document", () => {
  it("handleSend sends existingDocumentId", () => {
    expect(saveCallBody("async function handleSend()")).toContain(
      "existingDocumentId: cloudDraftId",
    );
  });

  it("saveDraft still sends it too", () => {
    // The behaviour handleSend was missing. If this ever regresses, every
    // repeated draft save would start creating documents.
    expect(saveCallBody("async function saveDraft(")).toContain(
      "existingDocumentId: cloudDraftId",
    );
  });

  it("the route only charges quota when there is no existing document", () => {
    // The other half of the double-charge: the guard this fix relies on.
    const route = readFileSync("src/app/api/dokument/save/route.ts", "utf8");
    expect(route).toContain("if (!existingDocumentId)");
  });

  it("the route excludes the current document when resolving the number", () => {
    // Without this, passing existingDocumentId would prevent the duplicate but
    // still renumber the invoice.
    const route = readFileSync("src/app/api/dokument/save/route.ts", "utf8");
    expect(route).toContain("doc.id !== currentDocumentId");
    expect(route).toContain("resolveUniqueNummer(nummer, existingDocumentId");
  });
});
