import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    errorSpy.mockClear();
    warnSpy.mockClear();
    logSpy.mockClear();
  });


  describe("error()", () => {
    it("calls console.error for Error objects", () => {
      logger.error("test-context", new Error("boom"));
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it("handles non-Error values", () => {
      logger.error("ctx", "string error");
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it("accepts optional metadata", () => {
      logger.error("ctx", new Error("x"), { userId: "abc" });
      expect(errorSpy).toHaveBeenCalledOnce();
    });
  });

  describe("warn()", () => {
    it("calls console.warn", () => {
      logger.warn("ctx", "something fishy");
      expect(warnSpy).toHaveBeenCalledOnce();
    });
  });

  describe("info()", () => {
    it("calls console.log", () => {
      logger.info("ctx", "all good");
      expect(logSpy).toHaveBeenCalledOnce();
    });
  });
});
