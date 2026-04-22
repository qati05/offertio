import { describe, it, expect } from "vitest";
import { formatSwissDate, addDaysIso } from "@/lib/dates";

describe("formatSwissDate", () => {
  it("formats ISO date to Swiss dd.mm.yyyy", () => {
    expect(formatSwissDate("2026-03-15")).toBe("15.03.2026");
  });

  it("handles ISO date-time (strips time portion)", () => {
    expect(formatSwissDate("2026-03-15T12:00:00Z")).toBe("15.03.2026");
  });

  it("does not shift day across timezone boundaries", () => {
    // A naive `new Date("2026-01-01")` parses as UTC midnight; when the server
    // is in UTC- this would format as 2025-12-31. Our helper must never drift.
    expect(formatSwissDate("2026-01-01")).toBe("01.01.2026");
    expect(formatSwissDate("2026-12-31")).toBe("31.12.2026");
  });

  it("returns input unchanged for invalid dates", () => {
    expect(formatSwissDate("nicht-ein-datum")).toBe("nicht-ein-datum");
    expect(formatSwissDate("")).toBe("");
  });
});

describe("addDaysIso", () => {
  it("adds days without TZ drift across month boundary", () => {
    expect(addDaysIso("2026-03-30", 2)).toBe("2026-04-01");
  });

  it("adds days across year boundary", () => {
    expect(addDaysIso("2026-12-30", 5)).toBe("2027-01-04");
  });

  it("handles Februar 29 → 28 leap-year rollover", () => {
    // 2024 is a leap year → 2024-02-28 + 1 = 2024-02-29
    expect(addDaysIso("2024-02-28", 1)).toBe("2024-02-29");
    // 2025 isn't → 2025-02-28 + 1 = 2025-03-01
    expect(addDaysIso("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("supports zero-day add (identity)", () => {
    expect(addDaysIso("2026-06-15", 0)).toBe("2026-06-15");
  });

  it("returns input unchanged for invalid dates", () => {
    expect(addDaysIso("garbage", 5)).toBe("garbage");
  });

  it("pads single-digit month and day correctly", () => {
    expect(addDaysIso("2026-01-01", 8)).toBe("2026-01-09");
  });
});
