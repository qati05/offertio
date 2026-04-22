/**
 * Canonical document status — single source of truth.
 *
 * Exports:
 *   - STATUS_MAP / getStatus()         → labels, colors, bg tints
 *   - statusBadgeVariants              → framer-motion cross-fade
 *   - computeDocumentStatus()          → auto-derives ueberfaellig / abgelaufen
 *   - countOpenActions()               → badge count for reminder UI
 */

import type { Variants } from "framer-motion";
import type { DokumentHistorie } from "./types";

// ── Status display config ─────────────────────────────────────────────────────

export type StatusKey =
  | "entwurf"
  | "gesendet"
  | "angenommen"
  | "bezahlt"
  | "abgelaufen"
  | "ueberfaellig"
  | "offen";

export interface StatusConfig {
  /** Process-language label — NEVER contains amounts or currency */
  label: string;
  /** Foreground color (CSS value) */
  color: string;
  /** Background tint for badge pill */
  bg: string;
}

export const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  entwurf:      { label: "In Arbeit",  color: "var(--app-text-soft)",  bg: "rgba(107,114,128,0.07)" },
  gesendet:     { label: "Ausstehend", color: "var(--color-primary)",  bg: "rgba(200,121,61,0.07)"  },
  offen:        { label: "Ausstehend", color: "var(--color-primary)",  bg: "rgba(200,121,61,0.07)"  },
  angenommen:   { label: "Bestätigt",  color: "#1A7F42",               bg: "rgba(26,127,66,0.07)"   },
  bezahlt:      { label: "Erledigt",   color: "#1A7F42",               bg: "rgba(26,127,66,0.07)"   },
  abgelaufen:   { label: "Abgelaufen", color: "var(--app-text-muted)", bg: "rgba(107,114,128,0.07)" },
  ueberfaellig: { label: "Überfällig", color: "#B91C1C",               bg: "rgba(185,28,28,0.07)"   },
};

/** Resolves any status string to a StatusConfig, falling back to 'offen'. */
export function getStatus(key: string): StatusConfig {
  return STATUS_MAP[key as StatusKey] ?? STATUS_MAP.offen;
}

// ── Framer-motion variants ────────────────────────────────────────────────────

/**
 * AnimatePresence cross-fade for status badge transitions.
 *
 * @example
 *   <AnimatePresence mode="wait" initial={false}>
 *     <motion.span key={doc.status} variants={statusBadgeVariants} initial="enter" animate="visible" exit="exit">
 *       {st.label}
 *     </motion.span>
 *   </AnimatePresence>
 */
export const statusBadgeVariants: Variants = {
  enter:   { opacity: 0, y: 3,  scale: 0.88, filter: "blur(2px)" },
  visible: { opacity: 1, y: 0,  scale: 1,    filter: "blur(0px)", transition: { duration: 0.2,  ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -3, scale: 0.88, filter: "blur(2px)", transition: { duration: 0.13, ease: [0.4,  0,   1,   1] } },
};

// ── Auto-expiry logic ─────────────────────────────────────────────────────────

/**
 * Compute the effective display status of a document.
 *
 * Stored status is authoritative for manually-set states (bezahlt, angenommen).
 * We auto-derive:
 *  - "ueberfaellig": Rechnung that was gesendet and past zahlungsfrist days
 *  - "abgelaufen":   Offerte that was gesendet and past 30 days
 *
 * Only overrides when stored status is "gesendet".
 */
export function computeDocumentStatus(
  doc: DokumentHistorie,
  zahlungsfristTage: number = 30,
): DokumentHistorie {
  if (doc.status !== "gesendet") return doc;

  const now = Date.now();
  const docDate = new Date(doc.datum).getTime();
  const daysSince = (now - docDate) / (1000 * 60 * 60 * 24);

  if (doc.typ === "rechnung" && daysSince > zahlungsfristTage) {
    return { ...doc, status: "ueberfaellig" };
  }
  if (doc.typ === "offerte" && daysSince > 30) {
    return { ...doc, status: "abgelaufen" };
  }
  return doc;
}

/**
 * Count documents that need attention (sent but not yet resolved).
 */
export function countOpenActions(docs: DokumentHistorie[], zahlungsfristTage = 30): number {
  return docs.filter((doc) => {
    const effective = computeDocumentStatus(doc, zahlungsfristTage);
    return ["gesendet", "ueberfaellig"].includes(effective.status);
  }).length;
}

// ── Mahnstufe (payment reminder stage) ────────────────────────────────────────

/** German-language label for each Mahnstufe. Stage 0 = not sent. */
export const MAHNSTUFE_LABEL: Record<number, string> = {
  0: "Keine Mahnung",
  1: "Zahlungserinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
};

/** Short badge label (compact variant used inside doc rows). */
export const MAHNSTUFE_SHORT: Record<number, string> = {
  1: "Erinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
};

/** Maximum stage the UI offers — anything beyond goes to a collection agency. */
export const MAX_MAHNSTUFE = 3;

/**
 * Is this invoice overdue and unpaid — i.e. a candidate for a Mahnung?
 * Only meaningful for Rechnungen. Uses the effective status (after
 * computeDocumentStatus) so freshly-overdue invoices are also flagged.
 */
export function isMahnungCandidate(
  doc: DokumentHistorie,
  zahlungsfristTage = 30,
): boolean {
  if (doc.typ !== "rechnung") return false;
  if (doc.payment_received_at) return false;
  const eff = computeDocumentStatus(doc, zahlungsfristTage);
  return eff.status === "ueberfaellig" || eff.status === "gesendet";
}
