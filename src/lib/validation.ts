/**
 * Guardian of Compliance — DACH Region Validation
 *
 * Zod-based schemas and a single `validateForRegion(data, region)` entry-point.
 * Called before PDF generation to enforce country-specific legal requirements.
 *
 * Principles:
 * - Validation checks the EXISTENCE of required fields
 * - The UI may render amounts (for the PDF), but history/overview must NOT expose them
 * - "No-Leak": betrag is accepted here only to evaluate the AT ≥ 10 000 EUR threshold,
 *   it is never written into history/overview state by this module
 */

import { z } from "zod";
import type { Land } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const nonEmptyString = (msg: string) =>
  z.string({ error: msg }).min(1, msg);

// ── Document input ─────────────────────────────────────────────────────────────

export interface DocumentInput {
  dokumentTyp: "offerte" | "rechnung";
  datum: string;
  leistungsdatum?: string | null;
  /** Kunde e-mail — validated for format, not mandatory unless sendEmail is true */
  kundeEmail?: string | null;
  /** Buyer UID/VAT ID — for DE B2B ZUGFeRD and AT invoices ≥ 10 000 EUR */
  kundeUidMwst?: string | null;
  profil: {
    iban?: string | null;
    uid_mwst?: string | null;
    steuernummer?: string | null;
    land: string;
  };
  /**
   * Brutto total — used ONLY for the AT ≥ 10 000 EUR threshold check.
   * NEVER exposed in history/overview (No-Leak rule).
   */
  betrag?: number;
}

// ── Base schema (all regions) ──────────────────────────────────────────────────

const BaseDocumentSchema = z.object({
  dokumentTyp: z.enum(["offerte", "rechnung"]),
  datum: nonEmptyString("Datum ist erforderlich"),
  leistungsdatum: z.string().nullish(),
  kundeEmail: z.string().email("Ungültige E-Mail-Adresse").nullish().or(z.literal("")).or(z.null()),
  kundeUidMwst: z.string().nullish(),
  betrag: z.number().nonnegative().optional(),
  profil: z.object({
    iban:          z.string().nullish(),
    uid_mwst:      z.string().nullish(),
    steuernummer:  z.string().nullish(),
    land:          z.string(),
  }),
});

// ── SwissInvoiceSchema ─────────────────────────────────────────────────────────
//
// CH: IBAN required for Rechnungen (enables QR-Bill payment slip).
//     UID/MWST-Nr is optional unless VAT is shown — profile.ts handles that gate.
export const SwissInvoiceSchema = BaseDocumentSchema.superRefine((data, ctx) => {
  if (data.dokumentTyp === "rechnung") {
    if (!data.profil.iban?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profil", "iban"],
        message:
          "IBAN ist für Schweizer Rechnungen erforderlich (Swiss QR-Bill / SEPA-Überweisung)",
      });
    }
  }
});

// ── GermanInvoiceSchema ────────────────────────────────────────────────────────
//
// DE §14 Abs. 4 Nr. 6 UStG: Leistungszeitpunkt mandatory on invoices.
// DE §14 Abs. 4 Nr. 2 UStG: Steuernummer OR USt-IdNr required.
export const GermanInvoiceSchema = BaseDocumentSchema.superRefine((data, ctx) => {
  if (data.dokumentTyp === "rechnung") {
    // Leistungsdatum — mandatory
    if (!data.leistungsdatum?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leistungsdatum"],
        message:
          "Leistungsdatum ist für deutsche Rechnungen gesetzlich erforderlich (§14 Abs. 4 Nr. 6 UStG)",
      });
    }
    // Steuernummer OR USt-IdNr required
    const hasSteuernummer = !!data.profil.steuernummer?.trim();
    const hasUstId = !!data.profil.uid_mwst?.trim();
    if (!hasSteuernummer && !hasUstId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profil", "steuernummer"],
        message:
          "Steuernummer oder USt-IdNr. ist für rechtsgültige Rechnungen in Deutschland erforderlich (§14 Abs. 4 Nr. 2 UStG)",
      });
    }
  }
});

// ── AustrianInvoiceSchema ──────────────────────────────────────────────────────
//
// AT §11 Abs. 1 Z 6 UStG:   Leistungsdatum mandatory.
// AT §11 Abs. 1 Z 3 UStG:   UID of issuer mandatory on full invoices (betrag > EUR 400).
// AT §11 Abs. 1 Z 8 UStG:   UID of issuer AND recipient mandatory if betrag ≥ 10 000 EUR.
// AT §11 Abs. 6 UStG:        Kleinbetragsrechnung ≤ EUR 400 — simplified rules apply.
export const AustrianInvoiceSchema = BaseDocumentSchema.superRefine((data, ctx) => {
  if (data.dokumentTyp === "rechnung") {
    // Leistungsdatum — mandatory
    if (!data.leistungsdatum?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leistungsdatum"],
        message:
          "Leistungsdatum ist für österreichische Rechnungen gesetzlich erforderlich (§11 Abs. 1 Z 6 UStG)",
      });
    }
    const betrag = data.betrag ?? 0;
    // > EUR 400: full invoice — issuer UID mandatory (§11 Abs. 1 Z 3 UStG)
    if (betrag > 400 && !data.profil.uid_mwst?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["profil", "uid_mwst"],
        message:
          "Ihre UID-Nummer ist für österreichische Vollrechnungen über EUR 400 gesetzlich erforderlich (§11 Abs. 1 Z 3 UStG)",
      });
    }
    // ≥ 10 000 EUR threshold: recipient UID also mandatory (§11 Abs. 1 Z 8 UStG)
    if (betrag >= 10_000) {
      if (!data.kundeUidMwst?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kundeUidMwst"],
          message:
            "UID-Nummer des Empfängers ist für Rechnungen über EUR 10.000 erforderlich (§11 Abs. 1 Z 8 UStG)",
        });
      }
    }
  }
});

// ── validateForRegion ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  /** Field-keyed error messages, e.g. { leistungsdatum: "...", "profil.iban": "..." } */
  errors: Record<string, string>;
}

/**
 * Validates document input data against the legal requirements of the given region.
 *
 * @example
 * const result = validateForRegion({ dokumentTyp: "rechnung", datum: "2026-04-01", profil: { land: "DE" } }, "DE");
 * if (!result.valid) console.error(result.errors.leistungsdatum);
 */
export function validateForRegion(
  data: DocumentInput,
  region: Land | string,
): ValidationResult {
  let schema: z.ZodTypeAny;
  switch (region) {
    case "DE": schema = GermanInvoiceSchema;  break;
    case "AT": schema = AustrianInvoiceSchema; break;
    default:   schema = SwissInvoiceSchema;   break;
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "general";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
