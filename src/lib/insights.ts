/**
 * Business insights — pure computation over document history.
 *
 * All functions are deterministic, side-effect free, and take an optional
 * `now` parameter so tests can pin the clock. Units: amounts are in the
 * user's currency (no conversion), time is always ISO date strings.
 *
 * The computeDocumentStatus() helper is applied BEFORE insights run,
 * so "ueberfaellig" / "abgelaufen" states are already reflected.
 */

import type { DokumentHistorie } from "./types";

export interface MonthBucket {
  /** YYYY-MM key for stable sorting and lookups */
  key: string;
  /** Localized short month label, e.g. "Apr" */
  label: string;
  /** Total revenue from paid invoices in this month */
  revenue: number;
  /** Count of paid invoices in this month */
  count: number;
}

export interface TopCustomer {
  name: string;
  revenue: number;
  docs: number;
  /** Most-recent document date (ISO) — useful for recency sorting */
  lastActivity: string;
}

export interface Insights {
  /** Revenue from invoices marked as paid in the current calendar month */
  revenueThisMonth: number;
  /** Revenue from paid invoices in the last 30 days (rolling window) */
  revenueLast30Days: number;
  /** Year-to-date paid revenue */
  revenueYearToDate: number;
  /** Sum of open (sent/overdue) invoice amounts */
  openInvoiceAmount: number;
  openInvoiceCount: number;
  /** Subset of open that's past the payment deadline */
  overdueAmount: number;
  overdueCount: number;
  /**
   * Win rate: accepted offers divided by decided offers (accepted + expired).
   * Range [0, 1]. Null if no offers have been decided yet.
   */
  winRate: number | null;
  winRateSample: number;
  /** Average invoice amount across all invoices (paid + unpaid) */
  averageInvoiceAmount: number;
  /** Last 6 months of paid-revenue buckets, oldest first */
  monthlySeries: MonthBucket[];
  /** Top 5 customers by lifetime revenue (from paid invoices) */
  topCustomers: TopCustomer[];
}

const MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isPaidInvoice(doc: DokumentHistorie): boolean {
  return doc.typ === "rechnung" && doc.status === "bezahlt";
}

function isOpenInvoice(doc: DokumentHistorie): boolean {
  return doc.typ === "rechnung" && (doc.status === "gesendet" || doc.status === "ueberfaellig");
}

export function computeInsights(
  history: DokumentHistorie[],
  now: Date = new Date(),
): Insights {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let revenueThisMonth = 0;
  let revenueLast30Days = 0;
  let revenueYearToDate = 0;
  let openInvoiceAmount = 0;
  let openInvoiceCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let invoiceSum = 0;
  let invoiceCount = 0;
  let offersAccepted = 0;
  let offersExpired = 0;

  const customerTotals = new Map<string, TopCustomer>();

  for (const doc of history) {
    const amount = Number.isFinite(doc.betrag) ? doc.betrag : 0;
    const docDate = new Date(doc.datum);

    if (doc.typ === "rechnung") {
      invoiceSum += amount;
      invoiceCount += 1;
    }

    if (isPaidInvoice(doc)) {
      if (docDate >= startOfMonth) revenueThisMonth += amount;
      if (docDate >= thirtyDaysAgo) revenueLast30Days += amount;
      if (docDate >= startOfYear) revenueYearToDate += amount;

      const name = (doc.kundenname || "").trim() || "Unbekannter Kunde";
      const key = name.toLowerCase();
      const existing = customerTotals.get(key);
      if (existing) {
        existing.revenue += amount;
        existing.docs += 1;
        if (new Date(doc.datum).getTime() > new Date(existing.lastActivity).getTime()) {
          existing.lastActivity = doc.datum;
        }
      } else {
        customerTotals.set(key, {
          name,
          revenue: amount,
          docs: 1,
          lastActivity: doc.datum,
        });
      }
    }

    if (isOpenInvoice(doc)) {
      openInvoiceAmount += amount;
      openInvoiceCount += 1;
      if (doc.status === "ueberfaellig") {
        overdueAmount += amount;
        overdueCount += 1;
      }
    }

    if (doc.typ === "offerte") {
      if (doc.status === "angenommen") offersAccepted += 1;
      else if (doc.status === "abgelaufen") offersExpired += 1;
    }
  }

  const winRateSample = offersAccepted + offersExpired;
  const winRate = winRateSample === 0 ? null : offersAccepted / winRateSample;
  const averageInvoiceAmount = invoiceCount === 0 ? 0 : invoiceSum / invoiceCount;

  return {
    revenueThisMonth,
    revenueLast30Days,
    revenueYearToDate,
    openInvoiceAmount,
    openInvoiceCount,
    overdueAmount,
    overdueCount,
    winRate,
    winRateSample,
    averageInvoiceAmount,
    monthlySeries: buildMonthlySeries(history, now, 6),
    topCustomers: Array.from(customerTotals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
  };
}

/**
 * Build a contiguous series of the last N months (oldest first), backfilling
 * empty months with zeros so charts don't have gaps.
 */
export function buildMonthlySeries(
  history: DokumentHistorie[],
  now: Date,
  monthCount: number,
): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: MONTHS_DE[d.getMonth()],
      revenue: 0,
      count: 0,
    });
  }

  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

  for (const doc of history) {
    if (!isPaidInvoice(doc)) continue;
    const key = monthKey(new Date(doc.datum));
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;
    bucket.revenue += Number.isFinite(doc.betrag) ? doc.betrag : 0;
    bucket.count += 1;
  }

  return buckets;
}

/**
 * Format a currency amount using de-CH locale (compact, zero-decimal above 10k).
 * Pure helper — used by insight UI components.
 */
export function formatCompactCurrency(amount: number, currency: string = "CHF"): string {
  const abs = Math.abs(amount);
  if (abs >= 10_000) {
    return `${currency} ${Math.round(amount).toLocaleString("de-CH")}`;
  }
  return `${currency} ${amount.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
