import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STATUS_MAP } from "@/lib/dokument-status";

/**
 * Four places name the statuses a document can have, and they have to agree:
 * the CHECK constraint in the migrations, the union type in types.ts, the
 * label table in dokument-status.ts, and the literals the routes write.
 *
 * They did not. Migration 033 put a constraint on dokumente.status and I wrote
 * the list from the values I could see — statusOptionsFor, the Storno work, the
 * Mahnwesen. It missed "abgelehnt", which is written in exactly one place:
 * /api/public/reject, the route a recipient uses to turn down a quotation. The
 * union type in types.ts had the same gap.
 *
 * The failure would have been a delayed one. NEXT_PUBLIC_ENABLE_SIGNING
 * defaults to false, so the route returns 404 and nothing breaks. Switch that
 * flag on and every rejection fails on the constraint with a 500 — months
 * after the migration that caused it.
 *
 * An earlier version of this test scanned all of src/ for `status: "..."` and
 * flagged the health route's `status: "ok"` and the recurring runner's
 * per-schedule results. Those are API response fields, not document statuses.
 * It now compares the two authoritative declarations against each other and
 * checks route literals only where documents are actually written.
 */

const MIGRATIONS = "supabase/migrations";

/** The effective whitelist: the last migration that (re)defines it wins. */
function whitelistFromMigrations(): Set<string> {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  let values: string[] = [];
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    const match = sql.match(
      /dokumente_status_chk[\s\S]*?CHECK\s*\(\s*status\s+IN\s*\(([\s\S]*?)\)\s*\)/,
    );
    if (match) values = [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  }
  return new Set(values);
}

/** The union declared on DokumentHistorie.status. */
function unionFromTypes(): Set<string> {
  const source = readFileSync("src/lib/types.ts", "utf8");
  const match = source.match(/status:\s*((?:\s*\|\s*"[a-z_]+")+)\s*;/);
  if (!match) throw new Error("status union not found in types.ts");
  return new Set([...match[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));
}

/**
 * Status literals a route actually writes to a document row.
 *
 * Getting the aim right took three tries, and both misses are worth recording
 * because they are opposite failures:
 *
 *   - too narrow: it matched only `status: "wert"` inside api/dokument and
 *     api/public, so mahnung's `updates.status = "ueberfaellig"` and
 *     recurring/run's insert were invisible;
 *   - too broad: widening it swept in `results.push({ status: "skipped" })`
 *     from the recurring runner and the health route's `status: "ok"`, which
 *     are API response fields and have nothing to do with a document.
 *
 * So it looks for writes, not for the word: the payload of an .update() or
 * .insert(), an object literal carrying the columns a document row has, or an
 * assignment onto an updates object.
 */
function statusesWrittenByRoutes(): Map<string, string> {
  const roots = ["src/app/api/dokument", "src/app/api/public", "src/app/api/recurring"];
  const found = new Map<string, string>();
  const DOCUMENT_FIELDS = ["user_id", "nummer", "typ", "betrag", "kundenname"];

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
      if (!source.includes('from("dokumente")')) continue;
      const label = file.replace("src/app/api/", "");

      const record = (value: string) => found.set(value, label);

      // 1. The payload of an update or insert.
      for (const call of source.matchAll(/\.(update|insert)\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const match = call[2].match(/\bstatus:\s*"([a-z_]+)"/);
        if (match) record(match[1]);
      }

      // 2. An object literal that carries document columns — the payload built
      //    in a variable first, as recurring/run does.
      for (const literal of source.matchAll(/\{([^{}]*\bstatus:\s*"[a-z_]+"[^{}]*)\}/g)) {
        const body = literal[1];
        if (!DOCUMENT_FIELDS.some((f) => body.includes(`${f}:`))) continue;
        const match = body.match(/\bstatus:\s*"([a-z_]+)"/);
        if (match) record(match[1]);
      }

      // 3. `updates.status = "..."` — the assignment form.
      for (const match of source.matchAll(/\bupdates\.status\s*=\s*"([a-z_]+)"/g)) {
        record(match[1]);
      }
    }
  }
  return found;
}

describe("the three declarations of a document status agree", () => {
  const whitelist = whitelistFromMigrations();
  const union = unionFromTypes();
  const routes = statusesWrittenByRoutes();

  it("sees both ways a route can write a status", () => {
    // Guards against the blind spots above returning: mahnung uses the
    // assignment form, recurring/run lies outside the original two roots.
    const files = [...routes.values()].join(" ");
    expect(files).toMatch(/mahnung/);
    expect(files).toMatch(/recurring/);
  });

  it("finds all three to compare", () => {
    // Guards the guard: a renamed constraint, a moved type or a restructured
    // route directory must not turn this into a no-op that passes by
    // inspecting nothing.
    expect(whitelist.size).toBeGreaterThan(5);
    expect(union.size).toBeGreaterThan(5);
    expect(routes.size).toBeGreaterThan(1);
  });

  it("the type declares nothing the database would reject", () => {
    expect([...union].filter((s) => !whitelist.has(s))).toEqual([]);
  });

  it("the database allows nothing the type has forgotten", () => {
    // The other direction matters too: a status the database accepts but the
    // type does not know is one the UI could not render.
    //
    // "offen" is the one deliberate exception. It is not a document status at
    // all — it is the archive's filter value ("Offen" = entwurf + gesendet) and
    // the fallback getStatus() returns for an unknown key. It ended up in the
    // constraint because I built that list from dokument-status.ts without
    // checking which of those values are ever written. No route writes it
    // (asserted below), so it is harmless; removing it from a constraint that
    // is already live would be a tightening with no benefit.
    const KNOWN_DISPLAY_ONLY = new Set(["offen"]);
    const orphans = [...whitelist].filter((s) => !union.has(s) && !KNOWN_DISPLAY_ONLY.has(s));
    expect(orphans).toEqual([]);
  });

  it("no route writes the display-only status", () => {
    // The premise the exception above rests on.
    expect(routes.has("offen")).toBe(false);
  });

  it("every status a document route writes is allowed by both", () => {
    const bad = [...routes.entries()]
      .filter(([value]) => !whitelist.has(value) || !union.has(value))
      .map(([value, file]) => `${value} (${file})`);
    expect(bad).toEqual([]);
  });

  it("every status a route writes has its own label", () => {
    // The fourth declaration. getStatus() falls back to "offen" for anything it
    // does not know, so a missing entry does not throw — it silently displays
    // the wrong thing. "storniert" showed as "Entwurf" this way, and
    // "abgelehnt" would have shown as "Ausstehend".
    const unlabelled = [...routes.entries()]
      .filter(([value]) => !Object.prototype.hasOwnProperty.call(STATUS_MAP, value))
      .map(([value, file]) => `${value} (${file})`);
    expect(unlabelled).toEqual([]);
  });

  it("the label table declares nothing the database would reject", () => {
    const labels = Object.keys(STATUS_MAP).filter((k) => k !== "offen");
    expect(labels.filter((s) => !whitelist.has(s))).toEqual([]);
  });

  it("accepts the rejection status the recipient view writes", () => {
    // Named explicitly because this is the one that was missing, and because
    // it only becomes reachable when NEXT_PUBLIC_ENABLE_SIGNING is turned on.
    expect(whitelist.has("abgelehnt")).toBe(true);
    expect(union.has("abgelehnt")).toBe(true);
    expect(routes.get("abgelehnt")).toContain("public/reject");
    expect(Object.prototype.hasOwnProperty.call(STATUS_MAP, "abgelehnt")).toBe(true);
  });
});
