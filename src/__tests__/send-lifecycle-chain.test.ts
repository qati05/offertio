import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkContentEdit, checkStornoTransition } from "@/lib/dokument-immutability";
import { checkStatusTransition } from "@/lib/status-transitions";
import { computeDocumentStatus, STATUS_MAP, isMahnungCandidate } from "@/lib/dokument-status";
import type { DokumentHistorie } from "@/lib/types";

/**
 * The one test that would have caught all four send-path blockers at once.
 *
 * 883 tests were green while sending wrote `status: "entwurf"` and every rule
 * downstream keyed on "gesendet". The recipient was told the document had not
 * been released, immutability never engaged, Storno was impossible, Bezahlt and
 * Mahnung never appeared, and nothing ever went overdue.
 *
 * None of the existing tests could see it, because each one fed its module a
 * status string it had invented itself. Four tests, four consumers, four
 * assumptions — and the one thing nobody checked was whether the value the
 * WRITE produces is the value the READS expect.
 *
 * So this test does not invent a status. It reads the literal out of the send
 * path and pushes that exact value through every consumer. The negative control
 * at the bottom runs the same chain against the old value and shows the failures
 * it would have produced — evidence that this test bites, rather than a claim
 * that it does.
 */

const SEND_PATH = readFileSync("src/app/(app)/dokument/neu/page.tsx", "utf8");
const RECIPIENT = readFileSync("src/app/view/[token]/RecipientViewClient.tsx", "utf8");

/** The status literal the send path actually writes — read, not assumed. */
function statusWrittenBySend(): string {
  const start = SEND_PATH.indexOf("async function handleSend()");
  const call = SEND_PATH.indexOf('fetch("/api/dokument/save"', start);
  const body = SEND_PATH.slice(call, SEND_PATH.indexOf("});", call));
  const match = body.match(/\bstatus:\s*"([a-z]+)"/);
  expect(match, "handleSend must write a status literal").not.toBeNull();
  return match![1];
}

/** The status the recipient page requires before it lets the customer act. */
function statusRecipientRequires(): string {
  const match = RECIPIENT.match(/canAct\s*=[^;]*doc\.status === "([a-z]+)"/);
  expect(match, "the recipient gate must compare against a status").not.toBeNull();
  return match![1];
}

function invoice(status: string): DokumentHistorie {
  return {
    id: "doc-1",
    typ: "rechnung",
    nummer: "RE-2026-0001",
    kundenname: "Muster Reinigung AG",
    betrag: 1500,
    // Well past any payment term, so "overdue" depends only on the status.
    datum: "2026-01-01",
    status: status as DokumentHistorie["status"],
    mahnstufe: 0,
  };
}

/** Every consumer of the status, asked about one written value. */
function lifecycle(status: string) {
  const doc = invoice(status);
  const effective = computeDocumentStatus(doc, 30);
  return {
    recipientMayAct: status === statusRecipientRequires(),
    contentIsLocked: !checkContentEdit({ typ: "rechnung", currentStatus: status }).ok,
    mayBeCancelled: checkStornoTransition({ typ: "rechnung", currentStatus: status }).ok,
    mayBeMarkedPaid: checkStatusTransition({
      typ: "rechnung",
      currentStatus: status,
      nextStatus: "bezahlt",
    }).ok,
    goesOverdue: effective.status === "ueberfaellig",
    canBeDunned: isMahnungCandidate(effective, 30),
    // Its own entry, not the "offen" fallback. Comparing labels would not do:
    // "gesendet" and "offen" deliberately share the label "Ausstehend".
    hasItsOwnLabel: Object.prototype.hasOwnProperty.call(STATUS_MAP, status),
  };
}

describe("the status the send path writes drives the whole lifecycle", () => {
  const written = statusWrittenBySend();

  it("writes a status at all", () => {
    expect(written).toBeTruthy();
  });

  it("unlocks every consumer", () => {
    // Read as one object so a failure names every consumer that disagrees,
    // not just the first.
    expect(lifecycle(written)).toEqual({
      recipientMayAct: true,
      contentIsLocked: true,
      mayBeCancelled: true,
      mayBeMarkedPaid: true,
      goesOverdue: true,
      canBeDunned: true,
      hasItsOwnLabel: true,
    });
  });

  it("is the status the recipient page waits for", () => {
    expect(written).toBe(statusRecipientRequires());
  });

  it("is not what saveDraft writes", () => {
    // Saving a draft must not start the lifecycle.
    const start = SEND_PATH.indexOf("async function saveDraft(");
    const call = SEND_PATH.indexOf('fetch("/api/dokument/save"', start);
    const body = SEND_PATH.slice(call, SEND_PATH.indexOf("});", call));
    expect(body).toContain('status: "entwurf"');
    expect(written).not.toBe("entwurf");
  });

  it("matches what the local archive cache records", () => {
    // The archive paints from this cache before the server answers; a
    // disagreement here shows the wrong state on every first load.
    const start = SEND_PATH.indexOf('localStorage.getItem("dokument-history"');
    const entry = SEND_PATH.slice(start, SEND_PATH.indexOf("history.slice(0, 100)", start));
    expect(entry).toContain(`status: "${written}"`);
  });
});

describe("negative control — the chain against the value that was there before", () => {
  it("shows every consumer this test would have caught", () => {
    // Not a hypothetical: "entwurf" is what handleSend wrote for months while
    // the suite stayed green. Running the same chain against it produces the
    // exact four blockers, which is the evidence that the assertion above bites.
    expect(lifecycle("entwurf")).toEqual({
      recipientMayAct: false,
      contentIsLocked: false,
      mayBeCancelled: false,
      mayBeMarkedPaid: true,
      goesOverdue: false,
      canBeDunned: false,
      hasItsOwnLabel: true,
    });
  });
});
