import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isPublicPath } from "@/middleware";

// A single-user installation has no marketing site. What it still shows to
// strangers is exactly the recipient's link, the legal pages and the login —
// and nothing of it is offered to search engines.

describe("public surface of a private installation", () => {
  it("no longer serves any marketing page without a session", () => {
    for (const path of [
      "/",
      "/preise",
      "/blog",
      "/blog/qr-rechnung-schweiz-2026",
      "/branchen/maler",
      "/vergleich/offertio-vs-bexio",
      "/sitemap.xml",
    ]) {
      expect(isPublicPath(path), `${path} should require a session`).toBe(false);
    }
  });

  it("still serves what a stranger legitimately needs", () => {
    for (const path of [
      "/login",
      "/callback",
      "/impressum",
      "/datenschutz",
      "/agb",
      "/view/123e4567-e89b-42d3-a456-426614174000",
      "/api/public/view",
      "/api/health",
      "/manifest.json",
      "/sw.js",
      "/robots.txt",
    ]) {
      expect(isPublicPath(path), `${path} should stay public`).toBe(true);
    }
  });
});

describe("the marketing site is gone", () => {
  it("has no marketing route group, no landing components, no sitemap", () => {
    expect(existsSync("src/app/(marketing)")).toBe(false);
    const landing = readdirSync("src/components").filter((f) => /^Landing/.test(f));
    expect(landing).toEqual([]);
    expect(existsSync("public/sitemap.xml")).toBe(false);
  });

  it("the start page only forwards into the app", () => {
    const home = readFileSync("src/app/page.tsx", "utf8");
    expect(home).toMatch(/redirect\(\s*"\/dashboard"\s*\)/);
    expect(home).not.toMatch(/Landing/);
  });
});

describe("the installation is not offered to search engines", () => {
  it("robots.txt disallows everything and advertises no sitemap", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toMatch(/^User-agent:\s*\*/m);
    expect(robots).toMatch(/^Disallow:\s*\/\s*$/m);
    expect(robots).not.toMatch(/^Allow:/m);
    expect(robots).not.toMatch(/Sitemap:/i);
  });

  it("the root layout marks every page noindex", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/robots:\s*\{\s*index:\s*false/);
  });
});
