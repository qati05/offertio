import { describe, it, expect } from "vitest";
import { advanceByFrequency, isDue } from "@/lib/recurring";

describe("advanceByFrequency", () => {
  describe("weekly", () => {
    it("adds exactly 7 days", () => {
      expect(advanceByFrequency("2026-04-21", "weekly")).toBe("2026-04-28");
    });

    it("crosses month boundary cleanly", () => {
      expect(advanceByFrequency("2026-04-27", "weekly")).toBe("2026-05-04");
    });

    it("crosses year boundary cleanly", () => {
      expect(advanceByFrequency("2026-12-28", "weekly")).toBe("2027-01-04");
    });
  });

  describe("monthly", () => {
    it("bumps the month by 1", () => {
      expect(advanceByFrequency("2026-04-21", "monthly")).toBe("2026-05-21");
    });

    it("rolls Jan 31 back to Feb 28 in a non-leap year (no overflow into March)", () => {
      expect(advanceByFrequency("2026-01-31", "monthly")).toBe("2026-02-28");
    });

    it("rolls Jan 31 back to Feb 29 in a leap year", () => {
      expect(advanceByFrequency("2024-01-31", "monthly")).toBe("2024-02-29");
    });

    it("rolls Mar 31 back to Apr 30 (April has 30 days)", () => {
      expect(advanceByFrequency("2026-03-31", "monthly")).toBe("2026-04-30");
    });

    it("crosses year boundary (Dec → next Jan)", () => {
      expect(advanceByFrequency("2026-12-15", "monthly")).toBe("2027-01-15");
    });
  });

  describe("quarterly", () => {
    it("bumps by 3 months", () => {
      expect(advanceByFrequency("2026-01-15", "quarterly")).toBe("2026-04-15");
    });

    it("handles Nov 30 → Feb 28 (target month has fewer days)", () => {
      expect(advanceByFrequency("2025-11-30", "quarterly")).toBe("2026-02-28");
    });
  });

  describe("yearly", () => {
    it("bumps by 12 months", () => {
      expect(advanceByFrequency("2026-04-21", "yearly")).toBe("2027-04-21");
    });

    it("rolls leap-year Feb 29 back to Feb 28 in a non-leap year", () => {
      expect(advanceByFrequency("2024-02-29", "yearly")).toBe("2025-02-28");
    });
  });

  it("returns input unchanged for malformed ISO date", () => {
    expect(advanceByFrequency("garbage", "monthly")).toBe("garbage");
  });
});

describe("isDue", () => {
  const today = "2026-04-21";

  it("is due when next_generation_at is today and schedule is active", () => {
    expect(isDue({ active: true, next_generation_at: today, end_date: null }, today)).toBe(true);
  });

  it("is due when next_generation_at is in the past", () => {
    expect(isDue({ active: true, next_generation_at: "2026-04-01", end_date: null }, today)).toBe(true);
  });

  it("is not due when next_generation_at is in the future", () => {
    expect(isDue({ active: true, next_generation_at: "2026-05-01", end_date: null }, today)).toBe(false);
  });

  it("is not due when inactive, regardless of date", () => {
    expect(isDue({ active: false, next_generation_at: "2026-01-01", end_date: null }, today)).toBe(false);
  });

  it("is due when end_date is later than next_generation_at", () => {
    expect(isDue({ active: true, next_generation_at: today, end_date: "2027-01-01" }, today)).toBe(true);
  });

  it("is not due once next_generation_at passes end_date", () => {
    // end_date < next_generation_at means the schedule already reached its end.
    expect(isDue({ active: true, next_generation_at: "2026-06-01", end_date: "2026-05-01" }, today)).toBe(false);
  });
});
