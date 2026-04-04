import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FREE_LIMIT,
  getPricing,
  isPro,
  getMonthlyDocCount,
  incrementMonthlyDocCount,
  canCreateDocument,
  remainingFreeDocuments,
  getCheckoutUrl,
  isCheckoutConfigured,
  PRO_FEATURES,
} from "@/lib/payment";

describe("payment.ts", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ── getPricing ──
  describe("getPricing", () => {
    it("returns CHF for CH", () => {
      const { currency, prices } = getPricing("CH");
      expect(currency).toBe("CHF");
      expect(prices.monthly).toBe(28);
      expect(prices.yearlyPerMonth).toBe(20);
    });

    it("returns EUR for DE", () => {
      expect(getPricing("DE").currency).toBe("EUR");
    });

    it("returns EUR for AT", () => {
      expect(getPricing("AT").currency).toBe("EUR");
    });

    it("defaults to CHF for undefined land", () => {
      expect(getPricing(undefined).currency).toBe("CHF");
    });

    it("defaults to CHF for unknown land", () => {
      expect(getPricing("XX" as never).currency).toBe("CHF");
    });

    it("yearly price is 240", () => {
      expect(getPricing("CH").prices.yearly).toBe(240);
    });

    it("early bird monthly is 15", () => {
      expect(getPricing("CH").prices.earlyMonthly).toBe(15);
    });
  });

  // ── isPro ──
  describe("isPro", () => {
    it("returns true for pro_monthly", () => {
      expect(isPro("pro_monthly")).toBe(true);
    });

    it("returns true for pro_yearly", () => {
      expect(isPro("pro_yearly")).toBe(true);
    });

    it("returns false for free", () => {
      expect(isPro("free")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isPro(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isPro("")).toBe(false);
    });

    it("returns true for legacy 'pro'", () => {
      expect(isPro("pro")).toBe(true);
    });
  });

  // ── Monthly doc count ──
  describe("getMonthlyDocCount / incrementMonthlyDocCount", () => {
    it("starts at 0", () => {
      expect(getMonthlyDocCount()).toBe(0);
    });

    it("increments correctly", () => {
      incrementMonthlyDocCount();
      incrementMonthlyDocCount();
      expect(getMonthlyDocCount()).toBe(2);
    });

    it("uses year_month key pattern", () => {
      incrementMonthlyDocCount();
      const now = new Date();
      const key = `offertio_docs_${now.getFullYear()}_${now.getMonth() + 1}`;
      expect(localStorage.getItem(key)).toBe("1");
    });
  });

  // ── canCreateDocument ──
  describe("canCreateDocument", () => {
    it("always true for pro_monthly", () => {
      expect(canCreateDocument("pro_monthly")).toBe(true);
    });

    it("always true for pro_yearly", () => {
      expect(canCreateDocument("pro_yearly")).toBe(true);
    });

    it("true for free when under limit", () => {
      expect(canCreateDocument("free")).toBe(true);
    });

    it("false for free when at limit", () => {
      for (let i = 0; i < FREE_LIMIT; i++) incrementMonthlyDocCount();
      expect(canCreateDocument("free")).toBe(false);
    });

    it("false for undefined plan when at limit", () => {
      for (let i = 0; i < FREE_LIMIT; i++) incrementMonthlyDocCount();
      expect(canCreateDocument(undefined)).toBe(false);
    });
  });

  // ── remainingFreeDocuments ──
  describe("remainingFreeDocuments", () => {
    it("returns Infinity for pro", () => {
      expect(remainingFreeDocuments("pro_monthly")).toBe(Infinity);
    });

    it("returns FREE_LIMIT for fresh free user", () => {
      expect(remainingFreeDocuments("free")).toBe(FREE_LIMIT);
    });

    it("decreases as docs are created", () => {
      incrementMonthlyDocCount();
      incrementMonthlyDocCount();
      expect(remainingFreeDocuments("free")).toBe(FREE_LIMIT - 2);
    });

    it("never goes below 0", () => {
      for (let i = 0; i < FREE_LIMIT + 5; i++) incrementMonthlyDocCount();
      expect(remainingFreeDocuments("free")).toBe(0);
    });
  });

  // ── getCheckoutUrl / isCheckoutConfigured ──
  describe("getCheckoutUrl", () => {
    it("returns #upgrade when env not set", () => {
      expect(getCheckoutUrl("pro_monthly")).toBe("#upgrade");
    });

    it("reports missing checkout config", () => {
      expect(isCheckoutConfigured("pro_monthly")).toBe(false);
    });

    it("returns #upgrade without appending email", () => {
      expect(getCheckoutUrl("pro_monthly", "test@test.com")).toBe("#upgrade");
    });

    it("appends email to checkout URL", () => {
      const oldEnv = process.env.NEXT_PUBLIC_LS_PRO_MONTHLY;
      process.env.NEXT_PUBLIC_LS_PRO_MONTHLY = "https://checkout.example.com/buy/123";
      const url = getCheckoutUrl("pro_monthly", "test@test.com");
      expect(url).toContain("test%40test.com");
      expect(url).toContain("checkout");
      expect(isCheckoutConfigured("pro_monthly")).toBe(true);
      process.env.NEXT_PUBLIC_LS_PRO_MONTHLY = oldEnv;
    });
  });

  // ── PRO_FEATURES ──
  describe("PRO_FEATURES", () => {
    it("is a non-empty array", () => {
      expect(PRO_FEATURES.length).toBeGreaterThan(0);
    });

    it("includes QR-Rechnung", () => {
      expect(PRO_FEATURES.some((f) => f.includes("QR"))).toBe(true);
    });
  });
});
