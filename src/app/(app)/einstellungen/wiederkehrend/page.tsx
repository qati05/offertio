"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecurringScheduleRecord } from "@/lib/types";
import { formatSwissDate } from "@/lib/dates";

const FREQUENCY_LABEL: Record<RecurringScheduleRecord["frequency"], string> = {
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  quarterly: "Quartalsweise",
  yearly: "Jährlich",
};

export default function WiederkehrendPage() {
  const [schedules, setSchedules] = useState<RecurringScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Fehler beim Laden.");
        setSchedules([]);
        return;
      }
      setSchedules(json.schedules ?? []);
    } catch {
      showToast("Netzwerkfehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(schedule: RecurringScheduleRecord) {
    try {
      const res = await fetch(`/api/recurring/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !schedule.active }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Fehler beim Aktualisieren.");
        return;
      }
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, active: !s.active } : s)),
      );
      showToast(!schedule.active ? "Serie aktiviert." : "Serie pausiert.");
    } catch {
      showToast("Netzwerkfehler.");
    }
  }

  async function deleteSchedule(schedule: RecurringScheduleRecord) {
    if (!confirm(`Serie "${schedule.template?.nummer ?? schedule.id}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/recurring/${schedule.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Fehler beim Löschen.");
        return;
      }
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      showToast("Serie gelöscht.");
    } catch {
      showToast("Netzwerkfehler.");
    }
  }

  async function runNow() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/recurring/run", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Fehler bei der Ausführung.");
        return;
      }
      const g = json.generated ?? 0;
      const s = json.skipped ?? 0;
      if (g === 0 && s === 0) {
        showToast("Keine fälligen Serien.");
      } else {
        showToast(`${g} neue Entwurf${g !== 1 ? "s" : ""} erstellt${s ? `, ${s} übersprungen` : ""}.`);
      }
      await loadSchedules();
    } catch {
      showToast("Netzwerkfehler.");
    } finally {
      setRunning(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  return (
    <div style={{ minHeight: "100%", maxWidth: 900, margin: "0 auto", padding: "48px 24px 104px" }}>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 className="page-title">Wiederkehrende Rechnungen</h1>
          <p className="page-sub">
            Lege Rechnungen an, die automatisch in regelmäßigen Abständen erstellt werden. Du überprüfst den
            Entwurf und versendest ihn manuell.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={runNow}
          disabled={running || loading}
          style={{ opacity: running || loading ? 0.6 : 1 }}
        >
          {running ? "Wird ausgeführt…" : "Jetzt fällige ausführen"}
        </button>
      </div>

      {loading ? (
        <div className="app-card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Laden…</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="app-card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: 12 }}>
            Noch keine Serien angelegt.
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
            Öffne eine bestehende Rechnung in der Dokumentenliste und wähle „Als Serie anlegen".
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {schedules.map((s) => {
            const endReached = !s.active && !!s.last_generated_at;
            return (
              <div
                key={s.id}
                className="app-card"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  padding: 20,
                  opacity: s.active ? 1 : 0.72,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: s.active ? "rgba(34,197,94,0.12)" : "rgba(107,114,128,0.12)",
                        color: s.active ? "#16a34a" : "#6b7280",
                      }}
                    >
                      {s.active ? "Aktiv" : endReached ? "Beendet" : "Pausiert"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {FREQUENCY_LABEL[s.frequency]}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {s.template?.nummer ?? "– (Vorlage gelöscht)"}
                    {s.template?.kundenname ? (
                      <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                        {" · "}
                        {s.template.kundenname}
                      </span>
                    ) : null}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Nächste Erstellung: <strong>{formatSwissDate(s.next_generation_at)}</strong>
                    {s.end_date ? (
                      <>
                        {" · "}Endet am {formatSwissDate(s.end_date)}
                      </>
                    ) : null}
                    {s.last_generated_at ? (
                      <>
                        {" · "}Zuletzt:{" "}
                        {formatSwissDate(s.last_generated_at.slice(0, 10))}
                      </>
                    ) : null}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => toggleActive(s)}
                  >
                    {s.active ? "Pausieren" : "Aktivieren"}
                  </button>
                  <button
                    className="btn-danger"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => deleteSchedule(s)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <Link
          href="/dokumente"
          style={{ fontSize: 13, color: "var(--color-primary)", textDecoration: "underline" }}
        >
          ← Zurück zu den Dokumenten
        </Link>
      </div>

      {toast && (
        <div className={`toast ${toast.toLowerCase().includes("fehler") ? "toast-error" : "toast-success"}`}>
          {toast}
        </div>
      )}
    </div>
  );
}
