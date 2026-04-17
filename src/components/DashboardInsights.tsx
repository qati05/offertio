"use client";

/**
 * Dashboard insights — compact KPI strip + revenue sparkline + top customers.
 *
 * Pure presentation layer: all numbers come from computeInsights() in lib/insights.ts.
 * Uses design primitives (.kpi-card, .surface, .bar-row, .kicker) defined in globals.css
 * so spacing/colors stay consistent with the rest of the app and are themable.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
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
      className="insights"
    >
      <div className="insights-kpi-grid">
        <KpiCard
          label="Umsatz Monat"
          value={hasData ? formatCompactCurrency(insights.revenueThisMonth, currency) : "—"}
          hint={hasData ? "Bezahlte Rechnungen" : "Warte auf erste Zahlung"}
          tone="neutral"
        />
        <KpiCard
          label="Offen"
          value={hasData ? formatCompactCurrency(insights.openInvoiceAmount, currency) : "—"}
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
          value={insights.overdueCount ? formatCompactCurrency(insights.overdueAmount, currency) : "—"}
          hint={insights.overdueCount ? `${insights.overdueCount} mahnen` : "Keine Mahnungen"}
          tone={insights.overdueCount > 0 ? "danger" : "neutral"}
          href={insights.overdueCount > 0 ? "/dokumente" : undefined}
        />
        <KpiCard
          label="Abschlussquote"
          value={insights.winRate !== null ? `${Math.round(insights.winRate * 100)}%` : "—"}
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
          className="surface insights-chart"
        >
          <div className="insights-chart-header">
            <span className="kicker">Umsatz · 6 Monate</span>
            <span className="insights-ytd num">
              {formatCompactCurrency(insights.revenueYearToDate, currency)}
              <span className="insights-ytd-label">YTD</span>
            </span>
          </div>
          <RevenueSparkline data={insights.monthlySeries} currency={currency} />
        </motion.div>
      )}

      {insights.topCustomers.length >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="insights-top"
        >
          <div className="insights-top-header">
            <span className="kicker">Top Kunden</span>
          </div>
          <div className="surface">
            {insights.topCustomers.slice(0, 3).map((customer, i, arr) => {
              const max = arr[0].revenue || 1;
              const pct = Math.max(6, Math.round((customer.revenue / max) * 100));
              const slug = toCustomerSlug(customer.name);
              return (
                <Link
                  key={customer.name}
                  href={`/kunden/${encodeURIComponent(slug)}`}
                  className="bar-row focus-ring"
                >
                  <div className="bar-row-main">
                    <div className="bar-row-name">{customer.name}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="bar-row-aside">
                    <div className="bar-row-value num">
                      {formatCompactCurrency(customer.revenue, currency)}
                    </div>
                    <div className="bar-row-count">
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
  const valueClass = [
    "kpi-value",
    tone === "primary" ? "kpi-value--primary" : "",
    tone === "danger" ? "kpi-value--danger" : "",
  ].filter(Boolean).join(" ");

  const content = (
    <>
      <div className="kpi-label">{label}</div>
      <div className={valueClass}>{value}</div>
      <div className="kpi-hint">{hint}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="kpi-card kpi-card-link">
        {content}
      </Link>
    );
  }
  return <div className="kpi-card">{content}</div>;
}

/* ── Revenue Sparkline with hover tooltip ──────────────── */

function RevenueSparkline({
  data,
  currency,
}: {
  data: MonthBucket[];
  currency: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
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

  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="sparkline">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="sparkline-svg"
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
        {activePoint && (
          <line
            x1={activePoint.x}
            y1={padY}
            x2={activePoint.x}
            y2={height - padY}
            stroke="var(--color-primary)"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.35}
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === hoverIdx || i === points.length - 1 ? 3.5 : 2}
            fill="var(--color-primary)"
          />
        ))}
        {/* Invisible wide hitboxes — one per month for easy hover/tap */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={p.x - step / 2}
            y={0}
            width={step}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            onFocus={() => setHoverIdx(i)}
            onBlur={() => setHoverIdx(null)}
            tabIndex={0}
            role="button"
            aria-label={`${p.data.label}: ${formatCompactCurrency(p.data.revenue, currency)}`}
          />
        ))}
      </svg>
      {activePoint && (
        <div
          className="sparkline-tooltip"
          style={{ left: `calc(${(activePoint.x / width) * 100}% - 50px)` }}
        >
          <div className="sparkline-tooltip-month">{activePoint.data.label}</div>
          <div className="sparkline-tooltip-value num">
            {formatCompactCurrency(activePoint.data.revenue, currency)}
          </div>
        </div>
      )}
      <div className="sparkline-axis">
        {data.map((bucket) => (
          <div key={bucket.key} className="sparkline-axis-label">
            {bucket.label}
          </div>
        ))}
      </div>
    </div>
  );
}
