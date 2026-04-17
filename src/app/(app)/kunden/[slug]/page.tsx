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
    firstActivity,
    lastActivity,
  };
}

function readCachedHistory(): DokumentHistorie[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("dokument-history") || "[]");
  } catch { return []; }
}

function readCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("offertio-profile-cache");
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch { return null; }
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

  useEffect(() => { void load(); }, []);

  async function load() {
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
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
    <div className="kunden-page">
      <div className="kunden-container">
        <Link href="/dokumente" className="kunden-back focus-ring">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zu Dokumenten
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="kunden-header"
        >
          <div className="kicker">Kundenprofil</div>
          <h1 className="kunden-title">{customerName}</h1>
          {contact && (contact.kunde_email || contact.kunde_adresse) && (
            <div className="kunden-contact">
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

        {!loading && customerDocs.length === 0 && (
          <div className="kunden-empty">
            <div className="kunden-empty-title">Kein Kunde unter diesem Link gefunden.</div>
            <p className="kunden-empty-text">
              Kundenprofile entstehen automatisch, sobald du eine Offerte oder Rechnung erstellst.
            </p>
          </div>
        )}

        {customerDocs.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease }}
              className="insights-kpi-grid"
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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="kunden-actions"
            >
              <Link href="/dokument/neu" className="btn-premium btn-premium-primary">
                Neue Offerte
              </Link>
              <Link href="/dokument/neu?typ=rechnung" className="btn-premium btn-premium-ghost">
                Neue Rechnung
              </Link>
            </motion.div>

            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="kunden-timeline-header">
                <span className="kicker">
                  Verlauf · {customerDocs.length} {customerDocs.length === 1 ? "Dokument" : "Dokumente"}
                </span>
              </div>
              <div className="surface">
                {customerDocs.map((raw, i) => {
                  const doc = computeDocumentStatus(raw, zahlungsfrist);
                  const status = getStatus(doc.status);
                  const isRechnung = doc.typ === "rechnung";
                  return (
                    <div key={doc.id ?? `${doc.nummer}-${i}`} className="timeline-row">
                      <div className={`doc-type${isRechnung ? " doc-type--rechnung" : ""}`}>
                        {isRechnung ? "RG" : "OF"}
                      </div>
                      <div className="kunden-timeline-main">
                        <div className="kunden-timeline-title">
                          {doc.nummer}
                          {doc.objekt && <span className="kunden-timeline-obj"> · {doc.objekt}</span>}
                        </div>
                        <div className="kunden-timeline-date">
                          {new Date(doc.datum).toLocaleDateString("de-CH")}
                        </div>
                      </div>
                      <div className="kunden-timeline-aside">
                        <div className="kunden-timeline-amount num">
                          {formatCompactCurrency(doc.betrag, currency)}
                        </div>
                        <span
                          className="pill-badge"
                          style={{ color: status.color, background: status.bg }}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          </>
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
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${tone === "danger" ? " kpi-value--danger" : ""}`}>{value}</div>
      <div className="kpi-hint">{hint}</div>
    </div>
  );
}
