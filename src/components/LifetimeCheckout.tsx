"use client";

import { useEffect, useState } from "react";
import {
  FREE_LIMIT,
  LIFETIME_FEATURES,
  LIFETIME_PRICE_CHF,
  LIFETIME_PRODUCT_NAME,
  TRIAL_DAYS,
  getMonthlyDocCount,
  isInTrial,
  trialDaysRemaining,
} from "@/lib/payment";
import { trackUpgradeClick } from "@/lib/analytics";

interface LifetimeCheckoutProps {
  trialEndsAt?: string | null;
  onClose?: () => void;
}

type CheckoutStatus = {
  configured: boolean;
  priceChf: number;
  currency: string;
  seatLimit: number | null;
  soldOut: boolean;
  remaining: number | null;
  alreadyLifetime: boolean;
};

export default function LifetimeCheckout({ trialEndsAt, onClose }: LifetimeCheckoutProps) {
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [offlineHint, setOfflineHint] = useState(false);
  const [actionError, setActionError] = useState("");

  const docCount = getMonthlyDocCount();
  const remainingDocs = Math.max(0, FREE_LIMIT - docCount);
  const inTrial = isInTrial(trialEndsAt ?? null);
  const daysLeft = trialDaysRemaining(trialEndsAt ?? null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/checkout/lifetime", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as CheckoutStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const price = status?.priceChf ?? LIFETIME_PRICE_CHF;
  const currency = status?.currency ?? "CHF";
  const configured = status?.configured === true;
  const soldOut = status?.soldOut === true;
  const alreadyLifetime = status?.alreadyLifetime === true;

  async function startCheckout() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOfflineHint(true);
      return;
    }
    setOfflineHint(false);
    setActionError("");
    setSubmitting(true);
    trackUpgradeClick("lifetime-checkout");
    try {
      const response = await fetch("/api/checkout/lifetime", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string; soldOut?: boolean; alreadyLifetime?: boolean };
      if (data.alreadyLifetime) {
        setStatus((current) => (current ? { ...current, alreadyLifetime: true } : current));
        setSubmitting(false);
        return;
      }
      if (!response.ok || !data.url) {
        if (data.soldOut || response.status === 409) {
          setStatus((current) => (current ? { ...current, soldOut: true, remaining: 0 } : current));
        }
        if (response.status === 503) {
          setStatus((current) => (current ? { ...current, configured: false } : current));
        }
        setActionError(data.error || "Checkout konnte nicht gestartet werden.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setActionError("Checkout konnte nicht gestartet werden.");
      setSubmitting(false);
    }
  }

  const title = alreadyLifetime
    ? "Dein Gründerplatz ist aktiv."
    : inTrial
      ? `Dein Test läuft in ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tagen"} ab.`
      : "Dein Free-Kontingent ist fast aufgebraucht.";

  const description = alreadyLifetime
    ? "Die Free-Limits gelten für dich nicht mehr. Dokumente bleiben unlimitiert."
    : inTrial
      ? `Du testest Offertio mit vollem Zugriff (${TRIAL_DAYS} Tage). Der Gründerplatz ist eine einmalige Zahlung — danach läuft alles weiter, ohne Abo.`
      : `Du hast ${docCount}/${FREE_LIMIT} Dokumente genutzt. Mit dem Gründerplatz erstellst du unbegrenzt Offerten und Rechnungen.`;

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="upgrade-card">
        <div className="app-kicker" style={{ color: "var(--color-primary-strong)" }}>
          {alreadyLifetime ? "Gründerplatz" : inTrial ? `Test aktiv · noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"}` : LIFETIME_PRODUCT_NAME}
        </div>
        <h2 className="upgrade-title">{title}</h2>
        <p className="upgrade-desc">{description}</p>

        {!alreadyLifetime && (
          <div className="upgrade-remaining-box">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--app-text-soft)" }}>
                  {inTrial ? "Im Test" : "Verbleibend"}
                </div>
                <div className="mt-2 text-2xl font-bold tracking-[-0.03em]" style={{ color: "var(--app-text)" }}>
                  {inTrial ? `${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"}` : `${remainingDocs} Dokumente`}
                </div>
              </div>
              <div className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary-strong)" }}>
                Einmalig
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-end gap-2">
          <div className="text-5xl font-extrabold tracking-[-0.05em]" style={{ color: "var(--app-text)" }}>
            {currency} {price}
          </div>
          <div className="pb-2 text-sm" style={{ color: "var(--app-text-muted)" }}>einmalig</div>
        </div>
        <p className="mt-2 text-xs leading-6" style={{ color: "var(--app-text-soft)" }}>
          Lebenslanger Zugang. Kein Abo. Zahlung mit Karte oder TWINT.
        </p>
        {typeof status?.remaining === "number" && status.seatLimit && !alreadyLifetime && (
          <p className="mt-1 text-xs leading-6" style={{ color: "var(--app-text-soft)" }}>
            Noch {status.remaining} von {status.seatLimit} Gründerplätzen frei.
          </p>
        )}

        <div className="mt-6 space-y-2">
          {LIFETIME_FEATURES.map((feature) => (
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
          {alreadyLifetime ? null : soldOut ? (
            <div className="upgrade-pending-notice">
              Alle Gründerplätze sind vergeben.
            </div>
          ) : status === null && !loadError ? (
            <div className="upgrade-pending-notice">Wird geladen…</div>
          ) : configured ? (
            <>
              <button
                type="button"
                onClick={() => void startCheckout()}
                disabled={submitting}
                className="auth-submit"
                style={{ width: "100%" }}
              >
                {submitting ? "Weiterleitung zu Stripe…" : "Gründerplatz sichern"}
              </button>
              {offlineHint && (
                <div className="auth-alert auth-alert-error">
                  Kein Internet — bitte Verbindung prüfen.
                </div>
              )}
              {actionError && (
                <div className="auth-alert auth-alert-error">{actionError}</div>
              )}
            </>
          ) : (
            <div className="upgrade-pending-notice">
              {loadError
                ? "Der Checkout-Status konnte nicht geladen werden. Du kannst Offertio im Free-Plan weiter nutzen."
                : "Zahlungsfreischaltung folgt. Du kannst Offertio bis dahin normal im Free-Plan weiter nutzen."}
            </div>
          )}

          {onClose && !alreadyLifetime && (
            <button
              type="button"
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
