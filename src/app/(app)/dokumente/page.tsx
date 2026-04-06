"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getDachConfig } from "@/lib/dach";
import { buildDokumentCsv } from "@/lib/export";
import { groupDocumentsByCustomer } from "@/lib/customer-folders";
import { computeDocumentStatus } from "@/lib/dokument-status";
import type { DokumentHistorie, Profile } from "@/lib/types";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  entwurf:      { label: "In Arbeit",  color: "#6b7280", bg: "rgba(107,114,128,0.07)" },
  gesendet:     { label: "Ausstehend", color: "#A8622E", bg: "rgba(200,121,61,0.07)" },
  bezahlt:      { label: "Erledigt",   color: "#15803d", bg: "rgba(21,128,61,0.07)" },
  angenommen:   { label: "Bestätigt",  color: "#15803d", bg: "rgba(21,128,61,0.07)" },
  abgelaufen:   { label: "Abgelaufen", color: "#92400e", bg: "rgba(146,64,14,0.07)" },
  ueberfaellig: { label: "Überfällig", color: "#92400e", bg: "rgba(146,64,14,0.07)" },
};

/** Status options available per document type */
function statusOptionsFor(typ: "offerte" | "rechnung") {
  if (typ === "offerte") {
    return ["entwurf", "gesendet", "angenommen", "abgelaufen"] as const;
  }
  return ["entwurf", "gesendet", "bezahlt", "ueberfaellig"] as const;
}

type ViewMode = "history" | "customers" | "export";

export default function DokumentePage() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DokumentHistorie[]>([]);
  const [source, setSource] = useState<"cloud" | "local">("cloud");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<ViewMode>("history");
  const [customerQuery, setCustomerQuery] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportCustomer, setExportCustomer] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
        .limit(200),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);

    if (docsRes.error) {
      try {
        const local = JSON.parse(localStorage.getItem("dokument-history") || "[]");
        setHistory(local.map((d: Record<string, unknown>) => ({ ...d, betrag: Number(d.betrag) })));
        setSource("local");
      } catch {
        setHistory([]);
        setSource("local");
      }
    } else {
      const docs = (docsRes.data || []).map((d: Record<string, unknown>) => ({
        ...d,
        betrag: Number(d.betrag),
      })) as DokumentHistorie[];
      // Apply auto-computed statuses (überfällig / abgelaufen)
      setHistory(docs.map((doc) => computeDocumentStatus(doc, profile?.zahlungsfrist ?? 30)));
      setSource("cloud");
    }

    setLoading(false);
  }

  /** Update a single document's status via API, optimistically update UI. */
  const handleStatusChange = useCallback(
    async (doc: DokumentHistorie, newStatus: string) => {
      if (!doc.id || source === "local") return;
      setUpdatingId(doc.id);

      const optimistic = (prev: DokumentHistorie[]) =>
        prev.map((d: DokumentHistorie) =>
          d.id === doc.id ? { ...d, status: newStatus as DokumentHistorie["status"] } : d,
        );
      const revert = (prev: DokumentHistorie[]) =>
        prev.map((d: DokumentHistorie) => (d.id === doc.id ? { ...d, status: doc.status } : d));

      // Optimistic update
      setHistory(optimistic);

      try {
        const res = await fetch("/api/dokument/update-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc.id, status: newStatus }),
        });
        if (!res.ok) setHistory(revert);
      } catch {
        setHistory(revert);
      } finally {
        setUpdatingId(null);
      }
    },
    [source],
  );

  const currency = getDachConfig(profile?.land).currency;
  const zahlungsfrist = profile?.zahlungsfrist ?? 30;
  const customerFolders = useMemo(() => groupDocumentsByCustomer(history), [history]);
  const convertedInvoicesBySourceId = useMemo(
    () =>
      new Map(
        history
          .filter((doc) => doc.source_document_id)
          .map((doc) => [doc.source_document_id as string, doc]),
      ),
    [history],
  );
  const filteredFolders = customerFolders.filter((folder) =>
    folder.name.toLowerCase().includes(customerQuery.trim().toLowerCase()),
  );
  const exportableDocs = history.filter((doc) => {
    const date = new Date(doc.datum).getTime();
    const fromOk = exportFrom ? date >= new Date(exportFrom).getTime() : true;
    const toOk = exportTo ? date <= new Date(exportTo).getTime() : true;
    const customerOk = exportCustomer ? doc.kundenname === exportCustomer : true;
    return fromOk && toOk && customerOk;
  });

  function downloadCsv() {
    const csv = buildDokumentCsv(exportableDocs, currency);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offertio-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function DocRow({ doc, compact = false }: { doc: DokumentHistorie; compact?: boolean }) {
    const status = STATUS_META[doc.status] ?? STATUS_META.entwurf;
    const isRechnung = doc.typ === "rechnung";
    const convertedInvoice = doc.id ? convertedInvoicesBySourceId.get(doc.id) : null;
    const isUpdating = doc.id === updatingId;
    const options = statusOptionsFor(doc.typ);
    const canEdit = !!doc.id && source === "cloud";

    return (
      <div
        className={compact ? "flex items-center justify-between rounded-2xl px-4 py-3" : "app-shell-panel flex items-center gap-4 p-5"}
        style={compact ? { background: "var(--app-card-muted)" } : undefined}
      >
        {!compact && (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
            style={{
              background: isRechnung ? "rgba(200,121,61,0.08)" : "rgba(26,28,27,0.06)",
              color: isRechnung ? "var(--color-primary-strong)" : "var(--app-text)",
            }}
          >
            {isRechnung ? "RG" : "OF"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!compact && (
            <div className="truncate text-sm font-semibold" style={{ color: "var(--app-text)" }}>
              {doc.kundenname || "Unbekannter Kunde"}
            </div>
          )}
          <div className={`${compact ? "" : "mt-1 "}text-xs`} style={{ color: "var(--app-text-muted)" }}>
            {compact ? (
              <>{new Date(doc.datum).toLocaleDateString("de-CH")} · {doc.typ === "rechnung" ? "Rechnung" : "Offerte"}</>
            ) : (
              <>{doc.nummer} · {new Date(doc.datum).toLocaleDateString("de-CH")}{doc.objekt ? ` · ${doc.objekt}` : ""}</>
            )}
          </div>
          {(doc.source_document_nummer || doc.converted_document_nummer || convertedInvoice) && (
            <div className="mt-1 text-xs" style={{ color: "var(--color-primary-strong)" }}>
              {doc.source_document_nummer
                ? `Aus ${doc.source_document_nummer}`
                : `→ ${doc.converted_document_nummer || convertedInvoice?.nummer}`}
            </div>
          )}
          {compact && (
            <div className="mt-0.5 text-xs font-medium" style={{ color: "var(--app-text)" }}>
              {doc.nummer}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="text-sm font-bold tabular-nums" style={{ color: "var(--app-text)" }}>
            {currency} {doc.betrag.toLocaleString("de-CH", { minimumFractionDigits: 2 })}
          </div>
          {canEdit ? (
            <div className="relative">
              <select
                disabled={isUpdating}
                value={doc.status}
                onChange={(e) => void handleStatusChange(doc, e.target.value)}
                className="status-badge cursor-pointer appearance-none pr-5 text-xs"
                style={{
                  color: status.color,
                  background: status.bg,
                  border: "none",
                  outline: "none",
                  fontWeight: 600,
                  borderRadius: "6px",
                  padding: "2px 20px 2px 7px",
                  opacity: isUpdating ? 0.5 : 1,
                }}
              >
                {options.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s]?.label ?? s}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ color: status.color }}
              >
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : (
            <span className="status-badge" style={{ color: status.color, background: status.bg }}>
              {status.label}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-flow min-h-full">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="app-kicker">Dokumente</div>
            <h1 className="app-title-display mt-2">Deine Werke</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
              Alle Offerten und Rechnungen an einem Ort.{" "}
              {source === "local"
                ? "Aktuell aus der lokalen Geräte-Historie."
                : "Aktuell aus deiner Konto-Historie."}
            </p>
          </div>
          <Link href="/dokument/neu" className="btn-premium btn-premium-primary shrink-0">
            Neues Dokument
          </Link>
        </header>

        {/* Tab bar */}
        <div
          className="mb-6 grid grid-cols-3 gap-2 rounded-[20px] border p-1.5"
          style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.64)" }}
        >
          {[
            { key: "history",   label: "Dokumente"    },
            { key: "customers", label: "Kundenordner" },
            { key: "export",    label: "Export"        },
          ].map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key as ViewMode)}
                className="rounded-[14px] px-3 py-3 text-sm font-semibold transition"
                style={{
                  background: active ? "white" : "transparent",
                  color: active ? "var(--color-text)" : "var(--color-text-muted)",
                  boxShadow: active ? "var(--shadow-xs)" : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="app-shell-panel h-[88px]" />
            ))}
          </div>
        ) : view === "history" ? (
          history.length === 0 ? (
            <div className="app-shell-panel flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>
                Noch keine Dokumente vorhanden
              </div>
              <p className="mt-2 max-w-md text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
                Sobald du deine erste Offerte oder Rechnung erstellst, erscheint sie hier automatisch im Verlauf.
              </p>
              <Link href="/dokument/neu" className="btn-premium btn-premium-primary">
                Erste Offerte erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((doc, i) => (
                <DocRow key={`${doc.id ?? doc.nummer}-${i}`} doc={doc} />
              ))}
            </div>
          )
        ) : view === "customers" ? (
          <div className="space-y-4">
            <div className="app-shell-panel p-5">
              <div className="app-kicker">Kundensuche</div>
              <input
                className="field mt-4"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Kundenordner suchen"
              />
            </div>

            {filteredFolders.length === 0 ? (
              <div className="app-shell-panel px-6 py-14 text-center">
                <div className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>
                  Kein Kundenordner gefunden
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
                  Kundenordner entstehen automatisch, sobald du Dokumente für einen Kunden erstellst.
                </p>
              </div>
            ) : (
              filteredFolders.map((folder) => {
                const expanded = expandedCustomer === folder.slug;
                // Compute total revenue for customer
                const totalRevenue = folder.docs
                  .filter((d) => d.typ === "rechnung" && d.status === "bezahlt")
                  .reduce((sum, d) => sum + d.betrag, 0);

                return (
                  <div key={folder.slug} className="app-shell-panel overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      onClick={() => setExpandedCustomer(expanded ? null : folder.slug)}
                    >
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--app-text)" }}>
                          {folder.name}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: "var(--app-text-muted)" }}>
                          {folder.docs.length} {folder.docs.length === 1 ? "Dokument" : "Dokumente"}
                          {" · "}zuletzt {new Date(folder.latestDate).toLocaleDateString("de-CH")}
                          {totalRevenue > 0 && (
                            <span className="ml-2 font-medium" style={{ color: "var(--color-primary-strong)" }}>
                              · {currency} {totalRevenue.toLocaleString("de-CH", { minimumFractionDigits: 2 })} bezahlt
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-semibold" style={{ color: "var(--color-primary-strong)" }}>
                        {expanded ? "−" : "+"}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "var(--app-border)" }}>
                        <div className="space-y-3">
                          {folder.docs.map((doc, idx) => (
                            <DocRow
                              key={`${doc.id ?? doc.nummer}-${idx}`}
                              doc={computeDocumentStatus(doc, zahlungsfrist)}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="app-shell-panel p-6">
              <div className="app-kicker">Buchhaltungs-Export</div>
              <h2
                className="mt-3 text-2xl font-bold tracking-[-0.03em]"
                style={{ color: "var(--app-text)" }}
              >
                Dokumente für Buchhaltung vorbereiten
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
                Zeitraum wählen, optional nach Kunde filtern und dann alle passenden Dokumente als CSV exportieren.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="form-label">Von</label>
                  <input
                    type="date"
                    className="field"
                    value={exportFrom}
                    onChange={(e) => setExportFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Bis</label>
                  <input
                    type="date"
                    className="field"
                    value={exportTo}
                    onChange={(e) => setExportTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Kunde</label>
                  <div className="select-wrap">
                    <select
                      value={exportCustomer}
                      onChange={(e) => setExportCustomer(e.target.value)}
                    >
                      <option value="">Alle Kunden</option>
                      {customerFolders.map((folder) => (
                        <option key={folder.slug} value={folder.name}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div
                className="mt-6 rounded-[18px] px-4 py-4 text-sm"
                style={{ background: "var(--app-card-muted)", color: "var(--app-text-muted)" }}
              >
                {exportableDocs.length} Dokumente im aktuellen Export.
              </div>

              <button
                className="btn-premium btn-premium-primary mt-6"
                onClick={downloadCsv}
                disabled={exportableDocs.length === 0}
              >
                CSV exportieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
