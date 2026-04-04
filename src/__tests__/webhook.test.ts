import { describe, it, expect } from "vitest";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Standalone unit tests for the webhook HMAC verification logic.
// These test the exact algorithm used in the route without importing Next.js.
// ---------------------------------------------------------------------------

const SECRET = "test-webhook-secret";

function computeHmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/** Mirrors the timing-safe comparison used in the route. */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const hmac = computeHmac(rawBody, secret);
  const sigBuf = Buffer.from(signature, "hex");
  const hmacBuf = Buffer.from(hmac, "hex");
  if (sigBuf.length !== hmacBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, hmacBuf);
}

describe("Webhook signature verification", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const sig = computeHmac(body, SECRET);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const sig = computeHmac(body, "wrong-secret");
    expect(verifySignature(body, sig, SECRET)).toBe(false);
  });

  it("rejects a signature for a different body", () => {
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const tampered = JSON.stringify({ meta: { event_name: "subscription_cancelled" } });
    const sig = computeHmac(body, SECRET);
    expect(verifySignature(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects a missing (empty) signature", () => {
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    expect(verifySignature(body, "", SECRET)).toBe(false);
  });

  it("rejects a signature that is not 64 hex chars", () => {
    const body = "{}";
    expect(verifySignature(body, "deadbeef", SECRET)).toBe(false);
    expect(verifySignature(body, "not-hex-at-all!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", SECRET)).toBe(false);
  });

  it("rejects an all-zero signature", () => {
    const body = JSON.stringify({ meta: {} });
    const zeros = "0".repeat(64);
    expect(verifySignature(body, zeros, SECRET)).toBe(false);
  });

  it("is case-insensitive for hex digits", () => {
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const sig = computeHmac(body, SECRET).toUpperCase();
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UUID validator (used before querying DB with webhook userId)
// ---------------------------------------------------------------------------
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
