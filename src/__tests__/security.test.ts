import { describe, it, expect } from "vitest";
import {
  getClientIp,
  isAllowedOrigin,
  isSafeDocumentIdentifier,
  isValidBase64,
  isValidEmail,
  isValidSwissIBAN,
  isValidUUID,
  maskIBAN,
  normalizeEmail,
  sanitize,
  stripControlChars,
} from "@/lib/security";

describe("security.ts", () => {
  describe("maskIBAN", () => {
    it("masks middle of valid IBAN", () => {
      const masked = maskIBAN("CH93 0076 2011 6238 5295 7");
      expect(masked).toContain("CH93 0076");
      expect(masked).toContain("7");
      expect(masked).not.toContain("2011");
    });

    it("returns short IBAN unchanged", () => {
      expect(maskIBAN("CH93")).toBe("CH93");
    });

    it("handles IBAN without spaces", () => {
      const masked = maskIBAN("CH9300762011623852957");
      expect(masked).toContain("CH93 0076");
    });
  });

  describe("sanitize", () => {
    it("escapes HTML tags", () => {
      expect(sanitize("<script>alert('xss')</script>")).not.toContain("<script>");
      expect(sanitize("<b>bold</b>")).toBe("&lt;b&gt;bold&lt;/b&gt;");
    });

    it("escapes ampersands", () => {
      expect(sanitize("A & B")).toBe("A &amp; B");
    });

    it("escapes quotes", () => {
      expect(sanitize('"hello"')).toBe("&quot;hello&quot;");
      expect(sanitize("'hello'")).toBe("&#x27;hello&#x27;");
    });
  });

  describe("email helpers", () => {
    it("accepts valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.ch")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("test @example.com")).toBe(false);
    });

    it("normalizes email", () => {
      expect(normalizeEmail("  TEST@Example.COM ")).toBe("test@example.com");
    });
  });

  describe("isValidSwissIBAN", () => {
    it("accepts valid Swiss IBAN", () => {
      expect(isValidSwissIBAN("CH93 0076 2011 6238 5295 7")).toBe(true);
      expect(isValidSwissIBAN("CH9300762011623852957")).toBe(true);
    });

    it("rejects non-Swiss IBAN", () => {
      expect(isValidSwissIBAN("DE89370400440532013000")).toBe(false);
    });
  });

  describe("isValidUUID", () => {
    it("accepts valid uuid", () => {
      expect(isValidUUID("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    });

    it("rejects invalid uuid", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false);
      expect(isValidUUID(null)).toBe(false);
    });
  });

  describe("stripControlChars", () => {
    it("takes only the first line segment (CRLF injection prevention)", () => {
      // Everything after the first \r\n boundary is dropped — this is the security guarantee.
      // "World" is on a separate line and would form an injected header in email contexts.
      expect(stripControlChars("Hello\r\nWorld\t")).toBe("Hello");
    });

    it("removes remaining control chars from first line", () => {
      expect(stripControlChars("Hello\tWorld")).toBe("HelloWorld");
    });

    it("trims surrounding whitespace", () => {
      expect(stripControlChars("  Hello  ")).toBe("Hello");
    });

    it("prevents CRLF header injection by dropping the injection payload", () => {
      const injected = "Legit Subject\r\nBcc: hacker@evil.com";
      const result = stripControlChars(injected);
      expect(result).toBe("Legit Subject");
      expect(result).not.toContain("Bcc:");
      expect(result).not.toContain("\r\n");
    });
  });

  describe("isValidBase64", () => {
    it("accepts base64 strings", () => {
      expect(isValidBase64("SGVsbG8=")).toBe(true);
    });

    it("rejects invalid base64 strings", () => {
      expect(isValidBase64("%%%not-base64%%%")) .toBe(false);
    });
  });

  describe("isSafeDocumentIdentifier", () => {
    it("accepts safe identifiers", () => {
      expect(isSafeDocumentIdentifier("OFF-2026-001")).toBe(true);
      expect(isSafeDocumentIdentifier("rechnung-2026.01")).toBe(true);
    });

    it("rejects unsafe identifiers", () => {
      expect(isSafeDocumentIdentifier("../../secret")).toBe(false);
      expect(isSafeDocumentIdentifier("rechnung/2026.01")).toBe(false);
      expect(isSafeDocumentIdentifier("bad name")).toBe(false);
    });
  });

  describe("isAllowedOrigin", () => {
    it("accepts same origin", () => {
      expect(isAllowedOrigin("https://offertio.app/api/test", "https://offertio.app")).toBe(true);
    });

    it("rejects cross origin", () => {
      expect(isAllowedOrigin("https://offertio.app/api/test", "https://evil.app")).toBe(false);
      expect(isAllowedOrigin("https://offertio.app/api/test", null)).toBe(false);
    });
  });

  describe("getClientIp", () => {
    it("prefers first forwarded ip", () => {
      const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
      expect(getClientIp(headers)).toBe("1.2.3.4");
    });

    it("falls back to x-real-ip", () => {
      const headers = new Headers({ "x-real-ip": "9.9.9.9" });
      expect(getClientIp(headers)).toBe("9.9.9.9");
    });
  });
});
