import { describe, it, expect } from "vitest";
import { classifySaveResponse } from "@/lib/send-outcome";

/**
 * Every refusal /api/dokument/save can return, and what the send flow must do
 * with it. Before this module all of these produced the same silent
 * `cloudSaved = false` and a confetti success page — the user was told the
 * document was on its way while the server had refused it.
 *
 * The status codes and messages below are the ones the route really returns
 * (src/app/api/dokument/save/route.ts).
 */

const REFUSALS = [
  [400, "Leistungsdatum ist für Rechnungen in DE/AT gesetzlich erforderlich."],
  [400, "Für Schweizer Rechnungen mit MWST ist die eigene UID-Nummer erforderlich (Art. 26 Abs. 2 lit. a MWSTG)."],
  [400, "Preise dürfen höchstens zwei Nachkommastellen haben."],
  [403, "Monatslimit erreicht"],
  [409, "Diese Rechnung wurde bereits gestellt und kann nicht mehr geändert werden."],
  [422, "Reverse Charge ist auf einer Offerte nicht zulässig."],
  [429, "Zu viele Anfragen. Bitte kurz warten."],
] as const;

describe("send outcome · the server refused the document", () => {
  it.each(REFUSALS)("aborts on %i and shows the server's own wording", (status, error) => {
    const outcome = classifySaveResponse({ ok: false, status, body: { error } });
    expect(outcome.action).toBe("abort");
    if (outcome.action === "abort") expect(outcome.message).toBe(error);
  });

  it("never delivers a document the server refused", () => {
    // The PDF must not reach the customer: the invoice number is already burnt
    // and the archive would have no matching row, so the customer would hold an
    // invoice that does not exist in the system.
    for (const [status, error] of REFUSALS) {
      expect(classifySaveResponse({ ok: false, status, body: { error } }).action).not.toBe(
        "deliver",
      );
    }
  });

  it("still says something useful when the body carries no message", () => {
    const outcome = classifySaveResponse({ ok: false, status: 400, body: null });
    expect(outcome.action).toBe("abort");
    if (outcome.action === "abort") expect(outcome.message.length).toBeGreaterThan(20);
  });

  it("ignores a non-string error field rather than printing [object Object]", () => {
    const outcome = classifySaveResponse({
      ok: false,
      status: 400,
      body: { error: { code: "nope" } },
    });
    expect(outcome.action).toBe("abort");
    if (outcome.action === "abort") expect(outcome.message).not.toContain("object");
  });
});

describe("send outcome · the server was unreachable or broke", () => {
  it("delivers locally when the fetch itself threw", () => {
    expect(classifySaveResponse({ networkError: true })).toEqual({
      action: "deliver_offline",
    });
  });

  it("delivers locally on 5xx — the document is sound, the server is not", () => {
    for (const status of [500, 502, 503]) {
      expect(classifySaveResponse({ ok: false, status, body: { error: "Server-Fehler" } })).toEqual(
        { action: "deliver_offline" },
      );
    }
  });

  it("delivers locally when the PDF stored but the row did not", () => {
    // 200 with metadataStored:false — there is no addressable document, so
    // there is no share link to put in the email.
    expect(
      classifySaveResponse({ ok: true, status: 200, body: { metadataStored: false } }),
    ).toEqual({ action: "deliver_offline" });
  });
});

describe("send outcome · the save succeeded", () => {
  const body = {
    document: {
      id: "doc-1",
      nummer: "RE-2026-0001",
      share_token: "0f8f0b1a-1111-4222-8333-444455556666",
      customer_id: "cus-1",
      source_document_nummer: "OF-2026-0007",
    },
  };

  it("hands back the server's copy of the document", () => {
    const outcome = classifySaveResponse({ ok: true, status: 200, body });
    expect(outcome).toEqual({ action: "deliver", document: body.document });
  });

  it("tolerates a success response with no document block", () => {
    const outcome = classifySaveResponse({ ok: true, status: 200, body: {} });
    expect(outcome.action).toBe("deliver");
    if (outcome.action === "deliver") {
      expect(outcome.document.share_token).toBeNull();
      expect(outcome.document.nummer).toBeNull();
    }
  });
});

describe("send outcome · the send flow actually uses this decision", () => {
  it("handleSend classifies the save response instead of discarding it", async () => {
    // Guards the wiring, not the logic. The bug was never in a helper — it was
    // that handleSend called saveRes.json() and dropped the result on the
    // floor. A pure module nobody calls would leave that untouched.
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/app/(app)/dokument/neu/page.tsx", "utf8");
    expect(source).toContain("classifySaveResponse");
  });

  it("does not hand the PDF to the customer before the save is settled", async () => {
    // downloadBlob / trySharePdf must not run above the save call: a refused
    // save would otherwise leave the customer holding an invoice the system has
    // no record of, with the number already burnt.
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/app/(app)/dokument/neu/page.tsx", "utf8");
    const saveCall = source.indexOf('fetch("/api/dokument/save"');
    const sendStart = source.indexOf("async function handleSend()");
    expect(sendStart).toBeGreaterThan(-1);
    expect(saveCall).toBeGreaterThan(sendStart);

    const beforeSave = source.slice(sendStart, saveCall);
    expect(beforeSave).not.toContain("downloadBlob(");
    expect(beforeSave).not.toContain("trySharePdf(");
  });
});
