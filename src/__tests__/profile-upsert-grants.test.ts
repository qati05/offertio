import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A browser upsert on profiles needs UPDATE on profiles.id.
//
// PostgREST turns `supabase.from("profiles").upsert(row, { onConflict: "id" })`
// into INSERT ... ON CONFLICT (id) DO UPDATE SET ..., "id" = EXCLUDED."id", ...
// The conflict column is in the SET list, and PostgreSQL checks UPDATE privilege
// on every column in it. Migration 035 withheld UPDATE on `id` ("so the primary
// key cannot be rewritten"), and with that every profile upsert — onboarding,
// profile settings, the editor's profile save — failed with "permission denied
// for table profiles", for every user. Nothing here could see it: no unit test
// reaches a database.
//
// This pins the condition. The real proof is scripts/db/postgrest-smoke.py,
// which sends the writes through an actual PostgREST; this file is what keeps the
// pairing from being undone by an edit nobody runs that script for.

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const clientUpserts = walk("src").filter((file) => {
  const source = readFileSync(file, "utf8");
  return /^\s*["']use client["']/m.test(source) && /from\(\s*["']profiles["']\s*\)\s*\.upsert\(/.test(source);
});

const migrations = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ file: f, sql: readFileSync(join("supabase/migrations", f), "utf8") }));

describe("browser upserts on profiles", () => {
  it("finds the call sites this guards", () => {
    // Onboarding, profile settings and the editor. If this drops to zero the
    // guard below has nothing to guard and should be reconsidered, not skipped.
    expect(clientUpserts.length).toBeGreaterThanOrEqual(3);
  });

  it("are matched by a migration that grants UPDATE on profiles.id", () => {
    const grantsId = migrations.filter((m) =>
      /GRANT\s+UPDATE\s*\(\s*id\s*\)\s+ON\s+public\.profiles\s+TO\s+authenticated/i.test(m.sql),
    );
    expect(
      grantsId.map((m) => m.file),
      "no migration grants UPDATE (id) — every browser upsert on profiles fails with permission denied",
    ).not.toEqual([]);
  });

  it("is granted after the migration that withdrew it", () => {
    const withdrew = migrations.find((m) => /REVOKE\s+UPDATE\s+ON\s+public\.profiles\s+FROM\s+authenticated/i.test(m.sql))!;
    const grants = migrations.find((m) => /GRANT\s+UPDATE\s*\(\s*id\s*\)\s+ON\s+public\.profiles/i.test(m.sql));
    expect(withdrew, "expected a migration that revokes table-level UPDATE").toBeDefined();
    expect(grants, "the grant is missing").toBeDefined();
    expect(grants!.file > withdrew.file).toBe(true);
  });

  it("keeps the billing columns out of the browser's reach", () => {
    // The point of 035. Granting id back must not widen anything else.
    const grant = migrations.flatMap((m) =>
      [...m.sql.matchAll(/GRANT\s+UPDATE\s*\(([^)]*)\)\s+ON\s+public\.profiles\s+TO\s+authenticated/gi)].map((x) => x[1] ?? ""),
    );
    const granted = new Set(grant.join(",").split(",").map((c) => c.trim()).filter(Boolean));
    for (const privileged of ["plan", "trial_ends_at", "plan_expires_at", "plan_cancelled_at", "ls_subscription_id", "ls_customer_id"]) {
      expect(granted.has(privileged), `${privileged} must not be writable by the browser role`).toBe(false);
    }
  });
});
