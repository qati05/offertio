import { describe, it, expect, vi, beforeEach } from "vitest";
import { FREE_LIMIT, isPro } from "@/lib/payment";

/**
 * Unit tests for the check-limit business logic.
 * The actual API route requires Supabase, so we test the core decision logic here.
 */

describe("check-limit logic", () => {
  describe("FREE_LIMIT constant", () => {
    it("is a positive integer", () => {
      expect(FREE_LIMIT).toBeGreaterThan(0);
      expect(Number.isInteger(FREE_LIMIT)).toBe(true);
    });
  });

  describe("isPro()", () => {
    it("returns true for pro_monthly", () => expect(isPro("pro_monthly")).toBe(true));
    it("returns true for pro_yearly", () => expect(isPro("pro_yearly")).toBe(true));
    it("returns true for legacy 'pro'", () => expect(isPro("pro")).toBe(true));
    it("returns false for free", () => expect(isPro("free")).toBe(false));
    it("returns false for undefined", () => expect(isPro(undefined)).toBe(false));
    it("returns false for empty string", () => expect(isPro("")).toBe(false));
  });

  describe("remaining calculation", () => {
    function calcRemaining(plan: string, used: number): number | typeof Infinity {
      if (isPro(plan)) return Infinity;
      return Math.max(0, FREE_LIMIT - used);
    }

    it("returns Infinity for pro plan", () => {
      expect(calcRemaining("pro_monthly", 100)).toBe(Infinity);
    });

    it("returns FREE_LIMIT when used is 0", () => {
      expect(calcRemaining("free", 0)).toBe(FREE_LIMIT);
    });

    it("decreases as docs are used", () => {
      expect(calcRemaining("free", 3)).toBe(FREE_LIMIT - 3);
    });

    it("never goes below 0", () => {
      expect(calcRemaining("free", FREE_LIMIT + 10)).toBe(0);
    });

    it("is 0 exactly at the limit", () => {
      expect(calcRemaining("free", FREE_LIMIT)).toBe(0);
    });
  });

  describe("allowed gate", () => {
    function isAllowed(plan: string, used: number): boolean {
      if (isPro(plan)) return true;
      return used < FREE_LIMIT;
    }

    it("always allows pro users", () => {
      expect(isAllowed("pro_yearly", FREE_LIMIT + 99)).toBe(true);
    });

    it("allows free user under limit", () => {
      expect(isAllowed("free", FREE_LIMIT - 1)).toBe(true);
    });

    it("blocks free user at limit", () => {
      expect(isAllowed("free", FREE_LIMIT)).toBe(false);
    });

    it("blocks free user over limit", () => {
      expect(isAllowed("free", FREE_LIMIT + 5)).toBe(false);
    });
  });
});
