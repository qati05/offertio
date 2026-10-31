"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

export default function PasswortPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Das Passwort braucht mindestens 8 Zeichen.");
      return;
    }
    if (password !== confirm) {
      setError("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(`Passwort konnte nicht gespeichert werden: ${updateError.message}`);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px" }}>
      <form onSubmit={handleSubmit} className="app-card">
        <div className="app-card-title">Passwort zurücksetzen</div>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
          Wähle ein neues Passwort mit mindestens 8 Zeichen.
        </p>
        <label className="form-label" htmlFor="neues-passwort">Neues Passwort</label>
        <input
          id="neues-passwort"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="form-input"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <label className="form-label" htmlFor="passwort-bestaetigen" style={{ marginTop: 12 }}>
          Passwort wiederholen
        </label>
        <input
          id="passwort-bestaetigen"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="form-input"
          autoComplete="new-password"
          required
          minLength={8}
        />
        {error ? (
          <div className="auth-alert auth-alert-error" style={{ marginTop: 12 }}>{error}</div>
        ) : null}
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? "Bitte warten..." : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
