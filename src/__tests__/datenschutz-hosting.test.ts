import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The privacy policy has to name the hosting region correctly.
 *
 * It said "Hosting: EU/CH" in two places. The Supabase project runs in
 * eu-central-1 (Frankfurt) — measured, and recorded in docs/MIGRATIONEN.md.
 * So the data is in the EU, and only in the EU.
 *
 * "EU/CH" reads to a Swiss customer as though their data might sit in
 * Switzerland. Offertio's first conversation is with a Swiss cleaning company,
 * and this is the one document where a customer is entitled to take every word
 * literally. Under Art. 19 revDSG the controller has to inform about disclosure
 * abroad; a vague region is worse than a precise one.
 */

const POLICY = readFileSync("src/app/(auth)/datenschutz/page.tsx", "utf8");

describe("privacy policy · hosting region", () => {
  it("does not claim Swiss hosting", () => {
    expect(POLICY).not.toContain("EU/CH");
  });

  it("names the EU as the storage location", () => {
    expect(POLICY).toMatch(/EU/);
  });

  it("still describes both the database and the file storage", () => {
    // The correction must not quietly drop one of the two.
    expect(POLICY).toContain("Supabase Storage");
    expect(POLICY).toMatch(/Supabase-Datenbank/);
  });
});
