import type { DokumentTyp } from "./types";

const PREFIX: Record<DokumentTyp, string> = {
  offerte: "OF",
  rechnung: "RE",
};

function storageKey(typ: DokumentTyp): string {
  const year = new Date().getFullYear();
  return `offertio_${typ}_${year}`;
}

export function peekNextNummer(typ: DokumentTyp): string {
  if (typeof window === "undefined") return `${PREFIX[typ]}-0000-001`;
  const raw = localStorage.getItem(storageKey(typ));
  const parsed = parseInt(raw ?? "0", 10);
  // Guard against corrupt/non-numeric values: fall back to 0 so the next number is 001
  const current = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const next = current + 1;
  const year = new Date().getFullYear();
  return `${PREFIX[typ]}-${year}-${String(next).padStart(3, "0")}`;
}

export function commitNummer(typ: DokumentTyp): void {
  if (typeof window === "undefined") return;
  const key = storageKey(typ);
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(current + 1));
}

export function getDokumentCount(typ?: DokumentTyp): number {
  if (typeof window === "undefined") return 0;
  const year = new Date().getFullYear();
  if (typ) {
    return parseInt(localStorage.getItem(`offertio_${typ}_${year}`) || "0", 10);
  }
  // Total: offerte + rechnung + legacy
  const of = parseInt(localStorage.getItem(`offertio_offerte_${year}`) || "0", 10);
  const re = parseInt(localStorage.getItem(`offertio_rechnung_${year}`) || "0", 10);
  const legacy = parseInt(localStorage.getItem(`offertio_nummer_${year}`) || "0", 10);
  return of + re + legacy;
}
