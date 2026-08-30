import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FREE_LIMIT } from "@/lib/payment";

/**
 * Every "N Dokumente pro Monat" on the site has to be the number the app
 * actually enforces.
 *
 * FREE_LIMIT is 5. Four pages promised 10 — offertio-vs-bexio,
 * offertio-vs-sevdesk, branchen/reinigung and branchen/handwerker — while
 * eleven other places said 5 correctly. So the site contradicted itself, and
 * the page that got it wrong included branchen/reinigung: the landing page for
 * the very trade Offertio is about to pitch.
 *
 * Worse than a marketing slip: the AGB themselves say "bis zu 5 Dokumenten pro
 * Monat". The advertising contradicted the contract text.
 *
 * A one-off correction would drift again the moment the limit changes, so this
 * scans every claim on the site instead of pinning four line numbers.
 */

const CLAIM = /(\d+)\s*Dokument\w*\s*(?:pro|\/)\s*Monat/gi;

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

interface Claim {
  file: string;
  said: number;
}

function claims(): Claim[] {
  const found: Claim[] = [];
  for (const file of walk("src/app")) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(CLAIM)) {
      found.push({ file: file.replace("src/app/", ""), said: Number(match[1]) });
    }
  }
  return found;
}

describe("the site promises the limit the app enforces", () => {
  const found = claims();

  it("finds the claims to check", () => {
    // Guards the guard: a rewrite of the marketing pages must not turn this
    // into a silent no-op that passes because it inspected nothing.
    expect(found.length).toBeGreaterThan(8);
  });

  it("every stated document limit equals FREE_LIMIT", () => {
    const wrong = found.filter((c) => c.said !== FREE_LIMIT);
    expect(wrong).toEqual([]);
  });

  it("the AGB state the same number", () => {
    // The contract text is the one that has to be true.
    const agb = readFileSync("src/app/(auth)/agb/page.tsx", "utf8");
    const match = agb.match(/bis zu (\d+) Dokument\w*/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(FREE_LIMIT);
  });
});
