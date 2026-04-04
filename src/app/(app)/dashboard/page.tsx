"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getDachConfig } from "@/lib/dach";
import {
  isPro,
  remainingFreeDocuments,
  getCheckoutUrl,
} from "@/lib/payment";
import { trackUpgradeClick } from "@/lib/analytics";
import type { Profile, DokumentHistorie } from "@/lib/types";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  entwurf: { label: "Entwurf", color: "#6b7280", bg: "rgba(107,114,128,0.06)" },
  gesendet: { label: "Gesendet", color: "#A8622E", bg: "rgba(200,121,61,0.06)" },
  bezahlt: { label: "Bezahlt", color: "#1A7F42", bg: "rgba(26,127,66,0.06)" },
  offen: { label: "Offen", color: "#A8622E", bg: "rgba(200,121,61,0.06)" },
};

function Skeleton({ w, h, className = "" }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w, height: h ?? "14px", borderRadius: "7px" }}
    />
  );
}

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function DashboardPage() {
  const [profil, setProfil] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DokumentHistorie[]>([]);
  const [historySource, setHistorySource] = useState<"cloud" | "local">("cloud");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profilRes, docsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("dokumente").select("*").eq("user_id", user.id).order("datum", { ascending: false }).limit(10),
    ]);

    if (profilRes.data) setProfil(profilRes.data as Profile);

    if (docsRes.error) {
      try {
        const local = JSON.parse(localStorage.getItem("dokument-history") || "[]");
        setHistory(local.map((d: any) => ({ ...d, betrag: Number(d.betrag) })));
        setHistorySource("local");
      } catch {
        setHistory([]);
        setHistorySource("local");
      }
    } else {
      setHistory((docsRes.data || []).map((d: any) => ({ ...d, betrag: Number(d.betrag) })));
      setHistorySource("cloud");
    }

    setLoading(false);
  }

  const currency = getDachConfig(profil?.land).currency;
  const proUser = isPro(profil?.plan);
  const remaining = remainingFreeDocuments(profil?.plan);
  const companyName = profil?.firmenname || profil?.vorname || "Offertio";
  const reminderCount = history.filter((doc) => ["gesendet", "angenommen", "ueberfaellig"].includes(doc.status)).length;
  const totalDocs = history.length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const today = new Date().toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 flex items-start justify-between gap-4"
        >
          <div>
            <div className="text-sm" style={{ color: "var(--app-text-muted)" }}>
              {loading ? "Laden..." : `${greeting}, ${companyName}`}
            </div>
            <h1 className="app-title-display mt-1">Übersicht</h1>
            {!loading && (
              <p className="mt-2 text-sm" style={{ color: "var(--app-text-muted)" }}>
                {today}
              </p>
            )}
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            {(profil?.vorname?.[0] || profil?.email?.[0] || "O").toUpperCase()}
          </div>
        </motion.header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-5">

            {/* Action tiles */}
            <div className="grid gap-3 sm:grid-cols-2">
              <motion.div custom={1} initial="hidden" animate="visible" variants={fadeIn}>
                <Link href="/dokument/neu" className="app-action-tile app-action-tile-primary">
                  <div className="text-xs font-medium opacity-80">Neues Dokument</div>
                  <div className="mt-1.5 text-xl font-bold tracking-[-0.02em]">Neue Offerte</div>
                  <div className="mt-2 text-sm opacity-75">Direkt nach dem Termin versenden.</div>
                </Link>
              </motion.div>
              <motion.div custom={2} initial="hidden" animate="visible" variants={fadeIn}>
                <Link href="/dokument/neu?typ=rechnung" className="app-action-tile">
                  <div className="text-xs font-medium" style={{ color: "var(--app-text-soft)" }}>Neues Dokument</div>
                  <div className="mt-1.5 text-xl font-bold tracking-[-0.02em]" style={{ color: "var(--app-text)" }}>Neue Rechnung</div>
                  <div className="mt-2 text-sm" style={{ color: "var(--app-text-muted)" }}>Mit QR-Bill und sauberem PDF.</div>
                </Link>
              </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.section custom={3} initial="hidden" animate="visible" variants={fadeIn}>
              <div className="mb-3 flex items-center justify-between">
                <h2
                  className="text-lg font-bold tracking-[-0.02em]"
                  style={{ color: "var(--app-text)", fontFamily: "var(--font-display)" }}
                >
                  Letzte Aktivität
                </h2>
                {historySource === "local" ? (
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--app-text-soft)" }}>Lokal</span>
                ) : history.length > 0 ? (
                  <Link href="/dokumente" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                    Alle ansehen
                  </Link>
                ) : null}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card flex items-center gap-3 p-4">
                      <Skeleton w="40px" h="40px" className="rounded-xl" />
                      <div className="flex-1">
                        <Skeleton w="140px" h="13px" />
                        <Skeleton w="100px" h="10px" className="mt-1.5" />
                      </div>
                      <Skeleton w="60px" h="13px" />
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center px-5 py-12 text-center">
                  <div className="text-base font-semibold" style={{ color: "var(--app-text)" }}>Noch keine Aktivität</div>
                  <p className="mt-1.5 max-w-xs text-sm" style={{ color: "var(--app-text-muted)" }}>
                    Starte mit deiner ersten Offerte. Danach erscheint hier dein Verlauf.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 5).map((doc, i) => {
                    const status = STATUS[doc.status] ?? STATUS.offen;
                    const isRechnung = doc.typ === "rechnung";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                        className="glass-card flex items-center gap-3 p-4"
                      >
                        <div
                          className="doc-type-badge"
                          style={{
                            background: isRechnung ? "rgba(200,121,61,0.06)" : "rgba(26,25,22,0.04)",
                            color: isRechnung ? "var(--color-primary)" : "var(--app-text-muted)",
                          }}
                        >
                          {isRechnung ? "RG" : "OF"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" style={{ color: "var(--app-text)" }}>
                            {doc.kundenname || "Unbekannter Kunde"}
                          </div>
                          <div className="mt-0.5 truncate text-xs" style={{ color: "var(--app-text-muted)" }}>
                            {doc.nummer} &middot; {new Date(doc.datum).toLocaleDateString("de-CH")}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold tabular-nums" style={{ color: "var(--app-text)" }}>
                            {currency} {doc.betrag.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
                          </div>
                          <span className="status-badge mt-1 inline-block" style={{ color: status.color, background: status.bg }}>
                            {status.label}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeIn} className="glass-card p-5">
              <div className="app-kicker">Hinweise</div>
              <div
                className="mt-2 text-lg font-bold tracking-[-0.02em]"
                style={{ color: "var(--app-text)", fontFamily: "var(--font-display)" }}
              >
                {loading ? "..." : `${reminderCount} offene ${reminderCount === 1 ? "Aktion" : "Aktionen"}`}
              </div>
              <p className="mt-2 text-sm leading-5" style={{ color: "var(--app-text-muted)" }}>
                {loading
                  ? "Laden..."
                  : reminderCount > 0
                    ? "Offene Dokumente können jetzt nachgefasst werden."
                    : "Keine dringenden Aktionen. Gute Basis für die nächste Offerte."}
              </p>
              <Link href="/dokument/neu" className="btn-premium btn-premium-secondary mt-4 w-full text-sm">
                Weiterarbeiten
              </Link>
            </motion.div>

            <motion.div custom={2} initial="hidden" animate="visible" variants={fadeIn} className="glass-card p-5">
              <div className="app-kicker">Plan</div>
              <div
                className="mt-2 text-2xl font-bold tracking-[-0.03em]"
                style={{ color: "var(--app-text)", fontFamily: "var(--font-display)" }}
              >
                {loading ? "..." : proUser ? "Pro" : "Free"}
              </div>
              {!loading && (
                <p className="mt-2 text-sm leading-5" style={{ color: "var(--app-text-muted)" }}>
                  {proUser
                    ? "Alle Funktionen aktiv. Unbegrenzte Dokumente."
                    : `${remaining} von 5 Dokumenten übrig.`}
                </p>
              )}
              {!loading && !proUser ? (
                <a
                  href={getCheckoutUrl("pro_yearly", profil?.email, profil?.id)}
                  className="btn-premium btn-premium-primary mt-4 w-full text-sm"
                  onClick={() => trackUpgradeClick("dashboard")}
                >
                  Upgrade auf Pro
                </a>
              ) : (
                !loading && (
                  <div
                    className="mt-4 rounded-xl px-3 py-2.5 text-sm font-semibold text-center"
                    style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}
                  >
                    Pro aktiv
                  </div>
                )
              )}
            </motion.div>

            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeIn} className="glass-card p-5">
              <div className="app-kicker">Workspace</div>
              <div className="mt-3 space-y-1.5">
                {[
                  { label: "Firmendaten", href: "/einstellungen/profil" },
                  { label: "Vorlagen", href: "/einstellungen/vorlagen" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--app-card-muted)]"
                    style={{ color: "var(--app-text)" }}
                  >
                    <span>{label}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--app-text-soft)" }}>
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
