import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, normalizeHex, resolveAccentPalette } from "@/lib/pdf-colors";

describe("normalizeHex", () => {
  it("accepts canonical 6-digit lowercase", () => {
    expect(normalizeHex("#c8793d")).toBe("#c8793d");
  });

  it("lowercases uppercase input", () => {
    expect(normalizeHex("#C8793D")).toBe("#c8793d");
  });

  it("adds missing leading hash", () => {
    expect(normalizeHex("c8793d")).toBe("#c8793d");
  });

  it("expands 3-digit hex to 6-digit", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("f00")).toBe("#ff0000");
  });

  it("trims whitespace", () => {
    expect(normalizeHex("  #abc  ")).toBe("#aabbcc");
  });

  it("rejects invalid input", () => {
    expect(normalizeHex("not-a-color")).toBeNull();
    expect(normalizeHex("#gggggg")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });
});

describe("resolveAccentPalette", () => {
  it("uses the offertio default when input is null", () => {
    const p = resolveAccentPalette(null);
    expect(p.accent).toBe(DEFAULT_ACCENT);
  });

  it("normalizes non-canonical input", () => {
    const p = resolveAccentPalette("#ABC");
    expect(p.accent).toBe("#aabbcc");
  });

  it("always returns canonical 6-digit lowercase hex", () => {
    const p = resolveAccentPalette("#1A7F42");
    for (const color of Object.values(p)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("derives a darker shade for the sub-band", () => {
    const p = resolveAccentPalette("#c8793d");
    // Dark variant should differ from accent and be darker (lower numeric sum).
    expect(p.accentDark).not.toBe(p.accent);
    const accentSum = parseInt(p.accent.slice(1), 16);
    const darkSum = parseInt(p.accentDark.slice(1), 16);
    expect(darkSum).toBeLessThan(accentSum);
  });

  it("darkens very light accents for on-white legibility", () => {
    const p = resolveAccentPalette("#fef08a"); // pale yellow
    expect(p.accentOnWhite).not.toBe(p.accent);
    // The on-white variant should be visibly darker than the accent.
    const accentR = parseInt(p.accent.slice(1, 3), 16);
    const onWhiteR = parseInt(p.accentOnWhite.slice(1, 3), 16);
    expect(onWhiteR).toBeLessThan(accentR);
  });

  it("keeps dark accents unchanged on white", () => {
    const p = resolveAccentPalette("#1a7f42"); // dark green
    expect(p.accentOnWhite).toBe("#1a7f42");
  });
});
