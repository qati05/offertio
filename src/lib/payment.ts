import type { Land } from "./types";

/**
 * Pricing & Payment configuration for Offertio.
 */

export const FREE_LIMIT = 5; // Documents per month for free plan

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

export type PlanType = "free" | "pro_monthly" | "pro_yearly";

export function isPro(plan?: string): boolean {
  return plan === "pro_monthly" || plan === "pro_yearly" || plan === "pro";
}

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

export function canCreateDocument(plan?: string): boolean {
  if (isPro(plan)) return true;
  return getMonthlyDocCount() < FREE_LIMIT;
}

export function remainingFreeDocuments(plan?: string): number {
  if (isPro(plan)) return Infinity;
  return Math.max(0, FREE_LIMIT - getMonthlyDocCount());
}

function getMonthKey(): string {
  const now = new Date();
  return `offertio_docs_${now.getFullYear()}_${now.getMonth() + 1}`;
}

// ── Lemon Squeezy checkout URLs ──

export type CheckoutType = "pro_monthly" | "pro_yearly" | "early_monthly" | "early_yearly";

const LS_ENV_KEYS: Record<CheckoutType, string> = {
  pro_monthly: "NEXT_PUBLIC_LS_PRO_MONTHLY",
  pro_yearly: "NEXT_PUBLIC_LS_PRO_YEARLY",
  early_monthly: "NEXT_PUBLIC_LS_EARLY_MONTHLY",
  early_yearly: "NEXT_PUBLIC_LS_EARLY_YEARLY",
};

export function isCheckoutConfigured(type: CheckoutType = "pro_monthly"): boolean {
  const envKey = LS_ENV_KEYS[type];
  return Boolean(typeof process !== "undefined" && process.env?.[envKey]);
}

export function getCheckoutUrl(type: CheckoutType = "pro_monthly", email?: string, userId?: string): string {
  const envKey = LS_ENV_KEYS[type];
  const base = (typeof process !== "undefined" && process.env?.[envKey]) || "#upgrade";
  if (base === "#upgrade") return base;
  const params = new URLSearchParams();
  if (email) params.set("checkout[email]", email);
  if (userId) params.set("checkout[custom][user_id]", userId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ── Pro features list ──

export const PRO_FEATURES = [
  "Unlimitierte Dokumente",
  "Swiss QR-Rechnung",
  "E-Mail-Versand",
  "DACH (CH/DE/AT)",
  "3 Sprachen (de/fr/it)",
];
