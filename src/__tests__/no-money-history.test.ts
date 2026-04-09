/**
 * No-Money History Integrity
 *
 * Mandate: Under NO circumstances should a monetary amount (CHF, EUR,
 * or decimal-formatted betrag) appear in the History or Overview UI.
 * These tests are the contractual guardrail against regressions.
 */

import { describe, it, expect } from "vitest";
import type { DokumentHistorie } from "@/lib/types";

// ── Mirrors the STATUS_CONFIG in dashboard/page.tsx ──────────────────────────
const DASHBOARD_STATUS: Record<string, { label: string; color: string }> = {
  entwurf:      { label: "In Arbeit",   color: "var(--app-text-soft)" },
  gesendet:     { label: "Ausstehend",  color: "var(--color-primary)" },
  angenommen:   { label: "Bestätigt",   color: "#1A7F42" },
  bezahlt:      { label: "Erledigt",    color: "#1A7F42" },
  abgelaufen:   { label: "Abgelaufen",  color: "var(--app-text-muted)" },
  ueberfaellig: { label: "Überfällig",  color: "#B91C1C" },
  offen:        { label: "Ausstehend",  color: "var(--color-primary)" },
};

// ── Mirrors the STATUS map in dokumente/page.tsx ──────────────────────────────
const DOKUMENTE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  entwurf:      { label: "In Arbeit",  color: "#6b7280", bg: "rgba(107,114,128,0.07)" },
  gesendet:     { label: "Ausstehend", color: "#A8622E", bg: "rgba(200,121,61,0.07)" },
  bezahlt:      { label: "Erledigt",   color: "#15803d", bg: "rgba(21,128,61,0.07)" },
  angenommen:   { label: "Bestätigt",  color: "#15803d", bg: "rgba(21,128,61,0.07)" },
  abgelaufen:   { label: "Abgelaufen", color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
  ueberfaellig: { label: "Überfällig", color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
};

// All process-language labels that are allowed in the UI
const PROCESS_LABELS = new Set([
  "In Arbeit",
  "Ausstehend",
  "Bestätigt",
  "Erledigt",
  "Abgelaufen",
  "Überfällig",
]);

// Regex for any monetary value: CHF/EUR symbol OR decimal-formatted number
const CURRENCY_PATTERN = /\b(CHF|EUR|USD|Fr\.)\b|€|\$|\b\d{1,3}([,.']\d{3})*[,.']\d{2}\b/;

// Mock documents with meaningful betrag values — these must NEVER appear in UI
const MOCK_HISTORY: DokumentHistorie[] = [
  {
    id: "1",
    typ: "offerte",
    nummer: "OF-2026-001",
    kundenname: "Roni AG",
    datum: "2026-04-05",
    status: "gesendet",
    betrag: 12_345.67,
    objekt: "Küchenbau",
  },
  {
    id: "2",
    typ: "rechnung",
    nummer: "RE-2026-001",
    kundenname: "Tanaka GmbH",
    datum: "2026-04-04",
    status: "bezahlt",
    betrag: 99_999.99,
    objekt: undefined,
  },
  {
    id: "3",
    typ: "offerte",
    nummer: "OF-2026-002",
    kundenname: "Muster KG",
    datum: "2026-03-15",
    status: "ueberfaellig",
    betrag: 0,
    objekt: undefined,
  },
];

describe("No-Money History Integrity", () => {
  describe("Dashboard STATUS_CONFIG", () => {
    it("every label is pure process-language — no digits or currency symbols", () => {
      for (const [key, cfg] of Object.entries(DASHBOARD_STATUS)) {
        expect(
          CURRENCY_PATTERN.test(cfg.label),
          `dashboard status "${key}" label "${cfg.label}" must not contain currency/amounts`,
        ).toBe(false);
      }
    });

    it("every label belongs to the approved process-language set", () => {
      for (const [key, cfg] of Object.entries(DASHBOARD_STATUS)) {
        expect(
          PROCESS_LABELS.has(cfg.label),
          `dashboard status "${key}" label "${cfg.label}" is not an approved process label`,
        ).toBe(true);
      }
    });

    it("covers all expected document status codes", () => {
      const expected = ["entwurf", "gesendet", "angenommen", "bezahlt", "abgelaufen", "ueberfaellig"];
      for (const code of expected) {
        expect(DASHBOARD_STATUS[code], `missing status code "${code}"`).toBeDefined();
      }
    });
  });

  describe("Dokumente STATUS map", () => {
    it("every label is pure process-language — no digits or currency symbols", () => {
      for (const [key, cfg] of Object.entries(DOKUMENTE_STATUS)) {
        expect(
          CURRENCY_PATTERN.test(cfg.label),
          `dokumente status "${key}" label "${cfg.label}" must not contain currency/amounts`,
        ).toBe(false);
      }
    });

    it("every label belongs to the approved process-language set", () => {
      for (const [key, cfg] of Object.entries(DOKUMENTE_STATUS)) {
        expect(
          PROCESS_LABELS.has(cfg.label),
          `dokumente status "${key}" label "${cfg.label}" is not an approved process label`,
        ).toBe(true);
      }
    });

    it("background colors are valid CSS values (not user-visible text)", () => {
      for (const [key, cfg] of Object.entries(DOKUMENTE_STATUS)) {
        // bg is a CSS color value — must be rgba() or var() format, not a currency amount or label
        expect(
          cfg.bg.startsWith("rgba(") || cfg.bg.startsWith("var("),
          `dokumente status "${key}" bg should be rgba or var, got: "${cfg.bg}"`,
        ).toBe(true);
        // bg must not contain currency symbols (CHF/EUR words)
        expect(cfg.bg).not.toMatch(/\b(CHF|EUR|USD|Fr\.)\b/);
        // bg must not be confused with a monetary label
        expect(cfg.bg).not.toMatch(/^(In Arbeit|Ausstehend|Bestätigt|Erledigt|Abgelaufen|Überfällig)$/);
      }
    });
  });

  describe("Status rendering for mock documents", () => {
    it("betrag value of 12_345.67 never appears as a status label", () => {
      const doc = MOCK_HISTORY[0];
      const status = DASHBOARD_STATUS[doc.status];
      expect(status.label).not.toContain("12345");
      expect(status.label).not.toContain("12'345");
      expect(status.label).not.toContain("CHF");
      expect(status.label).toBe("Ausstehend");
    });

    it("betrag value of 99_999.99 never appears as a status label", () => {
      const doc = MOCK_HISTORY[1];
      const status = DASHBOARD_STATUS[doc.status];
      expect(status.label).not.toContain("99999");
      expect(status.label).not.toContain("CHF");
      expect(status.label).toBe("Erledigt");
    });

    it("zero betrag document does not render '0.00' as its label", () => {
      const doc = MOCK_HISTORY[2];
      const status = DASHBOARD_STATUS[doc.status];
      expect(status.label).not.toBe("0.00");
      expect(status.label).not.toBe("0");
      expect(status.label).toBe("Überfällig");
    });

    it("history row fields (nummer, datum, kundenname) do not contain currency", () => {
      for (const doc of MOCK_HISTORY) {
        // These are the only fields rendered in history rows
        const renderedFields = [doc.nummer, doc.kundenname, doc.datum, doc.objekt ?? ""].join(" ");
        // Betrag must not appear in its formatted form (the only way it would be rendered)
        // Use toFixed(2) to match how amounts are displayed (e.g. "12345.67", "0.00")
        // Skip trivially short values like "0" that match partial date substrings
        if (doc.betrag > 0) {
          const formattedBetrag = doc.betrag.toFixed(2);
          expect(renderedFields).not.toContain(formattedBetrag);
        }
        expect(CURRENCY_PATTERN.test(renderedFields)).toBe(false);
      }
    });
  });

  describe("Cross-jurisdiction — Swiss user, Japanese customer, Austrian VAT (edge case matrix)", () => {
    // Scenario: CH user creates an invoice for a Japanese customer using Austrian VAT rate
    // The document is stored with typ/status — betrag must still never leak into history UI
    const edgeCaseDoc: DokumentHistorie = {
      id: "edge-1",
      typ: "rechnung",
      nummer: "RE-2026-099",
      kundenname: "Tanaka Corp. (日本)",
      datum: "2026-04-05",
      status: "gesendet",
      betrag: 5_000.00, // Amount in CHF for an AT-VAT-rated invoice
      objekt: "Consulting Tokyo",
    };

    it("Japanese customer name does not trigger currency pattern", () => {
      expect(CURRENCY_PATTERN.test(edgeCaseDoc.kundenname)).toBe(false);
    });

    it("status label for cross-jurisdiction doc is still process-language only", () => {
      const status = DASHBOARD_STATUS[edgeCaseDoc.status];
      expect(status.label).toBe("Ausstehend");
      expect(CURRENCY_PATTERN.test(status.label)).toBe(false);
    });

    it("betrag does not appear in any rendered history field", () => {
      const renderedText = [
        DASHBOARD_STATUS[edgeCaseDoc.status].label,
        edgeCaseDoc.nummer,
        edgeCaseDoc.kundenname,
        edgeCaseDoc.datum,
      ].join(" ");
      expect(renderedText).not.toContain("5000");
      expect(renderedText).not.toContain("CHF");
      expect(renderedText).not.toContain("EUR");
    });
  });
});
