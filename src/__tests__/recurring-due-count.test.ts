import { describe, it, expect } from "vitest";
import { countDueSchedules } from "@/lib/recurring";

/**
 * How many recurring series are waiting to be generated.
 *
 * Generation is manual: /api/recurring/run only fires when someone presses the
 * button on the settings page, and each press advances a series by exactly one
 * period. A user who has not opened that page simply gets no invoice, with
 * nothing anywhere saying so. This count is what makes the silence visible.
 *
 * It is a count, never an amount. src/__tests__/no-money-history.test.ts
 * mandates that no monetary value appears in the dashboard overview, and this
 * feature stays on the correct side of that line.
 */
const today = "2026-03-15";

function schedule(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    next_generation_at: "2026-03-01",
    end_date: null,
    ...overrides,
  };
}

describe("recurring · countDueSchedules", () => {
  it("counts a series whose date has passed", () => {
    expect(countDueSchedules([schedule()], today)).toBe(1);
  });

  it("counts a series due exactly today", () => {
    expect(countDueSchedules([schedule({ next_generation_at: today })], today)).toBe(1);
  });

  it("ignores a series that is not due yet", () => {
    expect(countDueSchedules([schedule({ next_generation_at: "2026-04-01" })], today)).toBe(0);
  });

  it("ignores a paused series", () => {
    expect(countDueSchedules([schedule({ active: false })], today)).toBe(0);
  });

  it("ignores a series past its end date", () => {
    expect(
      countDueSchedules(
        [schedule({ next_generation_at: "2026-03-01", end_date: "2026-02-01" })],
        today,
      ),
    ).toBe(0);
  });

  it("counts several due series", () => {
    expect(
      countDueSchedules(
        [
          schedule({ next_generation_at: "2026-01-01" }),
          schedule({ next_generation_at: "2026-02-01" }),
          schedule({ next_generation_at: "2026-09-01" }),
          schedule({ active: false }),
        ],
        today,
      ),
    ).toBe(2);
  });

  it("returns 0 for an empty or missing list", () => {
    expect(countDueSchedules([], today)).toBe(0);
    expect(countDueSchedules(undefined, today)).toBe(0);
    expect(countDueSchedules(null, today)).toBe(0);
  });

  it("ignores malformed entries instead of throwing", () => {
    // The dashboard must never break because one row is odd.
    expect(countDueSchedules([null, "nope", {}, schedule()] as never, today)).toBe(1);
  });
});
