import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The browser talks to PostgREST directly, so every column the `authenticated`
 * role may write is a column the user may write — with any value, from devtools,
 * bypassing every check in src/app/api.
 *
 * Row-Level Security scopes the ROW ("only your own profile") but says nothing
 * about the COLUMN. `plan` and `trial_ends_at` are exactly the two columns
 * hasActiveAccess() reads (src/lib/payment.ts), so a user who can write them can
 * grant themselves a paid plan with one PATCH request. Verified against the live
 * database on 2026-08-29: the `authenticated` role held UPDATE on plan,
 * trial_ends_at, plan_expires_at and ls_subscription_id.
 *
 * Migration 035 revokes those grants; this test guards the other half. Two
 * client files already document the rule in a comment ("never write privileged
 * server-only columns … those are set exclusively by the webhook handler") —
 * this makes the rule enforceable instead of aspirational, so a future edit that
 * re-adds `plan:` to a client payload fails here rather than at the database,
 * where it would surface as an opaque "permission denied for table profiles".
 */

/** Columns only the Lemon Squeezy webhook (service role) may ever write. */
const BILLING_COLUMNS = [
  "plan",
  "trial_ends_at",
  "plan_expires_at",
  "plan_cancelled_at",
  "ls_subscription_id",
  "ls_customer_id",
  "referral_code",
];

const CLIENT_ROOTS = ["src/app/(app)", "src/app/(auth)", "src/components"];

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Client components — the ones shipped to the browser and thus attacker-controlled. */
function clientFiles(): string[] {
  return CLIENT_ROOTS.flatMap((root) => {
    try {
      return walk(root);
    } catch {
      return [];
    }
  }).filter((f) => readFileSync(f, "utf8").includes('"use client"'));
}

/**
 * Object-literal keys written in a Supabase mutation, e.g. `plan: "free"`.
 * Deliberately syntactic rather than a full parse: it only has to catch the
 * shape a developer would actually write, and a false positive here is a
 * comment away from being resolved.
 */
function writtenKeys(source: string): Set<string> {
  const keys = new Set<string>();
  // Narrow to the body of .upsert( / .update( / .insert( calls.
  const calls = source.matchAll(/\.(upsert|update|insert)\(\s*(\{[\s\S]*?\n\s*\},?)/g);
  for (const call of calls) {
    for (const key of call[2].matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:/gim)) {
      keys.add(key[1]);
    }
  }
  return keys;
}

describe("client components never write privileged columns", () => {
  const files = clientFiles();

  it("finds the client components to check", () => {
    // Guards the guard: a refactor that moves these directories must not turn
    // this suite into a silent no-op that passes because it inspected nothing.
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(BILLING_COLUMNS)("no client component writes %s", (column) => {
    const offenders = files.filter((file) =>
      writtenKeys(readFileSync(file, "utf8")).has(column),
    );
    expect(offenders).toEqual([]);
  });
});
