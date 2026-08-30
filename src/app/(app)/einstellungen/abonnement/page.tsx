"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  FREE_LIMIT,
  PRO_FEATURES,
  getCheckoutUrl,
  getPricing,
  hasActiveAccess,
  isCheckoutConfigured,
  isInTrial,
  isPro,
  trialDaysRemaining,
} from "@/lib/payment";
import type { Profile } from "@/lib/types";

/**
 * Subscription overview.
 *
 * Three places linked here — the dashboard's trial banner, the quota counter in
 * the document form, and the post-login fallback — and the route did not exist.
 * All three landed on the 404 page, so a user who had just decided to pay could
 * not.
 *
 * Deliberately narrow. It shows what the user has, what it costs, and the one
 * button that starts a checkout. It does not invent a cancellation flow:
 * subscriptions live in Lemon Squeezy and there is no endpoint here to cancel
 * one, so the page says where cancellation happens rather than offering a
 * button that would do nothing.
 */
export default function AbonnementPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setEmail(user.email ?? "");
    setUserId(user.id);

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) setProfile(data as Profile);

    // The quota counter is only meaningful without access; a Pro plan has none.
    if (!hasActiveAccess((data as Profile | null)?.plan, (data as Profile | null)?.trial_ends_at)) {
      try {
        const res = await fetch("/api/dokument/check-limit", { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          if (typeof body.remaining === "number" && Number.isFinite(body.remaining)) {
            setRemaining(body.remaining);
          }
        }
      } catch {
        // Leave it unknown rather than showing a wrong number.
      }
    }
    setLoading(false);
  }

  const plan = profile?.plan;
  const trialEndsAt = profile?.trial_ends_at ?? null;
  const inTrial = isInTrial(trialEndsAt);
  const pro = isPro(plan);
  const { currency, prices } = getPricing(profile?.land);
  const checkoutReady = isCheckoutConfigured("pro_monthly");

  if (loading) {
    return (
      <div style={{ minHeight: "100%", maxWidth: 680, margin: "0 auto", padding: "48px 24px 104px" }}>
        <div className="app-shell-panel" style={{ height: 180 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", maxWidth: 680, margin: "0 auto", padding: "48px 24px 104px" }}>
      <div className="page-header">
        <div className="app-kicker">Einstellungen</div>
        <h1 className="app-title-display mt-2">Abonnement</h1>
      </div>

      {/* What the user has right now */}
      <div className="app-shell-panel mt-6 p-6">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--app-text-muted)" }}>
          Dein Plan
        </div>
        <div className="mt-2 text-2xl font-bold" style={{ color: "var(--app-text)" }}>
          {pro ? (plan === "pro_yearly" ? "Pro — jährlich" : "Pro — monatlich") : inTrial ? "Testphase" : "Free"}
        </div>

        {inTrial && !pro && (
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
            Noch {trialDaysRemaining(trialEndsAt)}{" "}
            {trialDaysRemaining(trialEndsAt) === 1 ? "Tag" : "Tage"} mit allen Pro-Funktionen.
            Danach wechselst du automatisch auf Free — ohne Kreditkarte, ohne automatische
            Verlängerung.
          </p>
        )}

        {!pro && !inTrial && (
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
            {remaining === null
              ? `${FREE_LIMIT} Dokumente pro Monat.`
              : `Noch ${remaining} von ${FREE_LIMIT} Dokumenten in diesem Monat.`}
          </p>
        )}

        {pro && profile?.plan_cancelled_at && profile?.plan_expires_at && (
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
            Gekündigt. Dein Zugang läuft noch bis zum{" "}
            {new Date(profile.plan_expires_at).toLocaleDateString("de-CH")}.
          </p>
        )}
      </div>

      {/* Upgrade */}
      {!pro && (
        <div className="app-shell-panel mt-4 p-6">
          <div className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>
            Auf Pro wechseln
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--app-text-muted)" }}>
            {currency} {prices.monthly} pro Monat, oder {currency} {prices.yearly} im Jahr
            ({currency} {prices.yearlyPerMonth} pro Monat).
          </p>

          <ul className="mt-4 space-y-1.5 text-sm" style={{ color: "var(--app-text)" }}>
            {PRO_FEATURES.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>

          {checkoutReady ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={getCheckoutUrl("pro_monthly", email, userId)}
                className="btn-premium btn-premium-primary"
              >
                Monatlich — {currency} {prices.monthly}
              </a>
              <a href={getCheckoutUrl("pro_yearly", email, userId)} className="btn-premium">
                Jährlich — {currency} {prices.yearly}
              </a>
            </div>
          ) : (
            /* An unconfigured checkout must say so. A button that goes nowhere
               is what sent people to the 404 page in the first place. */
            <div className="auth-alert mt-5 text-left">
              Der Bezahlvorgang ist noch nicht freigeschaltet. Schreib uns kurz — wir
              schalten Pro von Hand für dich frei.
            </div>
          )}
        </div>
      )}

      {/* Cancellation — described, not simulated */}
      {pro && (
        <div className="app-shell-panel mt-4 p-6">
          <div className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>
            Kündigen oder Zahlungsdaten ändern
          </div>
          <p className="mt-1 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
            Dein Abo läuft über Lemon Squeezy. Den Verwaltungslink findest du in der
            Bestellbestätigung per E-Mail — dort kannst du kündigen, die Zahlungsmethode
            ändern und Rechnungen herunterladen. Nach einer Kündigung bleibt dein Zugang
            bis zum Ende der bezahlten Periode bestehen.
          </p>
        </div>
      )}

      <div className="mt-6 text-sm">
        <Link href="/einstellungen/profil" style={{ color: "var(--color-primary)" }}>
          ← Zurück zum Profil
        </Link>
      </div>
    </div>
  );
}
