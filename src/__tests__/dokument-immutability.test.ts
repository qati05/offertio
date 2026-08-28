import { describe, it, expect } from "vitest";
import {
  ISSUED_STATUSES,
  isIssued,
  checkContentEdit,
  checkStornoTransition,
  type DokumentStatus,
} from "@/lib/dokument-immutability";

/**
 * An issued invoice is a document someone else now holds. Its amount,
 * positions, number and customer must not change afterwards — a correction is
 * made by cancelling and issuing anew, never by silently rewriting the
 * original.
 *
 * Offerten are deliberately NOT locked: a quotation creates no tax liability
 * and revising one before it is accepted is ordinary business.
 */
describe("immutability · which statuses count as issued", () => {
  it("treats a draft as still editable", () => {
    expect(isIssued("entwurf")).toBe(false);
  });

  it("treats every post-draft status as issued", () => {
    for (const status of ["gesendet", "angenommen", "bezahlt", "ueberfaellig", "abgelaufen", "storniert"] as DokumentStatus[]) {
      expect(isIssued(status), status).toBe(true);
    }
  });

  it("treats an unknown or missing status as issued", () => {
    // Fail closed: an unrecognised status must never unlock a document.
    expect(isIssued(undefined)).toBe(true);
    expect(isIssued(null)).toBe(true);
    expect(isIssued("something-new")).toBe(true);
  });

  it("lists the issued statuses explicitly", () => {
    expect(ISSUED_STATUSES).toContain("gesendet");
    expect(ISSUED_STATUSES).not.toContain("entwurf");
  });
});

describe("immutability · editing document content", () => {
  it("allows editing a draft invoice", () => {
    expect(checkContentEdit({ typ: "rechnung", currentStatus: "entwurf" })).toEqual({ ok: true });
  });

  it("refuses to overwrite a sent invoice", () => {
    const result = checkContentEdit({ typ: "rechnung", currentStatus: "gesendet" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invoice_issued");
      expect(result.message).toMatch(/storn/i);
    }
  });

  it("refuses for every issued status, not just gesendet", () => {
    for (const status of ["angenommen", "bezahlt", "ueberfaellig", "abgelaufen"] as DokumentStatus[]) {
      expect(checkContentEdit({ typ: "rechnung", currentStatus: status }).ok, status).toBe(false);
    }
  });

  it("refuses to edit a cancelled invoice", () => {
    const result = checkContentEdit({ typ: "rechnung", currentStatus: "storniert" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invoice_cancelled");
  });

  it("still allows revising a sent Offerte", () => {
    // A quotation creates no tax liability; revising it before acceptance is
    // ordinary business, not a rewrite of a legal record.
    expect(checkContentEdit({ typ: "offerte", currentStatus: "gesendet" })).toEqual({ ok: true });
    expect(checkContentEdit({ typ: "offerte", currentStatus: "angenommen" })).toEqual({ ok: true });
  });

  it("fails closed on an unknown status for an invoice", () => {
    expect(checkContentEdit({ typ: "rechnung", currentStatus: "who-knows" }).ok).toBe(false);
  });

  it("allows creating a brand new document", () => {
    // No existing row means nothing to protect.
    expect(checkContentEdit({ typ: "rechnung", currentStatus: null })).toEqual({ ok: true });
  });
});

describe("immutability · cancelling an invoice", () => {
  it("allows cancelling a sent invoice", () => {
    expect(checkStornoTransition({ typ: "rechnung", currentStatus: "gesendet" })).toEqual({ ok: true });
  });

  it("allows cancelling a paid or overdue invoice", () => {
    for (const status of ["bezahlt", "ueberfaellig", "angenommen"] as DokumentStatus[]) {
      expect(checkStornoTransition({ typ: "rechnung", currentStatus: status }).ok, status).toBe(true);
    }
  });

  it("refuses to cancel a draft", () => {
    // A draft was never issued, so there is nothing to cancel — it is deleted.
    const result = checkStornoTransition({ typ: "rechnung", currentStatus: "entwurf" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_issued");
  });

  it("refuses to cancel twice", () => {
    const result = checkStornoTransition({ typ: "rechnung", currentStatus: "storniert" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("already_cancelled");
  });

  it("refuses to cancel an Offerte", () => {
    // Offerten are withdrawn or expire; Storno is an invoice concept.
    const result = checkStornoTransition({ typ: "offerte", currentStatus: "gesendet" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_an_invoice");
  });

  it("explains every refusal in German", () => {
    for (const input of [
      { typ: "rechnung" as const, currentStatus: "entwurf" },
      { typ: "rechnung" as const, currentStatus: "storniert" },
      { typ: "offerte" as const, currentStatus: "gesendet" },
    ]) {
      const result = checkStornoTransition(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(20);
    }
  });
});

describe("immutability · status changes on a cancelled invoice", () => {
  it("is terminal — nothing may follow storniert", () => {
    const result = checkContentEdit({ typ: "rechnung", currentStatus: "storniert" });
    expect(result.ok).toBe(false);
  });
});
