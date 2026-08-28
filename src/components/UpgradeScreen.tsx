"use client";

import { useState } from "react";
import {
  getPricing,
  getCheckoutUrl,
  isCheckoutConfigured,
  PRO_FEATURES,
  FREE_LIMIT,
  TRIAL_DAYS,
  getMonthlyDocCount,
  isInTrial,
  trialDaysRemaining,
} from "@/lib/payment";
import { trackUpgradeClick } from "@/lib/analytics";
import type { Land } from "@/lib/types";

interface UpgradeScreenProps {
  email?: string;
  land?: Land;
  /**
   * The buyer's profile id. Forwarded to Lemon Squeezy as
   * checkout[custom][user_id] — the webhook grants the plan only when it can
   * read a valid UUID there and deliberately refuses to fall back to the
   * email address, so omitting this means the customer pays and stays free.
   */
  userId?: string;
  /** ISO timestamp when the user's trial ends (null if no trial). */
  trialEndsAt?: string | null;
  onClose?: () => void;
}

export default function UpgradeScreen({ email, land, userId, trialEndsAt, onClose }: UpgradeScreenProps) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [offlineHint, setOfflineHint] = useState(false);
  const { currency, prices } = getPricing(land);
  const docCount = getMonthlyDocCount();
  const billingOptions: { key: "monthly" | "yearly"; label: string }[] = [
    { key: "monthly", label: "Monatlich" },
    { key: "yearly", label: "Jährlich" },
  ];

  const price = billing === "yearly" ? prices.yearlyPerMonth : prices.monthly;
  const checkoutType = billing === "yearly" ? "pro_yearly" : "pro_monthly";
  const checkoutReady = isCheckoutConfigured(checkoutType);
  const remaining = Math.max(0, FREE_LIMIT - docCount);
  const inTrial = isInTrial(trialEndsAt ?? null);
  const daysLeft = trialDaysRemaining(trialEndsAt ?? null);

  const title = inTrial
    ? `Dein Test läuft in ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tagen"} ab.`
    : "Dein Free-Kontingent ist fast aufgebraucht.";

  const description = inTrial
    ? `Du testest Offertio gerade mit vollem Zugriff (${TRIAL_DAYS} Tage). Upgrade jetzt, dann läuft alles nahtlos weiter — ohne dass du deine Vorlagen oder Kunden neu einrichten musst.`
    : `Du hast ${docCount}/${FREE_LIMIT} Dokumente genutzt. Mit Pro erstellst du unbegrenzt Offerten und Rechnungen — ohne Monatsgrenze.`;

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="upgrade-card">
        <div className="app-kicker" style={{ color: "var(--color-primary-strong)" }}>
          {inTrial ? `Test aktiv · noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"}` : "Offertio Pro"}
        </div>
        <h2 className="upgrade-title">
          {title}
        </h2>
        <p className="upgrade-desc">
          {description}
        </p>

        <div className="upgrade-remaining-box">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--app-text-soft)" }}>
                {inTrial ? "Im Test" : "Verbleibend"}
              </div>
              <div className="mt-2 text-2xl font-bold tracking-[-0.03em]" style={{ color: "var(--app-text)" }}>
                {inTrial
                  ? `${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"}`
                  : `${remaining} Dokumente`}
              </div>
            </div>
            <div className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary-strong)" }}>
              {billing === "yearly" ? "Jährlich" : "Monatlich"}
            </div>
          </div>
        </div>

        <div className="auth-tabs" style={{ marginTop: "1.5rem" }}>
          {billingOptions.map((option) => {
            const selected = billing === option.key;
            return (
              <button
                key={option.key}
                onClick={() => setBilling(option.key)}
                className={`auth-tab ${selected ? "auth-tab-active" : ""}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-end gap-2">
          <div className="text-5xl font-extrabold tracking-[-0.05em]" style={{ color: "var(--app-text)" }}>
            {currency} {price}
          </div>
          <div className="pb-2 text-sm" style={{ color: "var(--app-text-muted)" }}>/ Monat</div>
        </div>

        <p className="mt-2 text-xs leading-6" style={{ color: "var(--app-text-soft)" }}>
          {billing === "yearly"
            ? `2 Monate gratis · ${currency} ${prices.yearly}/Jahr`
            : `${currency} ${prices.monthly}/Monat · jederzeit kündbar`}
        </p>

        <div className="mt-6 space-y-2">
          {PRO_FEATURES.map((feature) => (
            <div key={feature} className="upgrade-feature-row">
              <span className="upgrade-feature-check">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm leading-6" style={{ color: "var(--app-text)" }}>{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 space-y-3">
          {checkoutReady ? (
            <>
              <a
                href={getCheckoutUrl(checkoutType, email, userId)}
                onClick={(event) => {
                  if (typeof navigator !== "undefined" && !navigator.onLine) {
                    event.preventDefault();
                    setOfflineHint(true);
                    return;
                  }
                  setOfflineHint(false);
                  trackUpgradeClick("upgrade-screen");
                }}
                className="auth-submit"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
              >
                Auf Pro wechseln
              </a>
              {offlineHint && (
                <div className="auth-alert auth-alert-error">
                  Kein Internet — bitte Verbindung prüfen.
                </div>
              )}
            </>
          ) : (
            <div className="upgrade-pending-notice">
              Zahlungsfreischaltung folgt. Du kannst Offertio bis dahin normal im Free-Plan weiter nutzen.
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="auth-link w-full"
              style={{ color: "var(--app-text-muted)" }}
            >
              Diesen Monat mit Free weitermachen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
