"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState, use } from "react";
import { motion } from "framer-motion";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getDachConfig } from "@/lib/dach";
import { getStatus, computeDocumentStatus } from "@/lib/dokument-status";
import { toCustomerSlug } from "@/lib/customers";
import { formatCompactCurrency } from "@/lib/insights";
import type { DokumentHistorie, Profile } from "@/lib/types";

const ease = [0.16, 1, 0.3, 1] as const;

interface Metrics {
  totalPaid: number;
  totalOpen: number;
  totalOverdue: number;
  paidCount: number;
  openCount: number;
  invoiceCount: number;
  offerCount: number;
  offersAccepted: number;
  offersExpired: number;
  averagePaymentDays: number | null;
  firstActivity: string | null;
  lastActivity: string | null;
}

function computeCustomerMetrics(
  docs: DokumentHistorie[],
  zahlungsfrist: number,
): Metrics {
  let totalPaid = 0;
  let totalOpen = 0;
  let totalOverdue = 0;
  let paidCount = 0;
  let openCount = 0;
  let invoiceCount = 0;
  let offerCount = 0;
  let offersAccepted = 0;
  let offersExpired = 0;
  const paymentDays: number[] = [];
  const dates: number[] = [];

  for (const raw of docs) {
    const doc = computeDocumentStatus(raw, zahlungsfrist);
    const amount = Number.isFinite(doc.betrag) ? doc.betrag : 0;
    dates.push(new Date(doc.datum).getTime());

    if (doc.typ === "rechnung") {
      invoiceCount += 1;
      if (doc.status === "bezahlt") {
        totalPaid += amount;
        paidCount += 1;
        // Rough payment-days proxy: days between invoice date and today
        // (we don't store paid_at). Clamp to non-negative.
        const daysOut = Math.max(
          0,
          Math.round((Date.now() - new Date(doc.datum).getTime()) / (1000 * 60 * 60 * 24)),
        );
        paymentDays.push(daysOut);
      } else if (doc.status === "gesendet" || doc.status === "ueberfaellig") {
        totalOpen += amount;
        openCount += 1;
        if (doc.status === "ueberfaellig") totalOverdue += amount;
      }
    } else if (doc.typ === "offerte") {
      offerCount += 1;
      if (doc.status === "angenommen") offersAccepted += 1;
      else if (doc.status === "abgelaufen") offersExpired += 1;
    }
  }

  const averagePaymentDays =
    paymentDays.length === 0
      ? null
      : Math.round(paymentDays.reduce((s, d) => s + d, 0) / paymentDays.length);

  const firstActivity = dates.length ? new Date(Math.min(...dates)).toISOString() : null;
  const lastActivity = dates.length ? new Date(Math.max(...dates)).toISOString() : null;

  return {
    totalPaid,
    totalOpen,
    totalOverdue,
    paidCount,
    openCount,
    invoiceCount,
    offerCount,
    offersAccepted,
    offersExpired,
    averagePaymentDays,
    firstActivity,
    lastActivity,
  };
}

/** Read cached history from localStorage synchronously (returns [] on miss/error). */
function readCachedHistory(): DokumentHistorie[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("dokument-history") || "[]");
  } catch {
    return [];
  }
}

function readCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("offertio-profile-cache");
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug);

  const [history, setHistory] = useState<DokumentHistorie[]>(() => readCachedHistory());
  const [profile, setProfile] = useState<Profile | null>(() => readCachedProfile());
  const [loading, setLoading] = useState(
    typeof window === "undefined" || !localStorage.getItem("dokument-history"),
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const [profileRes, docsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("dokumente")
        .select("*")
        .eq("user_id", user.id)
        .order("datum", { ascending: false })
        .limit(500),
    ]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (docsRes.data) {
      setHistory(
        docsRes.data.map((d: Record<string, unknown>) => ({
          ...d,
          betrag: Number(d.betrag),
        })) as DokumentHistorie[],
      );
    }
    setLoading(false);
  }

  /** All documents matching this customer slug (by kundenname or customer_id). */
  const customerDocs = useMemo(() => {
    return history.filter((doc) => {
      const docSlug = doc.customer_id || toCustomerSlug(doc.kundenname);
      return docSlug === slug || toCustomerSlug(doc.kundenname) === slug;
    });
  }, [history, slug]);

  const customerName = customerDocs[0]?.kundenname || slug;
  const currency = getDachConfig(profile?.land).currency;
  const zahlungsfrist = profile?.zahlungsfrist ?? 30;
  const metrics = useMemo(
    () => computeCustomerMetrics(customerDocs, zahlungsfrist),
    [customerDocs, zahlungsfrist],
  );

  const winRate =
    metrics.offersAccepted + metrics.offersExpired === 0
      ? null
      : metrics.offersAccepted / (metrics.offersAccepted + metrics.offersExpired);

  const contact = customerDocs[0];

  return (
    <div style={{ minHeight: "100%", background: "var(--app-bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Back link */}
        <Link
          href="/dokumente"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--app-text-muted)",
            textDecoration: "none",
            marginBottom: 18,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zu Dokumenten
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          style={{ marginBottom: 32 }}
        >
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.13em",
            textTransform: "uppercase", color: "var(--app-text-soft)",
            marginBottom: 8,
          }}>
            Kundenprofil
          </div>
          <h1 style={{
            fontSize: 32, fontWeight: 700, letterSpacing: "-0.035em",
            color: "var(--app-text)", margin: "0 0 10px",
            lineHeight: 1.1,
            fontFamily: "var(--font-display)",
          }}>
            {customerName}
          </h1>
          {contact && (contact.kunde_email || contact.kunde_adresse) && (
            <div style={{
              fontSize: 13, lineHeight: 1.6,
              color: "var(--app-text-muted)",
            }}>
              {contact.kunde_email && <>{contact.kunde_email}</>}
              {contact.kunde_email && contact.kunde_adresse && " · "}
              {contact.kunde_adresse && (
                <>
                  {contact.kunde_adresse}
                  {contact.kunde_plz && contact.kunde_ort && `, ${contact.kunde_plz} ${contact.kunde_ort}`}
                </>
              )}
            </div>
          )}
        </motion.header>

        {/* Empty state */}
        {!loading && customerDocs.length === 0 && (
          <div style={{
            padding: "56px 20px",
            textAlign: "center",
            borderTop: "1px solid var(--app-border)",
          }}>
            <div style={{
              fontSize: 17, fontWeight: 700,
              color: "var(--app-text)", marginBottom: 8,
            }}>
              Kein Kunde unter diesem Link gefunden.
            </div>
            <p style={{
              fontSize: 14, lineHeight: 1.6,
              color: "var(--app-text-muted)",
            }}>
              Kundenprofile entstehen automatisch, sobald du eine Offerte oder Rechnung erstellst.
            </p>
          </div>
        )}

        {/* Metric cards */}
        {customerDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 32,
            }}
          >
            <MetricCard
              label="Bezahlt"
              value={formatCompactCurrency(metrics.totalPaid, currency)}
              hint={`${metrics.paidCount} ${metrics.paidCount === 1 ? "Rechnung" : "Rechnungen"}`}
            />
            <MetricCard
              label="Offen"
              value={formatCompactCurrency(metrics.totalOpen, currency)}
              hint={metrics.openCount ? `${metrics.openCount} ausstehend` : "Alles beglichen"}
              tone={metrics.totalOverdue > 0 ? "danger" : "neutral"}
            />
            <MetricCard
              label="Abschlussquote"
              value={winRate !== null ? `${Math.round(winRate * 100)}%` : "—"}
              hint={
                metrics.offersAccepted + metrics.offersExpired > 0
                  ? `${metrics.offersAccepted}/${metrics.offersAccepted + metrics.offersExpired} Offerten`
                  : "Noch keine Offerten entschieden"
              }
            />
            <MetricCard
              label="Aktivität"
              value={
                metrics.firstActivity && metrics.lastActivity
                  ? String(
                      Math.max(
                        1,
                        Math.round(
                          (new Date(metrics.lastActivity).getTime() -
                            new Date(metrics.firstActivity).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ) + 1,
                      ),
                    )
                  : "—"
              }
              hint={
                metrics.lastActivity
                  ? `Letzter Kontakt ${new Date(metrics.lastActivity).toLocaleDateString("de-CH")}`
                  : "—"
              }
            />
          </motion.div>
        )}

        {/* Quick actions */}
        {customerDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}
          >
            <Link href="/dokument/neu" className="btn-premium btn-premium-primary">
              Neue Offerte
            </Link>
            <Link href="/dokument/neu?typ=rechnung" className="btn-premium btn-premium-ghost">
              Neue Rechnung
            </Link>
          </motion.div>
        )}

        {/* Document timeline */}
        {customerDocs.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.13em",
              textTransform: "uppercase", color: "var(--app-text-soft)",
              marginBottom: 14,
            }}>
              Verlauf · {customerDocs.length} {customerDocs.length === 1 ? "Dokument" : "Dokumente"}
            </div>
            <div style={{
              background: "var(--app-card)",
              border: "1px solid var(--app-border)",
              borderRadius: 16,
              overflow: "hidden",
            }}>
              {customerDocs.map((raw, i) => {
                const doc = computeDocumentStatus(raw, zahlungsfrist);
                const status = getStatus(doc.status);
                const isRechnung = doc.typ === "rechnung";
                const isLast = i === customerDocs.length - 1;
                return (
                  <div
                    key={doc.id ?? `${doc.nummer}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      borderBottom: isLast ? "none" : "1px solid var(--app-border)",
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                      background: isRechnung ? "rgba(200,121,61,0.08)" : "var(--app-card-muted)",
                      color: isRechnung ? "var(--color-primary)" : "var(--app-text-muted)",
                    }}>
                      {isRechnung ? "RG" : "OF"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: "var(--app-text)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {doc.nummer}
                        {doc.objekt && (
                          <span style={{ fontWeight: 400, color: "var(--app-text-muted)" }}>
                            {" · "}{doc.objekt}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, color: "var(--app-text-muted)", marginTop: 1,
                      }}>
                        {new Date(doc.datum).toLocaleDateString("de-CH")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: "var(--app-text)",
                        fontVariantNumeric: "tabular-nums",
                        marginBottom: 3,
                      }}>
                        {formatCompactCurrency(doc.betrag, currency)}
                      </div>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10, fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: status.color,
                        padding: "2px 7px",
                        borderRadius: 5,
                        background: status.bg,
                      }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div style={{
      background: "var(--app-card)",
      border: "1px solid var(--app-border)",
      borderRadius: 14,
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--app-text-soft)",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em",
        color: tone === "danger" ? "#B91C1C" : "var(--app-text)",
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
    </div>
  );
}
