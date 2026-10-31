import { describe, it, expect } from "vitest";
import { isValidUUID } from "@/lib/security";

describe("isValidUUID", () => {
  it("accepts valid UUIDs", () => {
    // v4 UUID (version=4, variant=[89ab])
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    // v1 UUID
    expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("rejects all-zero UUID (invalid version/variant)", () => {
    expect(isValidUUID("00000000-0000-0000-0000-000000000000")).toBe(false);
  });

  it("rejects non-UUID strings", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
    expect(isValidUUID("; DROP TABLE profiles; --")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID(12345)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stripControlChars
// ---------------------------------------------------------------------------
import { stripControlChars } from "@/lib/security";

describe("stripControlChars", () => {
  it("removes carriage returns and line feeds", () => {
    expect(stripControlChars("Muster AG\r\nBCC: evil@bad.com")).not.toContain("\r");
    expect(stripControlChars("Muster AG\r\nBCC: evil@bad.com")).not.toContain("\n");
  });

  it("removes null bytes and other C0 control characters", () => {
    expect(stripControlChars("hello\x00world")).not.toContain("\x00");
    expect(stripControlChars("hello\x1Bworld")).not.toContain("\x1B");
  });

  it("preserves normal text and unicode", () => {
    const input = "Müller & Söhne GmbH";
    expect(stripControlChars(input)).toBe(input);
  });

  it("trims surrounding whitespace", () => {
    expect(stripControlChars("  hello  ")).toBe("hello");
  });
});
