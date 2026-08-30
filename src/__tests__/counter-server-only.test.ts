import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The free-plan counter must be unwritable from the browser.
 *
 * dokument_counter decides whether a free user may create another document. Its
 * RLS policy had a USING clause and no WITH CHECK, so a user could PATCH their
 * own row to `anzahl: -999` straight through PostgREST and never hit the limit
 * again. Reproduced against real PostgreSQL twice, independently.
 *
 * The revoke is only safe because nothing in the application writes this table
 * directly — every write goes through increment_dokument_counter, which is
 * SECURITY DEFINER and unaffected by grants. That premise is the thing worth
 * guarding: this is the same shape of fix that was WRONG for public.dokumente,
 * where it would have broken Storno and Mahnwesen.
 */

const MIGRATION = readFileSync("supabase/migrations/037_counter_server_only.sql", "utf8");

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("migration 037", () => {
  it("takes the write grants away from the browser role", () => {
    expect(MIGRATION).toMatch(/REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.dokument_counter\s+FROM\s+authenticated/i);
  });

  it("keeps a value guard for the case someone re-grants the write", () => {
    expect(MIGRATION).toMatch(/CHECK\s*\(\s*anzahl\s*>=\s*0\s*\)/i);
  });

  it("does not touch SELECT — the routes read this table", () => {
    // check-limit and save both SELECT it. Revoking that would break the quota
    // check outright.
    expect(MIGRATION).not.toMatch(/REVOKE[^;]*SELECT[^;]*dokument_counter/i);
  });
});

describe("the premise the revoke depends on", () => {
  it("no application code writes dokument_counter directly", () => {
    // If this ever becomes false, migration 037 silently breaks that caller.
    const writers = walk("src")
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        if (!source.includes('from("dokument_counter")')) return false;
        // Find the chain that starts at the table and see whether it mutates.
        const idx = source.indexOf('from("dokument_counter")');
        const chain = source.slice(idx, idx + 300);
        return /\.(insert|update|upsert|delete)\(/.test(chain);
      })
      .map((f) => f.replace("src/", ""));
    expect(writers).toEqual([]);
  });

  it("the counter is incremented through the SECURITY DEFINER function", () => {
    const route = readFileSync("src/app/api/dokument/check-limit/route.ts", "utf8");
    expect(route).toContain("increment_dokument_counter");
  });
});
