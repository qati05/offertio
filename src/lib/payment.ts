import type { Land } from "./types";

/**
 * Pricing & Payment configuration for Offertio.
 */

export const FREE_LIMIT = 5; // Documents per month for free plan

/** One-time Gründerplatz. Amounts in the Stripe layer are rappen (24900). */
export const LIFETIME_PRODUCT_NAME = "Gründerplatz";
export const LIFETIME_PRICE_CHF = 249;

export const LIFETIME_FEATURES = [
  "Unlimitierte Dokumente",
  "Swiss QR-Rechnung",
  "E-Mail-Versand",
  "DACH (CH/DE/AT)",
  "3 Sprachen (de/fr/it)",
  "2 Jahre inklusive, danach CHF 9 pro Monat",
] as const;

// ── Pricing ──

export interface PlanPricing {
  monthly: number;
  yearly: number;
  yearlyPerMonth: number;
  earlyMonthly: number;
  earlyYearly: number;
}

export const PRICING: Record<string, PlanPricing> = {
  CHF: { monthly: 28, yearly: 240, yearlyPerMonth: 20, earlyMonthly: 15, earlyYearly: 144 },
  EUR: { monthly: 28, yearly: 240, yearlyPerMonth: 20, earlyMonthly: 15, earlyYearly: 144 },
};

export function getPricing(land?: Land | string): { currency: string; prices: PlanPricing } {
  const currency = land === "DE" || land === "AT" ? "EUR" : "CHF";
  return { currency, prices: PRICING[currency] };
}

// ── Plan checks ──

export type PlanType = "free" | "pro_monthly" | "pro_yearly" | "lifetime";

/** One-time Gründerplatz. Removes the free-plan document limit. */
export function isLifetime(plan?: string): boolean {
  return plan === "lifetime";
}

export function isPro(plan?: string): boolean {
  return plan === "pro_monthly" || plan === "pro_yearly" || plan === "pro" || plan === "lifetime";
}

/**
 * Returns true when the user is currently inside their 14-day full-access
 * trial window. Accepts either an ISO timestamp string or a Date.
 */
export function isInTrial(trialEndsAt?: string | Date | null): boolean {
  if (!trialEndsAt) return false;
  const endsAt =
    trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(endsAt.getTime())) return false;
  return endsAt.getTime() > Date.now();
}

/**
 * Returns the number of whole days left in the trial. 0 once the trial
 * has ended. Rounded UP so "23 hours left" still reads as "1 day left"
 * in banners.
 */
export function trialDaysRemaining(trialEndsAt?: string | Date | null): number {
  if (!trialEndsAt) return 0;
  const endsAt =
    trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(endsAt.getTime())) return 0;
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * A user has full access when they are on a Pro plan OR still inside their
 * trial window. This is the one function feature gates should rely on.
 */
export function hasActiveAccess(
  plan?: string,
  trialEndsAt?: string | Date | null,
): boolean {
  return isPro(plan) || isInTrial(trialEndsAt);
}

export const TRIAL_DAYS = 14;

export function getMonthlyDocCount(): number {
  if (typeof window === "undefined") return 0;
  const key = getMonthKey();
  return parseInt(localStorage.getItem(key) || "0", 10);
}

export function incrementMonthlyDocCount(): void {
  if (typeof window === "undefined") return;
  const key = getMonthKey();
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(current + 1));
}

export function canCreateDocument(
  plan?: string,
  trialEndsAt?: string | Date | null,
): boolean {
  if (hasActiveAccess(plan, trialEndsAt)) return true;
  return getMonthlyDocCount() < FREE_LIMIT;
}

export function remainingFreeDocuments(
  plan?: string,
  trialEndsAt?: string | Date | null,
): number {
  if (hasActiveAccess(plan, trialEndsAt)) return Infinity;
  return Math.max(0, FREE_LIMIT - getMonthlyDocCount());
}

function getMonthKey(): string {
  const now = new Date();
  return `offertio_docs_${now.getFullYear()}_${now.getMonth() + 1}`;
}

// Checkout is a server-created Stripe Session (see /api/checkout/lifetime).
// Without STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET the upgrade UI stays
// visible and the checkout button stays disabled.

// ── Pro features list ──

export const PRO_FEATURES = [
  "Unlimitierte Dokumente",
  "Swiss QR-Rechnung",
  "E-Mail-Versand",
  "DACH (CH/DE/AT)",
  "3 Sprachen (de/fr/it)",
];
