import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The database-level lock on an issued invoice, and the premise it rests on.
 *
 * checkContentEdit and checkStatusTransition both live in the API, and the
 * browser talks to PostgREST directly — so a logged-in user could rewrite their
 * own issued invoice with their own token. Reproduced twice during the audit.
 * Migration 039 puts the rule in a BEFORE UPDATE trigger.
 *
 * The trigger itself was verified against real PostgreSQL 16, not asserted from
 * its text: five attacks refused, eight legitimate writes allowed. That run is
 * reproducible via scripts/db/verify-039-trigger.sql and its README.
 *
 * What a unit test can add is the premise. The trigger lists exactly which
 * columns may still move on an issued invoice, read out of the routes. If a
 * route ever starts writing a different one, the trigger will reject it in
 * production and this test fails first.
 */

const MIGRATION = readFileSync(
  "supabase/migrations/039_issued_invoice_immutable.sql",
  "utf8",
);

/** Columns the trigger freezes on an issued invoice. */
function frozenColumns(): Set<string> {
  const block = MIGRATION.slice(
    MIGRATION.indexOf("IF (NEW.betrag"),
    MIGRATION.indexOf("issued invoice content is immutable"),
  );
  return new Set([...block.matchAll(/NEW\.([a-z_]+)/g)].map((m) => m[1]));
}

/** Columns each route writes to an existing dokumente row. */
function routeWrites(): Map<string, Set<string>> {
  const roots = ["src/app/api/dokument", "src/app/api/public"];
  const out = new Map<string, Set<string>>();
  for (const root of roots) {
    for (const dir of readdirSync(root, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const file = join(root, dir.name, "route.ts");
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const cols = new Set<string>();
      // Every .update({ ... }) payload in the file.
      for (const call of source.matchAll(/\.update\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        for (const key of call[1].matchAll(/^\s*([a-z_]+)\s*:/gm)) cols.add(key[1]);
      }
      // mahnung builds its payload in a variable first.
      const updates = source.match(/const updates[^=]*=\s*\{([\s\S]*?)\};/);
      if (updates) for (const key of updates[1].matchAll(/^\s*([a-z_]+)\s*:/gm)) cols.add(key[1]);
      for (const assign of source.matchAll(/updates\.([a-z_]+)\s*=/g)) cols.add(assign[1]);
      if (cols.size > 0) out.set(dir.name, cols);
    }
  }
  return out;
}

/** Routes that only ever touch quotations — the trigger exempts those. */
const OFFERTE_ONLY = new Set(["sign", "reject"]);

describe("migration 039 locks an issued invoice", () => {
  it("refuses a return to draft, which would remove the lock", () => {
    // The red team broke a column-only version of this trigger exactly here:
    // set the status to entwurf and the trigger stops applying on the next
    // write. The value rule is what closes it.
    expect(MIGRATION).toMatch(/NEW\.status = 'entwurf'/);
    expect(MIGRATION).toContain("issued invoice cannot return to draft");
  });

  it("treats cancellation as terminal", () => {
    expect(MIGRATION).toMatch(/OLD\.status = 'storniert'/);
    expect(MIGRATION).toContain("cancelled invoice is final");
  });

  it("exempts quotations and drafts", () => {
    expect(MIGRATION).toMatch(/OLD\.typ <> 'rechnung' OR OLD\.status = 'entwurf'/);
  });

  it("freezes the money and counterparty columns", () => {
    const frozen = frozenColumns();
    for (const column of ["betrag", "nummer", "positionen", "kundenname", "datum", "mwst_satz", "steuerfall"]) {
      expect(frozen.has(column), `${column} must be frozen`).toBe(true);
    }
  });

  it("guards the GRANT against a missing role", () => {
    // A GRANT to a role that does not exist aborts the statement; depending on
    // how the runner wraps the file that could roll back the trigger itself.
    // This is the failure mode the red team found in migration 037.
    expect(MIGRATION).toMatch(/pg_roles WHERE rolname = 'service_role'/);
  });
});

describe("the premise: no route writes a frozen column on an invoice", () => {
  const frozen = frozenColumns();
  const routes = routeWrites();

  it("found the routes to check", () => {
    expect(routes.size).toBeGreaterThan(3);
    expect(frozen.size).toBeGreaterThan(15);
  });

  it.each([...routes.keys()])("%s writes only unfrozen columns", (name) => {
    if (OFFERTE_ONLY.has(name)) return; // trigger does not apply to quotations
    const written = routes.get(name)!;
    const collisions = [...written].filter((c) => frozen.has(c));
    expect(collisions).toEqual([]);
  });

  it("leaves the payment and dunning columns writable", () => {
    // The lifecycle has to keep working: this is what the first proposed fix
    // would have broken.
    for (const column of ["status", "storniert_at", "storno_grund", "payment_received_at", "mahnstufe", "last_mahnung_at"]) {
      expect(frozen.has(column), `${column} must stay writable`).toBe(false);
    }
  });
});
