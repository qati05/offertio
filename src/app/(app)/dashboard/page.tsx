"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  isPro,
  getCheckoutUrl,
  isInTrial,
  trialDaysRemaining,
  TRIAL_DAYS,
} from "@/lib/payment";
import { trackUpgradeClick } from "@/lib/analytics";
import { computeDocumentStatus, countOpenActions, getStatus, statusBadgeVariants } from "@/lib/dokument-status";
import { getDachConfig } from "@/lib/dach";
import DashboardInsights from "@/components/DashboardInsights";
import type { Profile, DokumentHistorie } from "@/lib/types";

const FREE_DOCS = 5;
const ease = [0.16, 1, 0.3, 1] as const;

/** Read cached history from localStorage synchronously (returns [] on miss/error). */
function readCachedHistory(): DokumentHistorie[] {
  try {
    return JSON.parse(localStorage.getItem("dokument-history") || "[]")
      .map((d: Record<string, unknown>) => ({ ...d, betrag: Number(d.betrag) }));
  } catch { return []; }
}

/** Read cached profile from localStorage synchronously (returns null on miss/error). */
function readCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem("offertio-profile-cache");
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch { return null; }
}

export default function DashboardPage() {
  // Seed state from localStorage immediately — zero-latency first paint.
  const [profil, setProfil] = useState<Profile | null>(() => readCachedProfile());
  const [history, setHistory] = useState<DokumentHistorie[]>(() => readCachedHistory());
  // Only show the skeleton on the very first visit (no cache).
  const [loading, setLoading] = useState(() =>
    typeof window === "undefined" ||
    (!localStorage.getItem("dokument-history") && !localStorage.getItem("offertio-profile-cache"))
  );
  const [serverRemaining, setServerRemaining] = useState<number | null>(null);
  const [, setHistorySource] = useState<"local" | "cloud">("cloud");

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profilRes, docsRes, limitRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("dokumente")
        .select("*")
        .eq("user_id", user.id)
        .order("datum", { ascending: false })
        .limit(200),
      fetch("/api/dokument/check-limit").catch(() => null),
    ]);

    if (profilRes.data) {
      setProfil(profilRes.data as Profile);
      try { localStorage.setItem("offertio-profile-cache", JSON.stringify(profilRes.data)); } catch { /* ignore */ }
    }

    const zahlungsfrist = (profilRes.data as Profile | null)?.zahlungsfrist ?? 30;

    if (docsRes.error) {
      // Supabase failed — keep the cached data already rendered.
      setHistorySource("local");
    } else {
      const docs = (docsRes.data || []).map((d: Record<string, unknown>) => ({
        ...d,
        betrag: Number(d.betrag),
      })) as DokumentHistorie[];
      setHistory(docs.map((doc) => computeDocumentStatus(doc, zahlungsfrist)));
      setHistorySource("cloud");
    }

    if (limitRes?.ok) {
      try {
        const limitData = await limitRes.json();
        setServerRemaining(typeof limitData.remaining === "number" ? limitData.remaining : null);
      } catch {
        setServerRemaining(null);
      }
    } else {
      setServerRemaining(null);
    }

    setLoading(false);
  }

  const proUser = isPro(profil?.plan);
  const trialEndsAt = profil?.trial_ends_at ?? null;
  const userInTrial = isInTrial(trialEndsAt);
  const trialDaysLeft = trialDaysRemaining(trialEndsAt);
  const remaining = proUser || userInTrial ? Infinity : (serverRemaining ?? 5);
  const companyName = profil?.firmenname || profil?.vorname || "Offertio";
  const reminderCount = countOpenActions(history, profil?.zahlungsfrist ?? 30);
  const totalDocs = history.length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const today = new Date().toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const openDocs = history.filter((d) =>
    ["gesendet", "angenommen", "ueberfaellig"].includes(d.status)
  );
  const used = FREE_DOCS - Math.max(0, Math.min(remaining, FREE_DOCS));

  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 104px" }}>

        {/* ── Greeting ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          style={{ marginBottom: 48 }}
        >
          <p style={{
            fontSize: 13, lineHeight: 1.6,
            color: "var(--app-text-muted)",
            margin: "0 0 2px",
            letterSpacing: "0.01em",
          }}>
            {loading ? "\u00a0" : `${greeting}${companyName ? `, ${companyName}` : ""}`}
          </p>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: "var(--app-text)",
            margin: "0 0 6px",
            lineHeight: 1.08,
            fontFamily: "var(--font-display)",
          }}>
            Dein Cockpit.
          </h1>
          <p style={{
            fontSize: 13, lineHeight: 1.6,
            color: "var(--app-text-soft)",
            margin: 0,
          }}>
            {loading ? "\u00a0" : today}
          </p>
        </motion.div>

        {/* ── Quiet status hint ─────────────────────────── */}
        {!loading && openDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease }}
            style={{
              marginBottom: 16,
              padding: "14px 18px",
              borderRadius: 14,
              background: "var(--app-card)",
              border: "1px solid var(--app-border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--color-primary)",
              flexShrink: 0,
            }} />
            <p style={{
              fontSize: 13, lineHeight: 1.5,
              color: "var(--app-text-muted)",
              margin: 0,
            }}>
              {openDocs.length === 1
                ? "1 Dokument wartet auf Erledigung."
                : `${openDocs.length} Dokumente warten auf Erledigung.`}
            </p>
          </motion.div>
        )}

        {/* ── Trial banner ─────────────────────────────── */}
        {!loading && !proUser && userInTrial && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease }}
            style={{
              marginBottom: 16,
              padding: "14px 18px",
              borderRadius: 14,
              background: "var(--color-primary-soft, rgba(200,121,61,0.08))",
              border: "1px solid var(--color-primary, #c8793d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-primary-strong, #a8622e)",
                marginBottom: 4,
              }}>
                {TRIAL_DAYS}-Tage-Test · Vollzugriff
              </div>
              <div style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--app-text)",
                margin: 0,
              }}>
                {trialDaysLeft === 1
                  ? "Dein Test läuft morgen ab."
                  : trialDaysLeft === 0
                    ? "Dein Test endet heute."
                    : `Noch ${trialDaysLeft} Tage mit allen Features.`}
              </div>
            </div>
            <Link
              href="/einstellungen/abonnement"
              onClick={() => trackUpgradeClick("dashboard-trial-banner")}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "var(--color-primary)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Auf Pro wechseln
            </Link>
          </motion.div>
        )}

        {/* ── Action Tiles ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease }}
          className="dash-tiles"
        >
          {/* Primary — Offerte */}
          <Link href="/dokument/neu" className="dash-tile dash-tile-primary">
            <div className="dash-tile-kicker">Offerte</div>
            <div className="dash-tile-title">Neue Offerte</div>
            <div className="dash-tile-sub">Vor Ort. In Sekunden.</div>
          </Link>

          {/* Secondary — Rechnung */}
          <Link href="/dokument/neu?typ=rechnung" className="dash-tile dash-tile-secondary">
            <div className="dash-tile-kicker">Rechnung</div>
            <div className="dash-tile-title">Neue Rechnung</div>
            <div className="dash-tile-sub">Exakt. DACH-konform.</div>
          </Link>
        </motion.div>

        {/* ── Insights (KPIs + Sparkline + Top-Kunden) ─────── */}
        {!loading && history.length > 0 && (
          <DashboardInsights
            history={history}
            currency={getDachConfig(profil?.land).currency}
          />
        )}

        {/* ── Verlauf ──────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 20,
          }}>
            <div className="kicker">Verlauf</div>
            {!loading && history.length > 0 && (
              <Link href="/dokumente" style={{
                fontSize: 13, color: "var(--color-primary)",
                textDecoration: "none", fontWeight: 500,
              }}>
                Alle
              </Link>
            )}
          </div>

          {loading ? (
            /* Organic skeleton — breathes, doesn't blink */
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "18px 0",
                  borderBottom: i < 2 ? "1px solid var(--app-border)" : "none",
                  opacity: 1 - i * 0.28,
                }}>
                  <div
                    className="skeleton"
                    style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      className="skeleton"
                      style={{ width: "44%", height: 13, borderRadius: 6, marginBottom: 7 }}
                    />
                    <div
                      className="skeleton"
                      style={{ width: "30%", height: 11, borderRadius: 5 }}
                    />
                  </div>
                  <div
                    className="skeleton"
                    style={{ width: 68, height: 13, borderRadius: 6 }}
                  />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div style={{
              padding: "56px 0 48px", textAlign: "center",
              borderTop: "1px solid var(--app-border)",
            }}>
              <div style={{
                fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em",
                color: "var(--app-text)", marginBottom: 8,
                fontFamily: "var(--font-display)",
              }}>
                Dein erstes Werk wartet.
              </div>
              <p style={{
                fontSize: 14, lineHeight: 1.6,
                color: "var(--app-text-muted)", margin: "0 0 20px",
              }}>
                Erstelle jetzt eine Offerte — direkt nach dem Kundentermin.
              </p>
              <Link
                href="/dokument/neu"
                className="btn-premium btn-premium-primary"
              >
                Neue Offerte
              </Link>
            </div>
          ) : (
            <div>
              {history.slice(0, 6).map((doc, i) => {
                const st = getStatus(doc.status);
                const isRechnung = doc.typ === "rechnung";
                const isLast = i === Math.min(history.length, 6) - 1;
                return (
                  <motion.div
                    key={doc.id ?? i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.24 + i * 0.05 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "18px 0",
                      borderBottom: isLast ? "none" : "1px solid var(--app-border)",
                    }}
                  >
                    <div className={`doc-type${isRechnung ? " doc-type--rechnung" : ""}`}>
                      {isRechnung ? "RG" : "OF"}
                    </div>

                    {/* Customer + number */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, lineHeight: 1.4,
                        color: "var(--app-text)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {doc.kundenname || "Unbekannter Kunde"}
                      </div>
                      <div style={{
                        fontSize: 12, lineHeight: 1.6,
                        color: "var(--app-text-muted)", marginTop: 1,
                      }}>
                        {doc.nummer}&nbsp;·&nbsp;
                        {new Date(doc.datum).toLocaleDateString("de-CH")}
                        {doc.source_document_nummer && (
                          <span style={{ color: "var(--color-primary-strong)" }}>
                            &nbsp;· aus {doc.source_document_nummer}
                          </span>
                        )}
                        {doc.converted_document_nummer && (
                          <span style={{ color: "var(--color-primary-strong)" }}>
                            &nbsp;→ {doc.converted_document_nummer}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status — cross-fades when status changes */}
                    <div style={{ flexShrink: 0, position: "relative", minWidth: 64, textAlign: "right" }}>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={doc.status}
                          variants={statusBadgeVariants}
                          initial="enter"
                          animate="visible"
                          exit="exit"
                          className="pill-badge"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.label}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ── Plan Advisor ─────────────────────────────── */}
        {!loading && !proUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            style={{ marginTop: 48 }}
          >
            <div style={{
              background: "var(--app-card)",
              border: "1px solid var(--app-border)",
              borderRadius: 16,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Progress track */}
                <div style={{
                  width: "100%", height: 2,
                  background: "var(--app-card-muted)",
                  borderRadius: 1, overflow: "hidden", marginBottom: 10,
                }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min((used / FREE_DOCS) * 100, 100)}%`,
                    background: remaining <= 1 ? "#A8622E" : "var(--color-primary)",
                    borderRadius: 1,
                    transition: "width 0.8s var(--ease-out-expo)",
                  }} />
                </div>
                <div style={{
                  fontSize: 13, lineHeight: 1.6,
                  color: "var(--app-text)", fontWeight: 500,
                }}>
                  {remaining === 0
                    ? "Du hast Großes vor. Zeit für Pro."
                    : `${remaining} ${remaining === 1 ? "Dokument" : "Dokumente"} verbleiben diesen Monat.`}
                </div>
              </div>
              <a
                href={getCheckoutUrl("pro_yearly", profil?.email, profil?.id)}
                className="btn-premium btn-premium-primary"
                style={{ flexShrink: 0 }}
                onClick={() => trackUpgradeClick("dashboard")}
              >
                Pro freischalten
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
