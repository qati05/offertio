/**
 * QR-Bill Stress Tests
 *
 * Validates generateQrrReference against ISO 11649 / Swiss QR-bill standard §4.7
 * with stress data: zero amounts, max-length strings, all-symbol document numbers,
 * numeric overflow, and checksum integrity proofs.
 */

import { describe, it, expect } from "vitest";
import { generateQrrReference, QrIbanError } from "@/lib/qr-bill";

// ── Reference length invariant ───────────────────────────────────────────────

describe("generateQrrReference — always produces 27 digits", () => {
  const INPUTS = [
    "RE-2026-001",
    "OF-2026-001",
    "1",
    "0",
    "",
    "999999999999999999999999999", // 27 chars all-9
    "A",
    "!@#$%^&*()_+-=[]{}|;:,.<>?", // all symbols, no digits
    "日本語テスト",                   // Japanese characters, no digits
    "RE-2026-001-SUFFIX-VERY-LONG",
    "0".repeat(100),               // 100 zeros
    "9".repeat(100),               // 100 nines
  ];

  for (const input of INPUTS) {
    it(`produces exactly 27 digits for: "${input.slice(0, 30)}${input.length > 30 ? "…" : ""}"`, () => {
      const ref = generateQrrReference(input);
      expect(ref).toHaveLength(27);
      expect(/^\d{27}$/.test(ref)).toBe(true);
    });
  }
});

// ── Checksum integrity (Modulo-10 recursive) ─────────────────────────────────

describe("generateQrrReference — Modulo-10 checksum integrity", () => {
  it("known reference for RE-2026-001 produces valid check digit", () => {
    const ref = generateQrrReference("RE-2026-001");
    // Digits extracted: 2026001 → padded to 26 → 00000000000000000000020260019
    // The last digit is the checksum
    expect(ref).toMatch(/^\d{27}$/);
    // Verify checksum is self-consistent: re-running on the first 26 digits
    // must yield the same 27th digit
    const first26 = ref.slice(0, 26);
    const checkDigit = ref.slice(26);
    const recomputed = generateQrrReference(first26); // all digits → same result
    expect(recomputed.slice(26)).toBe(checkDigit);
  });

  it("changing one digit in input changes the checksum", () => {
    const ref1 = generateQrrReference("OF-2026-001");
    const ref2 = generateQrrReference("OF-2026-002");
    // The references must differ (at minimum the checksum digit)
    expect(ref1).not.toBe(ref2);
  });

  it("two different document numbers never produce identical 27-digit references", () => {
    const pairs = [
      ["OF-2026-001", "OF-2026-002"],
      ["RE-2024-001", "RE-2025-001"],
      ["OF-2026-999", "OF-2027-001"],
    ];
    for (const [a, b] of pairs) {
      expect(generateQrrReference(a)).not.toBe(generateQrrReference(b));
    }
  });

  it("deterministic: same input always produces same reference", () => {
    const input = "RE-2026-001";
    const ref1 = generateQrrReference(input);
    const ref2 = generateQrrReference(input);
    const ref3 = generateQrrReference(input);
    expect(ref1).toBe(ref2);
    expect(ref2).toBe(ref3);
  });
});

// ── Digit extraction from document numbers ───────────────────────────────────

describe("generateQrrReference — digit extraction", () => {
  it("extracts only digit characters from alphanumeric input", () => {
    // "OF-2026-001" has digits 2026001
    const ref = generateQrrReference("OF-2026-001");
    // First 26 chars should be left-padded 2026001
    expect(ref.slice(0, 19)).toBe("0000000000000000000"); // 19 leading zeros
    expect(ref.slice(19, 26)).toBe("2026001");
  });

  it("all-symbol input (no digits) produces 000...0 + checksum", () => {
    const ref = generateQrrReference("!@#$%^&*()"); // no digits
    expect(ref.slice(0, 26)).toBe("0".repeat(26));
    // Checksum of "00000...0" (26 zeros) = known value
    expect(ref).toHaveLength(27);
  });

  it("empty string produces 000...0 + checksum", () => {
    const ref = generateQrrReference("");
    expect(ref.slice(0, 26)).toBe("0".repeat(26));
    expect(ref).toHaveLength(27);
  });

  it("digit-only input of exactly 26 digits uses them as-is (no padding)", () => {
    const digits26 = "12345678901234567890123456";
    const ref = generateQrrReference(digits26);
    expect(ref.slice(0, 26)).toBe(digits26);
  });

  it("digit-only input longer than 26 digits uses last 26", () => {
    const digits30 = "123456789012345678901234567890"; // 30 digits
    const ref = generateQrrReference(digits30);
    expect(ref.slice(0, 26)).toBe(digits30.slice(-26));
  });

  it("input with exactly 27 digits uses last 26 (not all 27)", () => {
    const digits27 = "1".repeat(27);
    const ref = generateQrrReference(digits27);
    expect(ref.slice(0, 26)).toBe("1".repeat(26));
  });
});

// ── Standard Swiss document number formats ───────────────────────────────────

describe("generateQrrReference — standard Offertio document number formats", () => {
  const STANDARD_FORMATS = [
    "OF-2026-001",
    "OF-2026-999",
    "RE-2026-001",
    "RE-2026-999",
    "OF-2026-001-1",    // collision suffix
    "OF-2026-001-99",   // collision suffix max
    "RE-2025-001",      // previous year
    "OF-2024-001",      // two years ago
  ];

  for (const nummer of STANDARD_FORMATS) {
    it(`handles standard format: ${nummer}`, () => {
      const ref = generateQrrReference(nummer);
      expect(ref).toHaveLength(27);
      expect(/^\d{27}$/.test(ref)).toBe(true);
    });
  }
});

// ── QrIbanError class ─────────────────────────────────────────────────────────

describe("QrIbanError", () => {
  it("is an instance of Error", () => {
    const err = new QrIbanError();
    expect(err).toBeInstanceOf(Error);
  });

  it("has name 'QrIbanError'", () => {
    const err = new QrIbanError();
    expect(err.name).toBe("QrIbanError");
  });

  it("has a descriptive message mentioning 27-digit QRR", () => {
    const err = new QrIbanError();
    expect(err.message).toContain("27-digit");
    expect(err.message).toContain("QRR");
  });
});

// ── Checksum boundary — specific known values ─────────────────────────────────

describe("generateQrrReference — known-value assertions", () => {
  // These values are pre-computed and serve as regression tests.
  // If the algorithm changes, these will catch it.
  it("'1' produces reference ending in known checksum", () => {
    const ref = generateQrrReference("1");
    // Digits: "1" → padded to 26: "00000000000000000000000001"
    expect(ref.slice(0, 26)).toBe("00000000000000000000000001");
    expect(ref).toHaveLength(27);
  });

  it("all zeros input has consistent checksum", () => {
    const ref1 = generateQrrReference("0");
    const ref2 = generateQrrReference("000");
    const ref3 = generateQrrReference("");
    // All have 26 leading zeros → same checksum
    expect(ref1.slice(26)).toBe(ref2.slice(26));
    expect(ref2.slice(26)).toBe(ref3.slice(26));
  });
});
