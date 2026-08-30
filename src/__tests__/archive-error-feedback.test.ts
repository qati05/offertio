import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkStatusTransition } from "@/lib/status-transitions";

/**
 * A refused action has to say why.
 *
 * The new guards answer 409 with a German sentence — and every one of those
 * sentences went nowhere. All four row actions reverted their optimistic update
 * in silence: `if (!res.ok) setHistory(revert)`. The user saw the label flicker
 * to the new value and jump back, with no explanation. For a cleaning company
 * that reads as a broken app, not as a deliberate rule.
 *
 * Worse for the status dropdown, which offered "Entwurf" on an issued invoice
 * like any other option — an action the server will always refuse, presented as
 * a normal choice.
 */

const ARCHIVE = readFileSync("src/app/(app)/dokumente/page.tsx", "utf8");

/** The body of a named handler, up to its dependency array. */
function handler(name: string): string {
  const start = ARCHIVE.indexOf(`const ${name} = useCallback(`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  return ARCHIVE.slice(start, ARCHIVE.indexOf("[source]", start));
}

describe.each(["handleStatusChange", "handleMarkPaid", "handleMahnung", "handleStorno"])(
  "%s reports failures",
  (name) => {
    const body = handler(name);

    it("shows the server's own message", () => {
      expect(body).toMatch(/setToast\(\s*body\?\.error/);
    });

    it("says something when the request never arrived", () => {
      expect(body).toMatch(/catch[\s\S]*?setToast\(/);
    });
  },
);

describe("the dropdown offers only transitions the server accepts", () => {
  it("filters its options through the shared rule", () => {
    // Read the function body specifically — a loose distance regex would pass
    // on any nearby mention, which is the kind of weak assertion that let an
    // earlier gap through in this same session.
    const start = ARCHIVE.indexOf("function statusOptionsFor(");
    expect(start).toBeGreaterThan(-1);
    const body = ARCHIVE.slice(start, ARCHIVE.indexOf("\n}", start));
    expect(body).toContain("checkStatusTransition");
  });

  it("passes the document's current status in", () => {
    expect(ARCHIVE).toContain("statusOptionsFor(doc.typ, doc.status)");
  });

  it("would drop entwurf for an issued invoice", () => {
    // The rule the filter relies on, asserted directly: this is what makes the
    // option disappear rather than fail on click.
    expect(
      checkStatusTransition({ typ: "rechnung", currentStatus: "gesendet", nextStatus: "entwurf" })
        .ok,
    ).toBe(false);
    expect(
      checkStatusTransition({ typ: "rechnung", currentStatus: "entwurf", nextStatus: "gesendet" })
        .ok,
    ).toBe(true);
  });

  it("leaves a quotation's options alone", () => {
    expect(
      checkStatusTransition({ typ: "offerte", currentStatus: "gesendet", nextStatus: "entwurf" })
        .ok,
    ).toBe(true);
  });
});
