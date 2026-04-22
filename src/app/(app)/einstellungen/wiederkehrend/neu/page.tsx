"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { isValidUUID } from "@/lib/security";

type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function NeueSerieInner() {
  const router = useRouter();
  const params = useSearchParams();
  const fromId = params.get("from") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<{ id: string; nummer: string; typ: string; kundenname: string } | null>(null);

  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextGeneration, setNextGeneration] = useState<string>(todayIso());
  const [endDate, setEndDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!fromId || !isValidUUID(fromId)) {
        setError("Keine gültige Vorlage-ID angegeben.");
        setLoading(false);
        return;
      }
      const supabase = createSupabaseBrowser();
      const { data, error: dbErr } = await supabase
        .from("dokumente")
        .select("id, nummer, typ, kundenname")
        .eq("id", fromId)
        .maybeSingle();

      if (dbErr || !data) {
        setError("Dokument nicht gefunden.");
        setLoading(false);
        return;
      }
      if (data.typ !== "rechnung") {
        setError("Nur Rechnungen können als Serie angelegt werden.");
        setLoading(false);
        return;
      }
      setTemplate(data as { id: string; nummer: string; typ: string; kundenname: string });
      setLoading(false);
    })();
  }, [fromId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!template || submitting) return;

    if (endDate && endDate < nextGeneration) {
      setError("Enddatum darf nicht vor dem Startdatum liegen.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_dokument_id: template.id,
          frequency,
          next_generation_at: nextGeneration,
          end_date: endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Serie konnte nicht angelegt werden.");
        setSubmitting(false);
        return;
      }
      router.replace("/einstellungen/wiederkehrend");
    } catch {
      setError("Netzwerkfehler.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", maxWidth: 640, margin: "0 auto", padding: "48px 24px 104px" }}>
      <div className="page-header">
        <h1 className="page-title">Als Serie anlegen</h1>
        <p className="page-sub">
          Lege fest, in welchem Rhythmus aus dieser Rechnung automatisch neue Entwürfe erzeugt werden.
        </p>
      </div>

      {loading ? (
        <div className="app-card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Laden…</p>
        </div>
      ) : error && !template ? (
        <div className="app-card" style={{ padding: 24 }}>
          <p style={{ color: "#dc2626", fontSize: 14, marginBottom: 12 }}>{error}</p>
          <Link href="/dokumente" style={{ color: "var(--color-primary)", fontSize: 13 }}>
            ← Zurück zu den Dokumenten
          </Link>
        </div>
      ) : template ? (
        <form onSubmit={submit} className="app-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>Vorlage</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {template.nummer}
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                {" · "}
                {template.kundenname}
              </span>
            </div>
          </div>

          <label className="form-label" htmlFor="freq">Rhythmus</label>
          <div className="select-wrap" style={{ marginBottom: 16 }}>
            <select
              id="freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Quartalsweise</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>

          <label className="form-label" htmlFor="next">Erste Generierung am</label>
          <input
            id="next"
            type="date"
            className="field"
            value={nextGeneration}
            onChange={(e) => setNextGeneration(e.target.value)}
            required
            style={{ marginBottom: 16 }}
          />

          <label className="form-label" htmlFor="end">Enddatum (optional)</label>
          <input
            id="end"
            type="date"
            className="field"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ marginBottom: 20 }}
          />

          {error && (
            <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Link href="/dokumente" className="btn-secondary">
              Abbrechen
            </Link>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Wird gespeichert…" : "Serie anlegen"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default function NeueSeriePage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: "center" }}>Laden…</div>}>
      <NeueSerieInner />
    </Suspense>
  );
}
