import { describe, it, expect } from "vitest";
import { getDachConfig, getAllLands } from "@/lib/dach";

describe("dach.ts", () => {
  describe("getDachConfig", () => {
    it("returns CH config by default", () => {
      const config = getDachConfig();
      expect(config.land).toBe("CH");
      expect(config.currency).toBe("CHF");
      expect(config.hasQrBill).toBe(true);
    });

    it("returns CH config for 'CH'", () => {
      const config = getDachConfig("CH");
      expect(config.mwstLabel).toBe("MWST");
      expect(config.defaultMwst).toBe(8.1);
      expect(config.ibanPrefix).toBe("CH");
    });

    it("returns DE config", () => {
      const config = getDachConfig("DE");
      expect(config.currency).toBe("EUR");
      expect(config.mwstLabel).toBe("USt.");
      expect(config.defaultMwst).toBe(19);
      expect(config.hasQrBill).toBe(false);
    });

    it("returns AT config", () => {
      const config = getDachConfig("AT");
      expect(config.currency).toBe("EUR");
      expect(config.defaultMwst).toBe(20);
      expect(config.mwstOptions.length).toBe(4);
    });

    it("falls back to CH for unknown land", () => {
      expect(getDachConfig("XX" as never).land).toBe("CH");
    });

    it("falls back to CH for undefined", () => {
      expect(getDachConfig(undefined).land).toBe("CH");
    });

    it("CH has correct MWST options", () => {
      const opts = getDachConfig("CH").mwstOptions;
      expect(opts.map((o) => o.value)).toEqual([0, 2.6, 8.1]);
    });

    it("DE has correct USt options", () => {
      const opts = getDachConfig("DE").mwstOptions;
      expect(opts.map((o) => o.value)).toEqual([0, 7, 19]);
    });

    it("AT has correct USt options", () => {
      const opts = getDachConfig("AT").mwstOptions;
      expect(opts.map((o) => o.value)).toEqual([0, 10, 13, 20]);
    });
  });

  describe("getAllLands", () => {
    it("returns 3 countries", () => {
      expect(getAllLands()).toHaveLength(3);
    });

    it("includes CH, DE, AT", () => {
      const values = getAllLands().map((l) => l.value);
      expect(values).toContain("CH");
      expect(values).toContain("DE");
      expect(values).toContain("AT");
    });
  });

  describe("leistungsdatumRequired", () => {
    it("CH does NOT require leistungsdatum", () => {
      expect(getDachConfig("CH").leistungsdatumRequired).toBe(false);
    });

    it("DE requires leistungsdatum (§14 Abs. 4 Nr. 6 UStG)", () => {
      expect(getDachConfig("DE").leistungsdatumRequired).toBe(true);
    });

    it("AT requires leistungsdatum (§11 UStG AT)", () => {
      expect(getDachConfig("AT").leistungsdatumRequired).toBe(true);
    });
  });

  describe("hasQrBill / sepaEnabled", () => {
    it("CH has QR bill and no SEPA", () => {
      const cfg = getDachConfig("CH");
      expect(cfg.hasQrBill).toBe(true);
      expect(cfg.sepaEnabled).toBe(false);
    });

    it("DE has SEPA and no QR bill", () => {
      const cfg = getDachConfig("DE");
      expect(cfg.hasQrBill).toBe(false);
      expect(cfg.sepaEnabled).toBe(true);
    });

    it("AT has SEPA and no QR bill", () => {
      const cfg = getDachConfig("AT");
      expect(cfg.hasQrBill).toBe(false);
      expect(cfg.sepaEnabled).toBe(true);
    });
  });

  describe("companyIdFields", () => {
    it("CH uid_mwst is optional", () => {
      const fields = getDachConfig("CH").companyIdFields;
      const uid = fields.find((f) => f.key === "uid_mwst");
      expect(uid).toBeDefined();
      expect(uid!.required).toBe(false);
    });

    it("DE steuernummer is required", () => {
      const fields = getDachConfig("DE").companyIdFields;
      const st = fields.find((f) => f.key === "steuernummer");
      expect(st).toBeDefined();
      expect(st!.required).toBe(true);
    });

    it("DE uid_mwst is optional", () => {
      const fields = getDachConfig("DE").companyIdFields;
      const uid = fields.find((f) => f.key === "uid_mwst");
      expect(uid).toBeDefined();
      expect(uid!.required).toBe(false);
    });

    it("AT uid_mwst is optional", () => {
      const fields = getDachConfig("AT").companyIdFields;
      const uid = fields.find((f) => f.key === "uid_mwst");
      expect(uid).toBeDefined();
      expect(uid!.required).toBe(false);
    });

    it("AT fn_nr is optional", () => {
      const fields = getDachConfig("AT").companyIdFields;
      const fn = fields.find((f) => f.key === "fn_nr");
      expect(fn).toBeDefined();
      expect(fn!.required).toBe(false);
    });
  });

  describe("plzDigits", () => {
    it("CH has 4-digit PLZ", () => {
      expect(getDachConfig("CH").plzDigits).toBe(4);
    });

    it("DE has 5-digit PLZ", () => {
      expect(getDachConfig("DE").plzDigits).toBe(5);
    });

    it("AT has 4-digit PLZ", () => {
      expect(getDachConfig("AT").plzDigits).toBe(4);
    });
  });
});
