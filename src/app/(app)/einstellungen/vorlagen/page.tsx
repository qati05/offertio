"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Vorlage, Position } from "@/lib/types";

export default function VorlagenPage() {
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Vorlage | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadVorlagen();
  }, []);

  async function loadVorlagen() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("vorlagen")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    setVorlagen((data as Vorlage[]) || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Vorlage wirklich löschen?")) return;
    const supabase = createSupabaseBrowser();
    await supabase.from("vorlagen").delete().eq("id", id);
    setVorlagen((v) => v.filter((x) => x.id !== id));
    showToast("Vorlage gelöscht.");
  }

  async function handleSave(vorlage: Vorlage) {
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from("vorlagen")
      .update({
        name: vorlage.name,
        positionen: vorlage.positionen,
      })
      .eq("id", vorlage.id);

    if (error) {
      showToast("Fehler beim Speichern.");
      return;
    }

    setVorlagen((v) => v.map((x) => (x.id === vorlage.id ? vorlage : x)));
    setEditing(null);
    showToast("Vorlage gespeichert.");
  }

  async function handleCreate() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("vorlagen")
      .insert({
        user_id: user.id,
        name: "Neue Vorlage",
        beruf: "",
        positionen: [{ bezeichnung: "Position 1", einheit: "Std.", menge: 1, preis: 0 }],
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      showToast("Fehler beim Erstellen.");
      return;
    }

    setVorlagen((v) => [...v, data as Vorlage]);
    setEditing(data as Vorlage);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Vorlagen</h1>
          <p className="page-sub">Laden...</p>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <VorlageEditor
        vorlage={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">Vorlagen</h1>
          <p className="page-sub">Verwalte deine Offert-Vorlagen für schnelleres Arbeiten.</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          + Neue Vorlage
        </button>
      </div>

      {vorlagen.length === 0 ? (
        <div className="app-card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            Noch keine Vorlagen vorhanden.
          </p>
        </div>
      ) : (
        <div className="vorlagen-grid">
          {vorlagen.map((v) => (
            <div key={v.id} className="vorlage-card">
              <h3>{v.name}</h3>
              <p>
                {v.positionen.length} Position
                {v.positionen.length !== 1 ? "en" : ""}
              </p>
              <div className="vorlage-card-actions">
                <button
                  className="btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={() => setEditing(v)}
                >
                  Bearbeiten
                </button>
                <button className="btn-danger" onClick={() => handleDelete(v.id)}>
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.includes("Fehler") ? "toast-error" : "toast-success"}`}>
          {toast}
        </div>
      )}
    </div>
  );
}

function VorlageEditor({
  vorlage,
  onSave,
  onCancel,
}: {
  vorlage: Vorlage;
  onSave: (v: Vorlage) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(vorlage.name);
  const [positionen, setPositionen] = useState<Position[]>(vorlage.positionen);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  function updatePos(idx: number, key: keyof Position, value: string | number) {
    setPositionen((p) =>
      p.map((pos, i) => (i === idx ? { ...pos, [key]: value } : pos))
    );
  }

  function addPos() {
    setPositionen((p) => [
      ...p,
      { bezeichnung: "", einheit: "Std.", menge: 1, preis: 0 },
    ]);
  }

  function removePos(idx: number) {
    setPositionen((p) => p.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vorlage bearbeiten</h1>
      </div>

      <div className="app-card" style={{ maxWidth: 800, marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Vorlagenname</label>
          <input
            className="field field-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <table className="offerte-table">
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th style={{ width: 100 }}>Einheit</th>
              <th style={{ width: 100 }}>Preis/Einheit</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((pos, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={pos.bezeichnung}
                    onChange={(e) => updatePos(i, "bezeichnung", e.target.value)}
                    placeholder="Bezeichnung"
                  />
                </td>
                <td>
                  <input
                    value={pos.einheit}
                    onChange={(e) => updatePos(i, "einheit", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={pos.preis}
                    onChange={(e) =>
                      updatePos(i, "preis", parseFloat(e.target.value) || 0)
                    }
                  />
                </td>
                <td className="col-actions">
                  <button className="delete-row-btn" onClick={() => removePos(i)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          className="btn-secondary"
          onClick={addPos}
          style={{ marginTop: 12 }}
        >
          + Position hinzufügen
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="btn-primary"
          onClick={() => onSave({ ...vorlage, name, positionen })}
        >
          Speichern
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
