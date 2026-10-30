/**
 * Public landing copy (Verkaufsseite v1, with the v2 founder block,
 * guarantee, extra FAQs and closing CTA). Strings are verbatim.
 * Placeholders in square brackets are not shown.
 */

export const SALE_TITLE =
  "Offertio – Offerten und QR-Rechnungen für Schweizer Kleinbetriebe";

export const SALE_DESCRIPTION =
  "Offerten und Swiss QR-Rechnungen mit Ihrem Logo erstellen, ohne Buchhaltungssoftware. Gemacht für Einzelfirmen und Kleinbetriebe in der Schweiz.";

export const SALE_H1 =
  "Sie brauchen keine Buchhaltungssoftware. Sie brauchen Offerten und Rechnungen, die sofort stimmen.";

export const SALE_SUB =
  "Offertio erstellt Offerten und Swiss QR-Rechnungen mit Ihrem Logo, in CHF und mit MwSt. Für Einzelfirmen und Kleinbetriebe, denen die grossen Programme zu viel sind.";

export const SALE_PROBLEM_TITLE = "Das Problem";

export const SALE_PROBLEM =
  "Sie schreiben Rechnungen in Word oder Excel. Jedes Mal kopieren Sie die alte, ändern Datum und Betrag und hoffen, dass der QR-Code stimmt. Und am Abend, nach der eigentlichen Arbeit, sitzen Sie noch an der Offerte.";

export const SALE_WHY_TITLE = "Warum Offertio";

export const SALE_WHY =
  "Offertio macht nur zwei Dinge: Offerten und Rechnungen. Keine Buchhaltung, keine Lohnabrechnung, kein Handbuch. Aus einer Offerte wird mit einem Klick eine Rechnung, mit korrekter Swiss QR-Rechnung.";

/** Caption kept for the later GIF. The measured-time placeholder is omitted. */
export const SALE_DEMO_CAPTION =
  "Eine Offerte und eine QR-Rechnung, vom leeren Formular zum PDF.";

export const SALE_INCLUDED_TITLE = "Was drin ist";

export const SALE_INCLUDED = [
  "Offerten und Rechnungen als PDF mit Ihrem Logo",
  "Swiss QR-Rechnung, korrekt nach Schweizer Standard",
  "Offerte in Rechnung umwandeln, ohne Abtippen",
  "Vorlagen und Preisliste für Ihre Leistungen",
  "CSV-Export für Ihren Treuhänder",
  "ZUGFeRD für Kunden in Deutschland",
] as const;

export const FOUNDER_TERM_LINE =
  "2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer";

export const SALE_FOUNDER_TITLE = `Offertio Gründerplatz: ${FOUNDER_TERM_LINE}`;

export const SALE_PROMISE_TITLE = "Unser Versprechen an Gründer";

export const SALE_PROMISE_EXPORT = "Daten jederzeit als PDF/CSV exportierbar.";

export const SALE_FOUNDER_INCLUDES = [
  "Wir richten Offertio für Sie ein, innert 48 Stunden. Sie schicken uns Logo, Firmendaten und Preisliste, gerne auch als Excel oder Foto. Wir richten Ihre Vorlagen und Artikel ein.",
  "Alle künftigen Funktionen inklusive. 2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer.",
  "Sie bestimmen mit. Wünschen Sie sich Funktionen. Sie haben einen direkten Draht zu uns per E-Mail.",
] as const;

export const SALE_OFFER_ENDS =
  "Das Angebot endet am 27.11. um 23:59 Uhr, auch wenn dann noch Plätze frei sind.";

export const SALE_GUARANTEE_TITLE = "Zwei Garantien. Ihr Risiko: null.";

export const SALE_GUARANTEES = [
  "30 Tage Geld zurück. Ohne Begründung, ohne Rückfragen.",
  "Die 48-Stunden-Garantie. Ist Ihre erste Offerte 48 Stunden nach Erhalt Ihrer Unterlagen nicht verschickbar, erhalten Sie Ihr Geld sofort zurück und dürfen Offertio trotzdem behalten.",
] as const;

export const SALE_FAQ_TITLE = "Fragen";

export const SALE_CLOSE_TITLE =
  "20 Gründerplätze. Einmal bezahlen. Nie mehr Word-Rechnungen.";

export const SALE_CLOSE_ENDS = "Das Angebot endet am 27.11. um 23:59 Uhr.";

export const SALE_CLOSE_GUARANTEE =
  "30 Tage Geld zurück, plus die 48-Stunden-Garantie.";

export const SALE_CTA_SUPPORT = "Einmal bezahlen. 30 Tage Geld-zurück-Garantie.";

export const FOUNDER_CTA_LABEL = "Gründerplatz sichern, CHF 249";

export const FOUNDER_CTA_HREF = "/gruenderplatz";

/** 27.11.2026 23:59 Europe/Zurich (CET, UTC+1). The offer ends at this instant. */
export const FOUNDER_OFFER_DEADLINE_ISO = "2026-11-27T23:59:00+01:00";

export const OFFER_EXPIRED_NOTICE = "Das Angebot endete am 27.11.2026 um 23:59 Uhr.";

export const OFFER_SOLD_OUT_NOTICE = "Alle Gründerplätze sind vergeben.";

export type FounderSeats = {
  remaining: number;
  limit: number;
};

export type SaleOfferState = "open" | "expired" | "sold_out";

export type SaleFaq = {
  question: string;
  answer: string;
};

const SUBSCRIPTION_PRICE_RE = /^\d{1,6}([.,]\d{1,2})?$/;
const MIN_TERM_DMY = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const MIN_TERM_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Regular monthly price after the 20 founder seats. Env overrides this anchor. */
export const DEFAULT_SUBSCRIPTION_PRICE_CHF = "19";
export const REGULAR_YEARLY_PRICE_CHF = "190";
export const SETUP_FEE_CHF = "99";

/** Included access after the one-time CHF 249 payment. The CHF 9 subscription comes later. */
export const FOUNDER_INCLUDED_YEARS = 2;

/**
 * Single source for the regular monthly price.
 * Unset uses CHF 19. Invalid values are ignored so the page does not show a guessed figure.
 */
export function getSubscriptionPriceChf(
  raw: string | undefined = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_CHF,
): string | null {
  const trimmed = raw?.trim() ?? "";
  const value = trimmed === "" ? DEFAULT_SUBSCRIPTION_PRICE_CHF : trimmed;
  if (!SUBSCRIPTION_PRICE_RE.test(value)) return null;
  const numeric = Number(value.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return value;
}

export function subscriptionPriceSentence(price: string | null): string | null {
  if (!price) return null;
  return `Danach regulär CHF ${price} pro Monat oder CHF ${REGULAR_YEARLY_PRICE_CHF} pro Jahr. Einrichtung einmalig CHF ${SETUP_FEE_CHF}.`;
}

/**
 * Mindestlaufzeit date. Accepts DD.MM.YYYY or YYYY-MM-DD.
 * Returns null when unset or not a real calendar date, so those lines stay hidden.
 */
export function getFounderMinTermDate(
  raw: string | undefined = process.env.NEXT_PUBLIC_FOUNDER_MIN_TERM_DATE,
): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const dmy = MIN_TERM_DMY.exec(value);
  if (dmy) return isRealDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1])) ? value : null;
  const iso = MIN_TERM_ISO.exec(value);
  if (!iso) return null;
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  if (!isRealDate(year, month, day)) return null;
  return `${iso[3]}.${iso[2]}.${iso[1]}`;
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function founderPromiseLines(date: string | null): string[] {
  const lines = [SALE_PROMISE_EXPORT];
  if (!date) return lines;
  return [
    `Mindestlaufzeit bis ${date}.`,
    SALE_PROMISE_EXPORT,
    `Mindestens 6 Monate Vorwarnung bei Einstellung, mit anteiliger Rückerstattung vor ${date}.`,
  ];
}

/** Calendar end of the included 2 years. Matches `paid_at + interval '2 years'`. */
export function founderAccessUntil(paidAt: Date): Date {
  const until = new Date(paidAt.getTime());
  until.setUTCFullYear(until.getUTCFullYear() + FOUNDER_INCLUDED_YEARS);
  return until;
}

export function isFounderOfferExpired(now: Date = new Date()): boolean {
  return now.getTime() > Date.parse(FOUNDER_OFFER_DEADLINE_ISO);
}

/**
 * Real seat numbers only. `null` when the cap is off or the payload is unusable,
 * so the counter can be hidden instead of showing a placeholder.
 */
export function parseSeatAvailability(data: unknown, limit: number | null): FounderSeats | null {
  if (limit == null || !Number.isInteger(limit) || limit < 1) return null;
  if (!data || typeof data !== "object") return null;
  const remaining = (data as { remaining?: unknown }).remaining;
  if (typeof remaining !== "number" || !Number.isInteger(remaining)) return null;
  if (remaining < 0 || remaining > limit) return null;
  return { remaining, limit };
}

/** `noch X von N frei` — lowercase, as used inside a sentence. */
export function seatCounter(seats: FounderSeats | null): string | null {
  if (!seats) return null;
  return `noch ${seats.remaining} von ${seats.limit} frei`;
}

/** Sentence-initial form from the closing block. */
export function seatCounterSentence(seats: FounderSeats | null): string | null {
  const counter = seatCounter(seats);
  if (!counter) return null;
  return `Noch ${seats!.remaining} von ${seats!.limit} frei.`;
}

export function founderAvailabilitySentence(seats: FounderSeats | null): string {
  const lead = `CHF 249 einmalig. ${FOUNDER_TERM_LINE}. Nur 20 Plätze`;
  const counter = seatCounter(seats);
  if (!counter) return `${lead}.`;
  return `${lead}, ${counter}.`;
}

export function saleOfferState(expired: boolean, seats: FounderSeats | null): SaleOfferState {
  if (expired) return "expired";
  if (seats && seats.remaining === 0) return "sold_out";
  return "open";
}

const FAQ_BOOKKEEPING = {
  question: "Brauche ich Buchhaltungswissen?",
  answer: "Nein. Sie füllen Kunde, Leistung und Betrag aus, Offertio erledigt den Rest.",
};

const FAQ_QR = {
  question: "Ist die QR-Rechnung gültig?",
  answer: "Offertio erstellt die Swiss QR-Rechnung nach dem Schweizer Standard.",
};

const FAQ_FOUNDER_TERM = {
  question: "Was deckt der Gründerplatz?",
  answer: `Einmal CHF 249. ${FOUNDER_TERM_LINE}.`,
};

const FAQ_TRUSTEE = {
  question: "Funktioniert es mit meinem Treuhänder?",
  answer: "Sie exportieren Ihre Rechnungen als CSV und geben sie weiter.",
};

const FAQ_FIT = {
  question: "Was, wenn es mir nicht passt?",
  answer: "Innerhalb von 30 Tagen bekommen Sie Ihr Geld zurück.",
};

const FAQ_CALL = {
  question: "Kann ich anrufen?",
  answer: "Der Support läuft per E-Mail, so bekommen Sie eine schriftliche und nachvollziehbare Antwort.",
};

export function afterSeatsAnswer(price: string | null): string {
  const kept = `${FOUNDER_TERM_LINE}.`;
  if (!price) return kept;
  return `Dann gibt es Offertio nur noch regulär: danach regulär CHF ${price} pro Monat oder CHF ${REGULAR_YEARLY_PRICE_CHF} pro Jahr, Einrichtung einmalig CHF ${SETUP_FEE_CHF}. ${kept}`;
}

export function buildFaqs(price: string | null): SaleFaq[] {
  return [
    FAQ_BOOKKEEPING,
    FAQ_QR,
    FAQ_FOUNDER_TERM,
    FAQ_TRUSTEE,
    FAQ_FIT,
    {
      question: "Was passiert nach den 20 Plätzen?",
      answer: afterSeatsAnswer(price),
    },
    FAQ_CALL,
  ];
}
