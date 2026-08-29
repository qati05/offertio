import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getSendConfirmation } from "@/lib/send-confirmation";
import { checkContentEdit, checkStornoTransition } from "@/lib/dokument-immutability";

/**
 * Sending must actually mark the document as issued.
 *
 * handleSend wrote `status: "entwurf"` on the send path, and nothing anywhere
 * flipped it afterwards. Every downstream rule keys on "gesendet", so the whole
 * post-send lifecycle was inert:
 *
 *   - the recipient page told the customer "noch nicht freigegeben"
 *   - checkContentEdit never engaged, so an issued invoice stayed editable
 *   - Storno was impossible: checkStornoTransition answers not_issued
 *   - "Bezahlt" and Mahnung buttons never appeared
 *   - an invoice never became überfällig
 *
 * The assertions below pin both halves: the status the send path writes, and
 * the fact that this status is what unlocks the lifecycle.
 */

const SOURCE = readFileSync("src/app/(app)/dokument/neu/page.tsx", "utf8");

function saveCallBody(functionSignature: string): string {
  const start = SOURCE.indexOf(functionSignature);
  expect(start, `${functionSignature} not found`).toBeGreaterThan(-1);
  const call = SOURCE.indexOf('fetch("/api/dokument/save"', start);
  expect(call, `no save call in ${functionSignature}`).toBeGreaterThan(-1);
  return SOURCE.slice(call, SOURCE.indexOf("});", call));
}

describe("sending marks the document as issued", () => {
  it("handleSend saves the document as gesendet", () => {
    expect(saveCallBody("async function handleSend()")).toContain('status: "gesendet"');
  });

  it("saveDraft still saves as entwurf", () => {
    // "Als Entwurf speichern" must not freeze the document.
    expect(saveCallBody("async function saveDraft(")).toContain('status: "entwurf"');
  });

  it("gesendet is what actually unlocks the lifecycle", () => {
    // The reason the one-word change matters, asserted against the real rules
    // rather than restated in a comment.
    expect(checkContentEdit({ typ: "rechnung", currentStatus: "entwurf" }).ok).toBe(true);
    expect(checkContentEdit({ typ: "rechnung", currentStatus: "gesendet" }).ok).toBe(false);

    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "entwurf" }).ok).toBe(false);
    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "gesendet" }).ok).toBe(true);
  });

  it("an Offerte stays editable after it is sent", () => {
    // Immutability is an invoice rule. A quotation is renegotiable by nature.
    expect(checkContentEdit({ typ: "offerte", currentStatus: "gesendet" }).ok).toBe(true);
  });
});

describe("the user is warned before an invoice becomes unchangeable", () => {
  it("asks for confirmation on an invoice and says why", () => {
    const confirmation = getSendConfirmation({ typ: "rechnung", nummer: "RE-2026-0001" });
    expect(confirmation.required).toBe(true);
    expect(confirmation.message).toContain("RE-2026-0001");
    expect(confirmation.message).toMatch(/nicht mehr geändert/);
    expect(confirmation.message).toMatch(/Stornierung/);
  });

  it("names the recipient so the right document is confirmed", () => {
    const confirmation = getSendConfirmation({
      typ: "rechnung",
      nummer: "RE-2026-0002",
      kundenname: "Muster Reinigung AG",
    });
    expect(confirmation.message).toContain("Muster Reinigung AG");
  });

  it("leaves out the recipient when there is none, without a dangling 'an'", () => {
    for (const kundenname of [null, undefined, "", "   "]) {
      const confirmation = getSendConfirmation({ typ: "rechnung", nummer: "RE-1", kundenname });
      expect(confirmation.message).not.toMatch(/ an\s*\?/);
      expect(confirmation.message).toContain("RE-1");
    }
  });

  it("does not claim an Offerte becomes unchangeable", () => {
    // checkContentEdit exempts quotations, so such a warning would be untrue.
    const confirmation = getSendConfirmation({ typ: "offerte", nummer: "OF-2026-0001" });
    expect(confirmation.required).toBe(false);
    expect(confirmation.message).not.toMatch(/unveränder|nicht mehr geändert/);
  });

  it("handleSend asks before sending", () => {
    // Guards the wiring: the helper is worthless if nothing calls it.
    const start = SOURCE.indexOf("async function handleSend()");
    const save = SOURCE.indexOf('fetch("/api/dokument/save"', start);
    const beforeSave = SOURCE.slice(start, save);
    expect(beforeSave).toContain("getSendConfirmation");
  });
});

describe("the local archive cache agrees with what was saved", () => {
  it("writes gesendet into dokument-history, not entwurf", () => {
    // The archive seeds its list from this cache before the server answers, so
    // a stale status here shows the wrong state on every first paint — and
    // stays wrong while the user is offline.
    const start = SOURCE.indexOf('localStorage.getItem("dokument-history"');
    expect(start).toBeGreaterThan(-1);
    const entry = SOURCE.slice(start, SOURCE.indexOf("history.slice(0, 100)", start));
    expect(entry).toContain('status: "gesendet"');
    expect(entry).not.toContain('status: "entwurf"');
  });
});
