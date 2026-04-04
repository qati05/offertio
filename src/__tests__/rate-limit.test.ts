import { describe, it, expect, vi, beforeEach } from "vitest";

describe("rate-limit.ts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows requests under limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = rateLimit("test-key", 5, 60000);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining count", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    rateLimit("count-key", 5, 60000);
    rateLimit("count-key", 5, 60000);
    const r = rateLimit("count-key", 5, 60000);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("blocks when limit exceeded", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 3; i++) rateLimit("block-key", 3, 60000);
    const result = rateLimit("block-key", 3, 60000);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("uses separate keys independently", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 3; i++) rateLimit("key-a", 3, 60000);
    const resultA = rateLimit("key-a", 3, 60000);
    const resultB = rateLimit("key-b", 3, 60000);
    expect(resultA.ok).toBe(false);
    expect(resultB.ok).toBe(true);
  });

  it("resets after window expires", async () => {
    vi.useFakeTimers();
    const { rateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 3; i++) rateLimit("expire-key", 3, 1000);
    expect(rateLimit("expire-key", 3, 1000).ok).toBe(false);

    vi.advanceTimersByTime(1100);
    expect(rateLimit("expire-key", 3, 1000).ok).toBe(true);
    vi.useRealTimers();
  });

  it("rateLimitAsync falls back to in-memory without Upstash", async () => {
    const { rateLimitAsync } = await import("@/lib/rate-limit");
    const result = await rateLimitAsync("async-key", 5, 60000);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
