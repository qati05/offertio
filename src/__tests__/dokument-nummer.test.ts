/**
 * @vitest-environment jsdom
 *
 * The suite defaults to `node`; this file needs a DOM.
 * Exercises the browser branch of dokument-nummer.ts,
 * which returns a placeholder when `window` is undefined.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { peekNextNummer, commitNummer, getDokumentCount } from "@/lib/dokument-nummer";

describe("dokument-nummer.ts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const year = new Date().getFullYear();

  describe("peekNextNummer", () => {
    it("returns OF-YYYY-001 for first offerte", () => {
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-001`);
    });

    it("returns RE-YYYY-001 for first rechnung", () => {
      expect(peekNextNummer("rechnung")).toBe(`RE-${year}-001`);
    });

    it("does not change counter (peek only)", () => {
      peekNextNummer("offerte");
      peekNextNummer("offerte");
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-001`);
    });

    it("returns sensible default (001) when localStorage is empty", () => {
      localStorage.clear();
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-001`);
      expect(peekNextNummer("rechnung")).toBe(`RE-${year}-001`);
    });

    it("returns sensible default (001) when localStorage value is corrupt/non-numeric", () => {
      localStorage.setItem(`offertio_offerte_${year}`, "corrupt-value");
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-001`);
    });

    it("returns sensible default (001) when localStorage value is negative", () => {
      localStorage.setItem(`offertio_offerte_${year}`, "-5");
      // parseInt("-5") is -5; guard should treat it as 0
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-001`);
    });
  });

  describe("commitNummer", () => {
    it("increments offerte counter", () => {
      commitNummer("offerte");
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-002`);
    });

    it("increments rechnung counter independently", () => {
      commitNummer("offerte");
      commitNummer("offerte");
      commitNummer("rechnung");
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-003`);
      expect(peekNextNummer("rechnung")).toBe(`RE-${year}-002`);
    });

    it("pads numbers correctly", () => {
      for (let i = 0; i < 99; i++) commitNummer("offerte");
      expect(peekNextNummer("offerte")).toBe(`OF-${year}-100`);
    });
  });

  describe("getDokumentCount", () => {
    it("returns 0 initially", () => {
      expect(getDokumentCount()).toBe(0);
      expect(getDokumentCount("offerte")).toBe(0);
      expect(getDokumentCount("rechnung")).toBe(0);
    });

    it("counts offerte correctly", () => {
      commitNummer("offerte");
      commitNummer("offerte");
      expect(getDokumentCount("offerte")).toBe(2);
    });

    it("counts rechnung correctly", () => {
      commitNummer("rechnung");
      expect(getDokumentCount("rechnung")).toBe(1);
    });

    it("total counts both types", () => {
      commitNummer("offerte");
      commitNummer("offerte");
      commitNummer("rechnung");
      expect(getDokumentCount()).toBe(3);
    });
  });
});
