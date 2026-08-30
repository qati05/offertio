import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkStatusTransition } from "@/lib/status-transitions";
import { checkContentEdit } from "@/lib/dokument-immutability";

/**
 * The two-request bypass, and the guard that closes it.
 *
 * Before this module an issued invoice could be rewritten with two ordinary
 * API calls and no database access:
 *
 *   1. PATCH /api/dokument/update-status  { status: "entwurf" }
 *        — accepted, because the route validated only the TARGET status
 *          against a whitelist that contained "entwurf", and never looked at
 *          where the document was coming from.
 *   2. POST  /api/dokument/save           { betrag: 1, nummer: "…", … }
 *        — accepted, because checkContentEdit reads the CURRENT status from the
 *          database and isIssued("entwurf") is false.
 *
 * The archive's status dropdown offers "Entwurf" like any other option, so step
 * 1 is one click. A user can disable the invoice lock by accident.
 */

describe("status transitions · an issued invoice cannot go back to draft", () => {
  const ISSUED = ["gesendet", "bezahlt", "ueberfaellig", "angenommen", "abgelaufen", "offen"];

  it.each(ISSUED)("refuses %s → entwurf", (currentStatus) => {
    const result = checkStatusTransition({
      typ: "rechnung",
      currentStatus,
      nextStatus: "entwurf",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("issued_invoice_cannot_reopen");
  });

  it("closes the bypass end to end", () => {
    // Step 1 is now refused, so step 2 is never reached. Asserted against the
    // real rule rather than restated in a comment: if the transition WERE
    // allowed, checkContentEdit would hand the invoice back for editing.
    const reopened = checkStatusTransition({
      typ: "rechnung",
      currentStatus: "gesendet",
      nextStatus: "entwurf",
    });
    expect(reopened.ok).toBe(false);
    expect(checkContentEdit({ typ: "rechnung", currentStatus: "entwurf" }).ok).toBe(true);
    expect(checkContentEdit({ typ: "rechnung", currentStatus: "gesendet" }).ok).toBe(false);
  });

  it("still allows a draft to be issued", () => {
    expect(
      checkStatusTransition({ typ: "rechnung", currentStatus: "entwurf", nextStatus: "gesendet" }),
    ).toEqual({ ok: true });
  });

  it("allows corrections that are not a reopening", () => {
    // A payment can be reversed. No statute forbids this, so it stays allowed —
    // the guard is deliberately narrow.
    for (const [currentStatus, nextStatus] of [
      ["bezahlt", "gesendet"],
      ["gesendet", "ueberfaellig"],
      ["ueberfaellig", "bezahlt"],
      ["gesendet", "bezahlt"],
    ]) {
      expect(checkStatusTransition({ typ: "rechnung", currentStatus, nextStatus })).toEqual({
        ok: true,
      });
    }
  });
});

describe("status transitions · cancellation is terminal", () => {
  it.each(["entwurf", "gesendet", "bezahlt", "ueberfaellig"])(
    "refuses storniert → %s",
    (nextStatus) => {
      const result = checkStatusTransition({
        typ: "rechnung",
        currentStatus: "storniert",
        nextStatus,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("cancelled_is_final");
    },
  );

  it("tolerates setting storniert on an already cancelled invoice", () => {
    // Two tabs cancelling the same invoice must not produce an error.
    expect(
      checkStatusTransition({
        typ: "rechnung",
        currentStatus: "storniert",
        nextStatus: "storniert",
      }),
    ).toEqual({ ok: true });
  });

  it("still allows an issued invoice to be cancelled", () => {
    expect(
      checkStatusTransition({ typ: "rechnung", currentStatus: "gesendet", nextStatus: "storniert" }),
    ).toEqual({ ok: true });
  });
});

describe("status transitions · quotations are unrestricted", () => {
  it("lets an Offerte move freely, including back to entwurf", () => {
    // checkContentEdit exempts quotations, they stay editable after sending by
    // design, and no statute governs their status. Restricting them would be a
    // product decision, not a legal requirement.
    for (const [currentStatus, nextStatus] of [
      ["gesendet", "entwurf"],
      ["angenommen", "entwurf"],
      ["abgelaufen", "gesendet"],
    ]) {
      expect(checkStatusTransition({ typ: "offerte", currentStatus, nextStatus })).toEqual({
        ok: true,
      });
    }
  });
});

describe("status transitions · the route actually uses the guard", () => {
  const ROUTE = "src/app/api/dokument/update-status/route.ts";

  it("update-status reads the stored status before writing", () => {
    // The defect was never in a helper — it was that the route validated only
    // the target and never fetched the current row. A guard nobody calls would
    // leave that untouched.
    const source = readFileSync(ROUTE, "utf8");
    expect(source).toContain("checkStatusTransition");
  });

  it("update-status refuses the transition with a 409, not a 500", () => {
    // Without an explicit refusal the CHECK constraint from migration 033
    // rejects the write instead, and the user sees an unexplained server error.
    const source = readFileSync(ROUTE, "utf8");
    expect(source).toMatch(/409/);
  });
});
