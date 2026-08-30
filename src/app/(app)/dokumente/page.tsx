"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getDachConfig } from "@/lib/dach";
import { buildDokumentCsv } from "@/lib/export";
import { groupDocumentsByCustomer } from "@/lib/customer-folders";
import { computeDocumentStatus, getStatus, MAHNSTUFE_SHORT, MAX_MAHNSTUFE, isMahnungCandidate } from "@/lib/dokument-status";
import { checkStornoTransition } from "@/lib/dokument-immutability";
import { getStornoConfirmation } from "@/lib/status-transitions";
import type { DokumentHistorie, Profile } from "@/lib/types";

/** Status options available per document type */
function statusOptionsFor(typ: "offerte" | "rechnung") {
  if (typ === "offerte") {
    return ["entwurf", "gesendet", "angenommen", "abgelaufen"] as const;
  }
  return ["entwurf", "gesendet", "bezahlt", "ueberfaellig"] as const;
}

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

export default function DokumentePage() {
  // Seed state from localStorage immediately — zero-latency first paint.
  const [history, setHistory] = useState<DokumentHistorie[]>(() => readCachedHistory());
  const [profile, setProfile] = useState<Profile | null>(() => readCachedProfile());
  // Only show the skeleton on the very first visit (no cache).
  const [loading, setLoading] = useState(() =>
    typeof window === "undefined" ||
    (!localStorage.getItem("dokument-history") && !localStorage.getItem("offertio-profile-cache"))
  );
  const [source, setSource] = useState<"cloud" | "local">("cloud");
  const [searchQuery, setSearchQuery] = useState("");
  const [typFilter, setTypFilter] = useState<"alle" | "offerte" | "rechnung">("alle");
  const [statusFilter, setStatusFilter] = useState<"alle" | "offen" | "bezahlt" | "ueberfaellig">("alle");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  /**
   * Until now every failed row action reverted in silence — the archive had no
   * way at all to tell the user that something did not work. Cancelling must
   * not be the first irreversible action shipped without one.
   */
  const [toast, setToast] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportCustomer, setExportCustomer] = useState("");

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
      // Only columns rendered in the list / used for filtering. The heavy
      // jsonb columns (positionen, rabatt, notiz) live on the same row but
      // are only needed when the user clicks through to edit/carryover.
      supabase
        .from("dokumente")
        .select(
          "id, typ, nummer, objekt, kundenname, customer_id, kunde_email, kunde_adresse, kunde_adresse2, kunde_plz, kunde_ort, kunde_uid_mwst, betrag, datum, leistungsdatum, status, payment_received_at, mahnstufe, last_mahnung_at, pdf_url, source_document_id, source_document_nummer, source_document_typ, converted_document_id, converted_document_nummer, converted_document_typ",
        )
        .eq("user_id", user.id)
        .order("datum", { ascending: false })
        .limit(200),
    ]);

    const loadedProfile = profileRes.data as Profile | null;
    if (loadedProfile) {
      setProfile(loadedProfile);
      try { localStorage.setItem("offertio-profile-cache", JSON.stringify(loadedProfile)); } catch { /* ignore */ }
    }

    if (docsRes.error) {
      // Supabase failed — keep the cached data already rendered.
      setSource("local");
    } else {
      const docs = (docsRes.data || []).map((d: Record<string, unknown>) => ({
        ...d,
        betrag: Number(d.betrag),
      })) as DokumentHistorie[];
      // Apply auto-computed statuses (überfällig / abgelaufen)
      const frist = loadedProfile?.zahlungsfrist ?? 30;
      setHistory(docs.map((doc) => computeDocumentStatus(doc, frist)));
      setSource("cloud");
    }

    setLoading(false);
  }

  /** Mark a Rechnung as paid (quick action). */
  const handleMarkPaid = useCallback(async (doc: DokumentHistorie) => {
    if (!doc.id || source === "local") return;
    setUpdatingId(doc.id);

    const stamp = new Date().toISOString();
    const optimistic = (prev: DokumentHistorie[]) =>
      prev.map((d) =>
        d.id === doc.id
          ? { ...d, status: "bezahlt" as const, payment_received_at: stamp, mahnstufe: 0 }
          : d,
      );
    const revert = (prev: DokumentHistorie[]) => prev.map((d) => (d.id === doc.id ? doc : d));

    setHistory(optimistic);
    try {
      const res = await fetch("/api/dokument/mark-paid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      if (!res.ok) setHistory(revert);
    } catch {
      setHistory(revert);
    } finally {
      setUpdatingId(null);
    }
  }, [source]);

  /** Escalate to the next Mahnstufe for an overdue Rechnung. */
  /**
   * Cancelling an invoice. The route existed, was hardened and tested, and had
   * no caller anywhere in the interface — while the immutability error told the
   * user in so many words to "storniere sie".
   *
   * Cancellation is terminal, so unlike the other row actions this one asks
   * first. The prompt carries the warning and collects the optional reason in
   * one dialog: pressing Cancel returns null and aborts, an empty field means
   * "no reason given".
   *
   * Not optimistic, deliberately. The other actions guess the new state and
   * revert on failure; here a wrong guess would show an invoice as cancelled
   * that is not, which is exactly the kind of thing the archive must never lie
   * about. The row updates from the server's answer.
   */
  const handleStorno = useCallback(async (doc: DokumentHistorie) => {
    if (!doc.id || source === "local") return;

    const grund = window.prompt(getStornoConfirmation(doc.nummer, doc.kundenname));
    if (grund === null) return;

    setUpdatingId(doc.id);
    try {
      const res = await fetch("/api/dokument/storno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, grund: grund.trim() || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setToast(body?.error ?? "Stornierung fehlgeschlagen. Bitte versuche es erneut.");
        return;
      }
      setHistory((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, status: "storniert", storniert_at: body?.document?.storniert_at ?? null }
            : d,
        ),
      );
    } catch {
      setToast("Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setUpdatingId(null);
    }
  }, [source]);

  const handleMahnung = useCallback(async (doc: DokumentHistorie) => {
    if (!doc.id || source === "local") return;
    const nextStufe = Math.min((doc.mahnstufe ?? 0) + 1, MAX_MAHNSTUFE);
    if (nextStufe <= (doc.mahnstufe ?? 0)) return;

    setUpdatingId(doc.id);
    const stamp = new Date().toISOString();
    const optimistic = (prev: DokumentHistorie[]) =>
      prev.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              mahnstufe: nextStufe,
              last_mahnung_at: stamp,
              status: d.status === "gesendet" ? ("ueberfaellig" as const) : d.status,
            }
          : d,
      );
    const revert = (prev: DokumentHistorie[]) => prev.map((d) => (d.id === doc.id ? doc : d));

    setHistory(optimistic);
    try {
      const res = await fetch("/api/dokument/mahnung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      if (!res.ok) setHistory(revert);
    } catch {
      setHistory(revert);
    } finally {
      setUpdatingId(null);
    }
  }, [source]);

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
  const filteredHistory = useMemo(() => {
    return history.filter((doc) => {
      if (typFilter !== "alle" && doc.typ !== typFilter) return false;
      if (statusFilter === "alle") return true;
      if (statusFilter === "offen") {
        return doc.status === "gesendet" || doc.status === "ueberfaellig";
      }
      if (statusFilter === "bezahlt") return doc.status === "bezahlt";
      if (statusFilter === "ueberfaellig") return doc.status === "ueberfaellig";
      return true;
    });
  }, [history, typFilter, statusFilter]);

  const customerFolders = useMemo(
    () => groupDocumentsByCustomer(filteredHistory),
    [filteredHistory],
  );
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
    folder.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
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
    const status = getStatus(doc.status);
    const isRechnung = doc.typ === "rechnung";
    const convertedInvoice = doc.id ? convertedInvoicesBySourceId.get(doc.id) : null;
    const isUpdating = doc.id === updatingId;
    const options = statusOptionsFor(doc.typ);
    const canEdit = !!doc.id && source === "cloud";
    const mahnstufe = doc.mahnstufe ?? 0;
    const isPaid = !!doc.payment_received_at || doc.status === "bezahlt";
    const isCancelled = doc.status === "storniert";
    const canMahnen = isRechnung && canEdit && !isPaid && !isCancelled && isMahnungCandidate(doc, zahlungsfrist) && mahnstufe < MAX_MAHNSTUFE;
    const canMarkPaid = isRechnung && canEdit && !isPaid && !isCancelled && doc.status !== "entwurf";
    // Same rule the storno route enforces, imported rather than restated: an
    // issued invoice may be cancelled, a draft is deleted instead, a quotation
    // has nothing to cancel, and a cancellation is terminal.
    const canStorno =
      canEdit && checkStornoTransition({ typ: doc.typ, currentStatus: doc.status }).ok;

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
          {!compact &&
            doc.typ === "offerte" &&
            (doc.status === "angenommen" || doc.status === "gesendet") &&
            !doc.converted_document_id &&
            !convertedInvoice &&
            doc.id && (
              <Link
                href={`/dokument/neu?typ=rechnung&from=${encodeURIComponent(doc.id)}`}
                className="convert-link mt-2"
              >
                → Rechnung aus Offerte erstellen
              </Link>
            )}
          {!compact && isRechnung && doc.id && canEdit && (
            <Link
              href={`/einstellungen/wiederkehrend/neu?from=${encodeURIComponent(doc.id)}`}
              className="convert-link mt-2"
            >
              → Als Serie anlegen
            </Link>
          )}
          {!compact && mahnstufe > 0 && (
            <div
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
              style={{
                color: "#B91C1C",
                background: "rgba(185,28,28,0.08)",
                padding: "2px 8px",
                borderRadius: 999,
                width: "fit-content",
              }}
            >
              ⚠ {MAHNSTUFE_SHORT[mahnstufe] || `Stufe ${mahnstufe}`} versendet
            </div>
          )}
          {!compact && (canMarkPaid || canMahnen || canStorno) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canMarkPaid && (
                <button
                  type="button"
                  className="mahnwesen-action-btn"
                  onClick={() => void handleMarkPaid(doc)}
                  disabled={isUpdating}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(26,127,66,0.3)",
                    background: "rgba(26,127,66,0.06)",
                    color: "#1A7F42",
                    cursor: isUpdating ? "wait" : "pointer",
                    opacity: isUpdating ? 0.6 : 1,
                  }}
                >
                  ✓ Bezahlt
                </button>
              )}
              {canMahnen && (
                <button
                  type="button"
                  className="mahnwesen-action-btn"
                  onClick={() => void handleMahnung(doc)}
                  disabled={isUpdating}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(185,28,28,0.3)",
                    background: "rgba(185,28,28,0.06)",
                    color: "#B91C1C",
                    cursor: isUpdating ? "wait" : "pointer",
                    opacity: isUpdating ? 0.6 : 1,
                  }}
                >
                  {mahnstufe === 0
                    ? "Zahlungserinnerung senden"
                    : mahnstufe === 1
                      ? "1. Mahnung senden"
                      : "2. Mahnung senden"}
                </button>
              )}
              {canStorno && (
                <button
                  type="button"
                  className="mahnwesen-action-btn"
                  onClick={() => void handleStorno(doc)}
                  disabled={isUpdating}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--app-border)",
                    background: "transparent",
                    color: "var(--app-text-muted)",
                    cursor: isUpdating ? "wait" : "pointer",
                    opacity: isUpdating ? 0.6 : 1,
                  }}
                >
                  Stornieren
                </button>
              )}
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
          {/* A cancelled invoice gets a static badge, never the dropdown. Its
              status is not in statusOptionsFor, and a controlled <select> with
              no matching <option> displays the FIRST option instead — so a
              cancelled invoice showed up as "Entwurf". Cancellation is also
              terminal, so there is nothing to choose. */}
          {canEdit && !isCancelled ? (
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
                    {getStatus(s).label}
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
              Alle Offerten und Rechnungen an einem Ort.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Export icon button */}
            <button
              type="button"
              onClick={() => setShowExport(!showExport)}
              aria-label={showExport ? "CSV-Export schliessen" : "CSV-Export öffnen"}
              aria-expanded={showExport}
              title="CSV Export"
              style={{
                width: 44, height: 44,
                borderRadius: 12,
                border: "1px solid var(--app-border)",
                background: showExport ? "var(--app-card-muted)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: "var(--app-text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <Link href="/dokument/neu" className="btn-premium btn-premium-primary shrink-0">
              Neues Dokument
            </Link>
          </div>
        </header>

        {/* Export drawer — collapsible, not a tab */}
        {showExport && (
          <div
            className="app-shell-panel mb-6 p-5"
            style={{ borderColor: "rgba(200,121,61,0.15)" }}
          >
            <div className="flex items-center justify-between">
              <div className="app-kicker">CSV Export</div>
              <button
                type="button"
                onClick={() => setShowExport(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 18, color: "var(--app-text-muted)", lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--app-text-muted)" }}>
                {exportableDocs.length} Dokumente
              </span>
              <button
                className="btn-premium btn-premium-primary"
                onClick={downloadCsv}
                disabled={exportableDocs.length === 0}
              >
                CSV exportieren
              </button>
            </div>
          </div>
        )}

        {/* Search + Filters */}
        {!loading && history.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <input
              className="field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kunde suchen…"
              style={{ maxWidth: 360 }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterChipGroup
                value={typFilter}
                onChange={setTypFilter}
                options={[
                  { value: "alle", label: "Alle" },
                  { value: "offerte", label: "Offerten" },
                  { value: "rechnung", label: "Rechnungen" },
                ]}
              />
              <span className="filter-divider" aria-hidden="true" />
              <FilterChipGroup
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "alle", label: "Alle Status" },
                  { value: "offen", label: "Offen" },
                  { value: "bezahlt", label: "Bezahlt" },
                  { value: "ueberfaellig", label: "Überfällig" },
                ]}
              />
              {(typFilter !== "alle" || statusFilter !== "alle") && (
                <button
                  type="button"
                  className="filter-reset"
                  onClick={() => { setTypFilter("alle"); setStatusFilter("alle"); }}
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="app-shell-panel h-[88px]" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="app-shell-panel flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>
              Noch keine Dokumente vorhanden
            </div>
            <p className="mt-2 max-w-md text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
              Sobald du deine erste Offerte oder Rechnung erstellst, erscheint sie hier automatisch.
            </p>
            <Link href="/dokument/neu" className="btn-premium btn-premium-primary mt-4">
              Erste Offerte erstellen
            </Link>
          </div>
        ) : searchQuery.trim() ? (
          /* Search results — grouped by customer */
          filteredFolders.length === 0 ? (
            <div className="app-shell-panel px-6 py-14 text-center">
              <div className="text-lg font-semibold" style={{ color: "var(--app-text)" }}>
                Kein Kunde gefunden
              </div>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
                Kundenordner entstehen automatisch aus deinen Dokumenten.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFolders.map((folder, i) => (
                <motion.div
                  key={folder.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CustomerFolder
                    folder={folder}
                    expanded={expandedCustomer === folder.slug}
                    onToggle={() => setExpandedCustomer(expandedCustomer === folder.slug ? null : folder.slug)}
                    zahlungsfrist={zahlungsfrist}
                    DocRow={DocRow}
                    currency={currency}
                  />
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Default view — recent documents grouped by customer */
          <div className="space-y-3">
            {filteredFolders.map((folder, i) => (
              <motion.div
                key={folder.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <CustomerFolder
                  folder={folder}
                  expanded={expandedCustomer === folder.slug}
                  onToggle={() => setExpandedCustomer(expandedCustomer === folder.slug ? null : folder.slug)}
                  zahlungsfrist={zahlungsfrist}
                  DocRow={DocRow}
                  currency={currency}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{
            background: "var(--app-card)",
            border: "1px solid var(--app-border)",
            color: "var(--app-text)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex-1 leading-6">{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Meldung schliessen"
              className="shrink-0 text-lg leading-none"
              style={{ color: "var(--app-text-muted)", minWidth: 44, minHeight: 44 }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Customer Folder Card ──────────────────────────────── */

function CustomerFolder({
  folder,
  expanded,
  onToggle,
  zahlungsfrist,
  DocRow,
}: {
  folder: ReturnType<typeof groupDocumentsByCustomer>[number];
  expanded: boolean;
  onToggle: () => void;
  zahlungsfrist: number;
  DocRow: React.ComponentType<{ doc: DokumentHistorie; compact?: boolean }>;
  currency: string;
}) {
  return (
    <div className="app-shell-panel overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
        onClick={onToggle}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--app-text)" }}>
            {folder.name}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--app-text-muted)" }}>
            {folder.docs.length} {folder.docs.length === 1 ? "Dokument" : "Dokumente"}
            {" · "}zuletzt {new Date(folder.latestDate).toLocaleDateString("de-CH")}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Latest document status chip */}
          {folder.docs[0] && (() => {
            const st = getStatus(folder.docs[0].status);
            return (
              <span
                className="pill-badge"
                style={{ color: st.color, background: st.bg }}
              >
                {st.label}
              </span>
            );
          })()}
          <span className="text-sm font-semibold" style={{ color: "var(--color-primary-strong)" }}>
            {expanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "var(--app-border)" }}>
          <div className="mb-4 flex justify-end">
            <Link
              href={`/kunden/${encodeURIComponent(folder.slug)}`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-primary)",
                textDecoration: "none",
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid var(--app-border)",
                background: "var(--app-card)",
              }}
            >
              Kundenprofil öffnen →
            </Link>
          </div>
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
}

/* ── Filter Chip Group ───────────────────────────────── */

function FilterChipGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <div className="filter-chip-group" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`filter-chip${value === opt.value ? " filter-chip--active" : ""}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
