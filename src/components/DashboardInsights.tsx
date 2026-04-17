"use client";

/**
 * Dashboard insights — compact KPI strip + revenue sparkline + top customers.
 *
 * Pure presentation layer: all numbers come from computeInsights() in lib/insights.ts.
 * Renders gracefully when history is empty (shows "—" placeholders instead of zeros
 * so new users don't see misleadingly optimistic metrics).
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { computeInsights, formatCompactCurrency, type MonthBucket } from "@/lib/insights";
import { toCustomerSlug } from "@/lib/customers";
import type { DokumentHistorie } from "@/lib/types";

const ease = [0.16, 1, 0.3, 1] as const;

interface Props {
  history: DokumentHistorie[];
  currency: string;
}

export default function DashboardInsights({ history, currency }: Props) {
  const insights = useMemo(() => computeInsights(history), [history]);
  const hasAnyPaidInvoice = insights.monthlySeries.some((b) => b.count > 0);
  const hasData = history.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.14, ease }}
      style={{ marginBottom: 40 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <KpiCard
          label="Umsatz Monat"
          value={hasData ? formatCompactCurrency(insights.revenueThisMonth, currency) : "—"}
          hint={hasData ? "Bezahlte Rechnungen" : "Warte auf erste Zahlung"}
          tone="neutral"
        />
        <KpiCard
          label="Offen"
          value={
            hasData
              ? formatCompactCurrency(insights.openInvoiceAmount, currency)
              : "—"
          }
          hint={
            insights.openInvoiceCount
              ? `${insights.openInvoiceCount} ${insights.openInvoiceCount === 1 ? "Rechnung" : "Rechnungen"}`
              : "Alles beglichen"
          }
          tone={insights.openInvoiceCount > 0 ? "primary" : "neutral"}
          href="/dokumente"
        />
        <KpiCard
          label="Überfällig"
          value={
            insights.overdueCount
              ? formatCompactCurrency(insights.overdueAmount, currency)
              : "—"
          }
          hint={
            insights.overdueCount
              ? `${insights.overdueCount} mahnen`
              : "Keine Mahnungen"
          }
          tone={insights.overdueCount > 0 ? "danger" : "neutral"}
          href={insights.overdueCount > 0 ? "/dokumente" : undefined}
        />
        <KpiCard
          label="Abschlussquote"
          value={
            insights.winRate !== null
              ? `${Math.round(insights.winRate * 100)}%`
              : "—"
          }
          hint={
            insights.winRateSample > 0
              ? `${insights.winRateSample} Offerten entschieden`
              : "Zu wenig Daten"
          }
          tone="neutral"
        />
      </div>

      {hasAnyPaidInvoice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          style={{
            background: "var(--app-card)",
            border: "1px solid var(--app-border)",
            borderRadius: 16,
            padding: "18px 20px 12px",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.13em",
              textTransform: "uppercase", color: "var(--app-text-soft)",
            }}>
              Umsatz · 6 Monate
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "var(--app-text)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatCompactCurrency(insights.revenueYearToDate, currency)}
              <span style={{ color: "var(--app-text-soft)", fontWeight: 400, marginLeft: 6 }}>
                YTD
              </span>
            </div>
          </div>
          <RevenueSparkline data={insights.monthlySeries} currency={currency} />
        </motion.div>
      )}

      {insights.topCustomers.length >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginTop: 14 }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.13em",
              textTransform: "uppercase", color: "var(--app-text-soft)",
            }}>
              Top Kunden
            </div>
          </div>
          <div style={{
            background: "var(--app-card)",
            border: "1px solid var(--app-border)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {insights.topCustomers.slice(0, 3).map((customer, i, arr) => {
              const max = arr[0].revenue || 1;
              const pct = Math.max(6, Math.round((customer.revenue / max) * 100));
              const slug = toCustomerSlug(customer.name);
              return (
                <Link
                  key={customer.name}
                  href={`/kunden/${encodeURIComponent(slug)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    borderBottom: i < arr.length - 1 && i < 2 ? "1px solid var(--app-border)" : "none",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      color: "var(--app-text)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      marginBottom: 6,
                    }}>
                      {customer.name}
                    </div>
                    <div style={{
                      height: 4,
                      background: "var(--app-card-muted)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "var(--color-primary)",
                        borderRadius: 2,
                        transition: "width 0.8s var(--ease-out-expo)",
                      }} />
                    </div>
                  </div>
                  <div style={{
                    flexShrink: 0,
                    textAlign: "right",
                    minWidth: 90,
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: "var(--app-text)",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {formatCompactCurrency(customer.revenue, currency)}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "var(--app-text-soft)",
                      marginTop: 2,
                    }}>
                      {customer.docs} {customer.docs === 1 ? "Rechnung" : "Rechnungen"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

/* ── KPI Card ──────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "primary" | "danger";
  href?: string;
}) {
  const toneColors = {
    neutral: "var(--app-text)",
    primary: "var(--color-primary-strong, #a8622e)",
    danger: "#B91C1C",
  };

  const content = (
    <>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--app-text-soft)",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em",
        color: toneColors[tone],
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
        marginBottom: 4,
        fontFamily: "var(--font-display)",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, lineHeight: 1.3,
        color: "var(--app-text-muted)",
      }}>
        {hint}
      </div>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    background: "var(--app-card)",
    border: "1px solid var(--app-border)",
    borderRadius: 14,
    padding: "14px 16px",
    textDecoration: "none",
    color: "inherit",
    display: "block",
    transition: "border-color 0.15s ease, transform 0.15s ease",
  };

  if (href) {
    return (
      <Link href={href} style={sharedStyle} className="kpi-card-link">
        {content}
      </Link>
    );
  }
  return <div style={sharedStyle}>{content}</div>;
}

/* ── Revenue Sparkline ─────────────────────────────────── */

function RevenueSparkline({
  data,
  currency,
}: {
  data: MonthBucket[];
  currency: string;
}) {
  const width = 640;
  const height = 76;
  const padY = 10;
  const padX = 4;

  const max = Math.max(1, ...data.map((d) => d.revenue));
  const step = (width - padX * 2) / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * step;
    const y = padY + (height - padY * 2) * (1 - d.revenue / max);
    return { x, y, data: d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ display: "block" }}
        aria-label="Umsatzverlauf der letzten 6 Monate"
      >
        <defs>
          <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 3 : 2}
            fill="var(--color-primary)"
          />
        ))}
      </svg>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 8,
        padding: "0 2px",
      }}>
        {data.map((bucket) => (
          <div
            key={bucket.key}
            title={formatCompactCurrency(bucket.revenue, currency)}
            style={{
              fontSize: 10,
              color: "var(--app-text-soft)",
              letterSpacing: "0.04em",
              textAlign: "center",
              flex: 1,
            }}
          >
            {bucket.label}
          </div>
        ))}
      </div>
    </div>
  );
}
