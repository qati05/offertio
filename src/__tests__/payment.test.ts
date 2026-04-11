import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FREE_LIMIT,
  TRIAL_DAYS,
  getPricing,
  isPro,
  isInTrial,
  trialDaysRemaining,
  hasActiveAccess,
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

    it("true for free user in active trial even past FREE_LIMIT", () => {
      for (let i = 0; i < FREE_LIMIT + 10; i++) incrementMonthlyDocCount();
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString();
      expect(canCreateDocument("free", futureDate)).toBe(true);
    });

    it("false for free user whose trial has expired and who is at limit", () => {
      for (let i = 0; i < FREE_LIMIT; i++) incrementMonthlyDocCount();
      const pastDate = new Date(Date.now() - 1000 * 60).toISOString();
      expect(canCreateDocument("free", pastDate)).toBe(false);
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

    it("returns Infinity for a free user with an active trial", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();
      expect(remainingFreeDocuments("free", futureDate)).toBe(Infinity);
    });
  });

  // ── isInTrial / trialDaysRemaining / hasActiveAccess ──
  describe("trial helpers", () => {
    it("TRIAL_DAYS is a positive integer", () => {
      expect(TRIAL_DAYS).toBeGreaterThan(0);
      expect(Number.isInteger(TRIAL_DAYS)).toBe(true);
    });

    it("isInTrial returns false for null/undefined", () => {
      expect(isInTrial(null)).toBe(false);
      expect(isInTrial(undefined)).toBe(false);
    });

    it("isInTrial returns false for an expired trial", () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(isInTrial(past)).toBe(false);
    });

    it("isInTrial returns true for a future trial end", () => {
      const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      expect(isInTrial(future)).toBe(true);
    });

    it("isInTrial returns false for an invalid date string", () => {
      expect(isInTrial("not-a-date")).toBe(false);
    });

    it("trialDaysRemaining returns 0 for null", () => {
      expect(trialDaysRemaining(null)).toBe(0);
    });

    it("trialDaysRemaining returns 0 for expired trial", () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(trialDaysRemaining(past)).toBe(0);
    });

    it("trialDaysRemaining rounds up partial days", () => {
      // 23 hours from now should read as 1 day left
      const almostOneDay = new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString();
      expect(trialDaysRemaining(almostOneDay)).toBe(1);
    });

    it("trialDaysRemaining returns 14 for fresh 14-day trial", () => {
      // 14 days minus a tiny buffer so ceil() still returns 14
      const fresh = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 14 - 1000,
      ).toISOString();
      expect(trialDaysRemaining(fresh)).toBe(14);
    });

    it("hasActiveAccess true when plan is pro even without trial", () => {
      expect(hasActiveAccess("pro_monthly", null)).toBe(true);
      expect(hasActiveAccess("pro_yearly", null)).toBe(true);
    });

    it("hasActiveAccess true when plan is free but trial is active", () => {
      const future = new Date(Date.now() + 1000 * 60).toISOString();
      expect(hasActiveAccess("free", future)).toBe(true);
    });

    it("hasActiveAccess false when plan is free and trial has ended", () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(hasActiveAccess("free", past)).toBe(false);
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
