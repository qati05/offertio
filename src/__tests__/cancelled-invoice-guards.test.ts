import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkStatusTransition } from "@/lib/status-transitions";

/**
 * A cancelled invoice must be inert.
 *
 * None of the three follow-up routes checked for it, and they failed in two
 * different ways — which is what made this hard to see:
 *
 *   - mark-paid and update-status set `status` without touching `storniert_at`,
 *     so the CHECK constraint from migration 033 (status='storniert' ⟺
 *     storniert_at IS NOT NULL) rejected the write. Postgres said no, the user
 *     saw an unexplained 500.
 *   - mahnung sets `status` only when the current status is "gesendet". On a
 *     cancelled invoice it leaves `status` alone, the constraint stays
 *     satisfied, and the write goes through: Mahnstufe 1, 2, 3 on a document
 *     that no longer exists.
 *
 * Both were reproduced against real Postgres by the audit's red team. The fix
 * is one rule, applied in all three routes, answering with a 409 and a German
 * sentence instead of a 500 or a silent success.
 */

const ROUTES = {
  "mark-paid": "src/app/api/dokument/mark-paid/route.ts",
  mahnung: "src/app/api/dokument/mahnung/route.ts",
  "update-status": "src/app/api/dokument/update-status/route.ts",
} as const;

describe("the rule itself", () => {
  it("refuses every follow-up on a cancelled invoice", () => {
    for (const nextStatus of ["bezahlt", "ueberfaellig", "gesendet", "entwurf"]) {
      const result = checkStatusTransition({
        typ: "rechnung",
        currentStatus: "storniert",
        nextStatus,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("cancelled_is_final");
    }
  });

  it("leaves a live invoice alone", () => {
    expect(
      checkStatusTransition({ typ: "rechnung", currentStatus: "gesendet", nextStatus: "bezahlt" }),
    ).toEqual({ ok: true });
    expect(
      checkStatusTransition({ typ: "rechnung", currentStatus: "gesendet", nextStatus: "ueberfaellig" }),
    ).toEqual({ ok: true });
  });

  it("explains the refusal in German", () => {
    const result = checkStatusTransition({
      typ: "rechnung",
      currentStatus: "storniert",
      nextStatus: "bezahlt",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/storniert/i);
      expect(result.message.length).toBeGreaterThan(30);
    }
  });
});

describe.each(Object.entries(ROUTES))("%s applies the rule", (_name, path) => {
  const source = readFileSync(path, "utf8");

  it("imports the shared guard rather than restating it", () => {
    expect(source).toContain("checkStatusTransition");
  });

  it("answers 409, not 500 and not a silent success", () => {
    expect(source).toMatch(/409/);
  });
});
