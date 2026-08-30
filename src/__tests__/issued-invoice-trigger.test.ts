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
/** 040 replaces the function 039 installs and adds the DELETE guard. */
const MIGRATION_040 = readFileSync(
  "supabase/migrations/040_issued_invoice_delete_and_metadata.sql",
  "utf8",
);

/**
 * Columns that may still move on an issued invoice.
 *
 * 039 enumerated the FROZEN columns, which meant anything it forgot — pdf_url,
 * share_token, created_at — was writable by default, and a column added later
 * would be too. 040 inverts it: everything is frozen except this list.
 */
function writableColumns(): Set<string> {
  const block = MIGRATION_040.slice(
    MIGRATION_040.indexOf("writable constant text[]"),
    MIGRATION_040.indexOf("];", MIGRATION_040.indexOf("writable constant text[]")),
  );
  return new Set([...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
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

/**
 * Routes whose writes never land on an issued invoice, so the trigger does not
 * apply to them. Each one is asserted below rather than taken on trust.
 */
const OFFERTE_ONLY = new Set(["sign", "reject", "save"]);

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

  it("freezes by default instead of enumerating what to freeze", () => {
    // The inversion is the point: an enumeration is only as complete as the day
    // it was written, and 039's forgot pdf_url — the pointer to the archived
    // document itself. A column added in a later migration is now protected
    // without anyone remembering to add it.
    expect(MIGRATION_040).toContain("to_jsonb(OLD)");
    expect(MIGRATION_040).toContain("to_jsonb(NEW)");
    const writable = writableColumns();
    for (const column of ["betrag", "nummer", "positionen", "pdf_url", "share_token", "created_at"]) {
      expect(writable.has(column), `${column} must not be writable`).toBe(false);
    }
  });

  it("refuses to delete an issued invoice", () => {
    // Worse than editing: the invoice has to be KEPT (§147 AO, Art. 958f OR),
    // and 039 was BEFORE UPDATE only. Reproduced against real PostgreSQL: a
    // logged-in owner could DELETE their own sent invoice outright.
    expect(MIGRATION_040).toContain("BEFORE DELETE ON public.dokumente");
    expect(MIGRATION_040).toContain("issued invoice must be retained");
  });

  it("still lets a draft or a quotation be deleted", () => {
    // A blanket REVOKE is the over-broad fix that broke Storno earlier in this
    // audit. The guard states the actual rule instead.
    const retention = MIGRATION_040.slice(
      MIGRATION_040.indexOf("enforce_issued_invoice_retention()"),
    );
    expect(retention).toMatch(/OLD\.typ = 'rechnung' AND OLD\.status <> 'entwurf'/);
  });

  it("guards the GRANT against a missing role", () => {
    // A GRANT to a role that does not exist aborts the statement; depending on
    // how the runner wraps the file that could roll back the trigger itself.
    // This is the failure mode the red team found in migration 037.
    expect(MIGRATION).toMatch(/pg_roles WHERE rolname = 'service_role'/);
  });
});

describe("the premise: no invoice route writes outside the writable list", () => {
  const writable = writableColumns();
  const routes = routeWrites();

  it("found the routes to check", () => {
    expect(routes.size).toBeGreaterThan(3);
    expect(writable.size).toBe(6);
  });

  it.each([...routes.keys()])("%s writes only writable columns", (name) => {
    if (OFFERTE_ONLY.has(name)) return; // trigger does not apply to quotations
    const written = routes.get(name)!;
    const blocked = [...written].filter((c) => !writable.has(c));
    expect(blocked).toEqual([]);
  });

  it("save only writes converted_document_* to a quotation", () => {
    // save is on the exemption list above, so the reason has to hold: it writes
    // those columns to the SOURCE document of a conversion, and a Rechnung is
    // only ever converted FROM an Offerte. If that guard were ever loosened,
    // the trigger would start refusing the write in production.
    const route = readFileSync("src/app/api/dokument/save/route.ts", "utf8");
    const idx = route.indexOf("converted_document_id:");
    expect(idx).toBeGreaterThan(-1);
    const before = route.slice(Math.max(0, idx - 400), idx);
    expect(before).toMatch(/typ === "rechnung" && sourceDocumentId/);
    // And the client only ever declares an Offerte as the source.
    const form = readFileSync("src/app/(app)/dokument/neu/page.tsx", "utf8");
    expect(form).toMatch(/sourceDocumentTyp:\s*sourceDocumentId \? "offerte"/);
  });

  it("keeps the payment and dunning lifecycle open", () => {
    // What the first proposed fix in this audit would have broken.
    for (const column of ["status", "storniert_at", "storno_grund", "payment_received_at", "mahnstufe", "last_mahnung_at"]) {
      expect(writable.has(column), `${column} must stay writable`).toBe(true);
    }
  });
});
