"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { DEFAULT_VORLAGEN } from "@/lib/vorlagen-defaults";
import { getAllLands, getDachConfig } from "@/lib/dach";
import { getRequiredTaxField, hasRequiredTaxId } from "@/lib/profile";
import { useT, LOCALE_LABELS } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { Land } from "@/lib/types";

const BERUFE = [
  "Maler / Gipser",
  "Elektriker",
  "Sanitär / Heizung",
  "Schreiner / Zimmermann",
  "Maurer / Bau",
  "Spengler / Dachdecker",
  "Gaertner / Landschaftsbau",
  "Bodenleger / Fliesenleger",
  "Anderes Handwerk",
];

export default function ProfilPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const { t, setLocale } = useT();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState<"classic" | "modern" | "minimal" | "professionell">("classic");
  const [logoUrl, setLogoUrl] = useState("");
  const [kleinunternehmer, setKleinunternehmer] = useState(false);
  const [form, setForm] = useState({
    firmenname: "",
    vorname: "",
    nachname: "",
    adresse: "",
    plz: "",
    ort: "",
    telefon: "",
    iban: "",
    bic: "",
    uid_mwst: "",
    steuernummer: "",
    fn_nr: "",
    land: "CH" as Land,
    sprache: "de",
    beruf: "",
    zahlungsfrist: "30",
  });

  const dachConfig = getDachConfig(form.land);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setForm({
        firmenname: data.firmenname || "",
        vorname: data.vorname || "",
        nachname: data.nachname || "",
        adresse: data.adresse || "",
        plz: data.plz || "",
        ort: data.ort || "",
        telefon: data.telefon || "",
        iban: data.iban || "",
        bic: data.bic || "",
        uid_mwst: data.uid_mwst || "",
        steuernummer: data.steuernummer || "",
        fn_nr: data.fn_nr || "",
        land: data.land || "CH",
        sprache: data.sprache || "de",
        beruf: data.beruf || "",
        zahlungsfrist: String(data.zahlungsfrist || 30),
      });
      if (data.logo_url) setLogoUrl(data.logo_url);
      if (data.sprache && data.sprache in LOCALE_LABELS) {
        setLocale(data.sprache as Locale);
      }
      if (data.pdf_template && ["classic", "modern", "minimal", "professionell"].includes(data.pdf_template)) {
        setPdfTemplate(data.pdf_template as typeof pdfTemplate);
      }
      setKleinunternehmer(!!data.kleinunternehmer);
    }

    setLoading(false);
  }

  function update(key: string, value: string) {
    if (key === "land" && value !== form.land) {
      if (!window.confirm("Land ändern löscht Steuernummer und IBAN. Fortfahren?")) return;
      setForm((current) => ({
        ...current,
        land: value as Land,
        iban: "",
        bic: "",
        uid_mwst: "",
        steuernummer: "",
        fn_nr: "",
      }));
      return;
    }

    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side pre-check for UX only — server validates via magic bytes.
    if (file.size > 2 * 1024 * 1024) {
      setToast("Logo darf max. 2 MB gross sein.");
      setTimeout(() => setToast(""), 4000);
      return;
    }

    setUploading(true);

    // Upload through our server-side route which validates file content
    // via magic bytes and prevents MIME-type spoofing.
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setToast(data.error ?? "Fehler beim Hochladen. Bitte versuche es erneut.");
        setUploading(false);
        setTimeout(() => setToast(""), 4000);
        return;
      }

      setLogoUrl(data.url);
      setToast("Logo hochgeladen!");
    } catch {
      setToast("Fehler beim Hochladen. Bitte versuche es erneut.");
    }

    setUploading(false);
    setTimeout(() => setToast(""), 4000);
  }

  async function handleLogoRemove() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    await supabase.from("profiles").update({ logo_url: "" }).eq("id", user.id);

    setLogoUrl("");
    setToast("Logo entfernt.");
    setTimeout(() => setToast(""), 4000);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    const requiredTax = getRequiredTaxField(form.land);
    if (requiredTax && !hasRequiredTaxId(form, form.land)) {
      setToast(`${requiredTax.label} ist für ${getDachConfig(form.land).name} erforderlich.`);
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      window.location.href = "/login";
      return;
    }

    // Explicit whitelist — never spread user-controlled objects into DB updates.
    // This prevents accidental mass-assignment of privileged fields (plan, etc.)
    // even if the form state were somehow injected with extra keys.
    const profileData = {
      id: user.id,
      email: user.email || "",
      firmenname: form.firmenname,
      vorname: form.vorname,
      nachname: form.nachname,
      adresse: form.adresse,
      plz: form.plz,
      ort: form.ort,
      telefon: form.telefon,
      iban: form.iban,
      bic: form.bic,
      uid_mwst: form.uid_mwst,
      steuernummer: form.steuernummer,
      fn_nr: form.fn_nr,
      land: form.land,
      sprache: form.sprache,
      beruf: form.beruf,
      zahlungsfrist: parseInt(form.zahlungsfrist, 10) || 30,
      kleinunternehmer,
    };

    const { error } = await supabase.from("profiles").upsert(profileData, { onConflict: "id" });

    if (error) {
      setToast("Fehler beim Speichern. Bitte versuche es erneut.");
      setSaving(false);
      setTimeout(() => setToast(""), 4000);
      return;
    }

    if (isOnboarding && form.beruf) {
      const { count } = await supabase
        .from("vorlagen")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!count) {
        const defaults = DEFAULT_VORLAGEN[form.beruf];
        if (defaults) {
          for (const vorlage of defaults) {
            await supabase.from("vorlagen").insert({
              user_id: user.id,
              name: vorlage.name,
              beruf: form.beruf,
              positionen: vorlage.positionen,
            });
          }
        }
      }
    }

    setSaving(false);
    setToast("Profil gespeichert!");
    setTimeout(() => setToast(""), 4000);

    // Save PDF template separately (requires DB column pdf_template in profiles)
    try {
      await supabase.from("profiles").update({ pdf_template: pdfTemplate }).eq("id", user.id);
    } catch {
      // Column may not exist yet — no-op
    }

    if (isOnboarding) {
      router.push("/dashboard");
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">
            {isOnboarding ? t("profile.welcome") : t("profile.title")}
          </h1>
          <p className="page-sub">{t("nav.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          {isOnboarding ? t("profile.welcome") : t("profile.title")}
        </h1>
        <p className="page-sub">
          {isOnboarding ? t("profile.welcomeSub") : t("profile.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="app-card" style={{ maxWidth: 640, marginBottom: 20 }}>
          <div className="app-card-title">{t("profile.logo")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Firmenlogo"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "contain",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  border: "2px dashed var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "var(--color-text-muted)",
                }}
              >
                {form.firmenname
                  ? form.firmenname
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "?"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                className="btn-secondary"
                style={{
                  cursor: "pointer",
                  display: "inline-block",
                  fontSize: 12,
                  padding: "6px 12px",
                  textAlign: "center",
                }}
              >
                {uploading ? "Wird hochgeladen..." : "Logo hochladen"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                  disabled={uploading}
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                  }}
                >
                  Entfernen
                </button>
              )}
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                PNG oder JPG, max. 2 MB
              </span>
            </div>
          </div>
        </div>

        <div className="app-card" style={{ maxWidth: 640, marginBottom: 20 }}>
          <div className="app-card-title">{t("profile.companyData")}</div>
          <div className="form-group">
            <label className="form-label">Firmenname *</label>
            <input
              className="field field-full"
              value={form.firmenname}
              onChange={(event) => update("firmenname", event.target.value)}
              placeholder="Musterfirma GmbH"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vorname *</label>
              <input
                className="field"
                value={form.vorname}
                onChange={(event) => update("vorname", event.target.value)}
                placeholder="Max"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nachname *</label>
              <input
                className="field"
                value={form.nachname}
                onChange={(event) => update("nachname", event.target.value)}
                placeholder="Muster"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input
              className="field field-full"
              value={form.adresse}
              onChange={(event) => update("adresse", event.target.value)}
              placeholder="Musterstrasse 12"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">PLZ</label>
              <input
                className="field"
                value={form.plz}
                onChange={(event) => update("plz", event.target.value)}
                placeholder={dachConfig.plzDigits === 5 ? "10115" : "8000"}
                maxLength={dachConfig.plzDigits === 5 ? 5 : 4}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ort</label>
              <input
                className="field"
                value={form.ort}
                onChange={(event) => update("ort", event.target.value)}
                placeholder={dachConfig.land === "DE" ? "Berlin" : dachConfig.land === "AT" ? "Wien" : "Zürich"}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input
              className="field field-full"
              value={form.telefon}
              onChange={(event) => update("telefon", event.target.value)}
              placeholder="+41 79 123 45 67"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Land / Region *</label>
            <div className="select-wrap">
              <select
                value={form.land}
                onChange={(event) => update("land", event.target.value)}
                required
              >
                {getAllLands().map((land) => (
                  <option key={land.value} value={land.value}>{land.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t("profile.language")}</label>
            <div className="select-wrap">
              <select
                value={form.sprache}
                onChange={(event) => {
                  update("sprache", event.target.value);
                  setLocale(event.target.value as Locale);
                }}
              >
                {(Object.entries(LOCALE_LABELS) as [string, string][]).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t("profile.industry")} *</label>
            <div className="select-wrap">
              <select
                value={form.beruf}
                onChange={(event) => update("beruf", event.target.value)}
                required
              >
                <option value="" disabled>
                  Dein Handwerk wählen...
                </option>
                {BERUFE.map((beruf) => (
                  <option key={beruf}>{beruf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="app-card" style={{ maxWidth: 640, marginBottom: 20 }}>
          <div className="app-card-title">{t("profile.payment")}</div>
          <div className="form-group">
            <label className="form-label">IBAN</label>
            <input
              className="field field-full"
              value={form.iban}
              onChange={(event) => update("iban", event.target.value)}
              placeholder={`${dachConfig.ibanPrefix}XX XXXX XXXX XXXX XXXX X`}
            />
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, display: "block" }}>
              {dachConfig.hasQrBill ? "Wird für die QR-Rechnung benötigt" : "Wird für SEPA-Überweisungen benötigt"}
            </span>
          </div>
          {dachConfig.sepaEnabled && (
            <div className="form-group">
              <label className="form-label">BIC / SWIFT</label>
              <input
                className="field field-full"
                value={form.bic}
                onChange={(event) => update("bic", event.target.value)}
                placeholder="XXXXXXXX"
              />
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, display: "block" }}>
                Optional, wird auf Rechnungen angezeigt
              </span>
            </div>
          )}
          {dachConfig.companyIdFields.map((field) => (
            <div className="form-group" key={field.key}>
              <label className="form-label">
                {field.label}
                {field.required && <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>}
              </label>
              <input
                className="field field-full"
                value={(form as Record<string, string>)[field.key] ?? ""}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Zahlungsfrist (Tage)</label>
            <input
              className="field"
              type="number"
              min="1"
              max="365"
              value={form.zahlungsfrist}
              onChange={(event) => update("zahlungsfrist", event.target.value)}
              placeholder="30"
              style={{ maxWidth: 120 }}
            />
          </div>

          {/* Kleinunternehmer / VAT-exempt toggle */}
          <div className="form-group" style={{ marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={kleinunternehmer}
                onChange={(e) => setKleinunternehmer(e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
              />
              <span>
                <span className="form-label" style={{ display: "block", marginBottom: 2 }}>
                  Kleinunternehmer / Von der MWST befreit
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  {form.land === "CH" && "Art. 10 MWSTG — Jahresumsatz unter CHF 100\'000"}
                  {form.land === "DE" && "§19 UStG — Keine Umsatzsteuer auf Rechnungen"}
                  {form.land === "AT" && "§6 Abs. 1 Z 27 öUStG — Jahresumsatz unter EUR 35\'000"}
                  {" "}— Rechnungen zeigen den gesetzlich vorgeschriebenen Hinweistext statt MWST.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="app-card" style={{ maxWidth: 640, marginBottom: 20 }}>
          <div className="app-card-title">PDF-Design</div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
            Wähle das Design für deine Offerten und Rechnungen.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(
              [
                { id: "classic", name: "Classic", desc: "Klar & professionell" },
                { id: "modern", name: "Modern", desc: "Dunkler Header, markant" },
                { id: "minimal", name: "Minimal", desc: "Reduziert & elegant" },
                { id: "professionell", name: "Professionell", desc: "Strukturiert & kräftig" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPdfTemplate(t.id)}
                style={{
                  padding: "13px 15px",
                  borderRadius: 13,
                  border: `2px solid ${pdfTemplate === t.id ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: pdfTemplate === t.id ? "rgba(200,121,61,0.06)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: pdfTemplate === t.id ? "var(--color-primary)" : "var(--color-text)", marginBottom: 3 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving
            ? t("nav.loading")
            : isOnboarding
              ? t("profile.saveOnboarding")
              : t("profile.save")}
        </button>
      </form>

      {!isOnboarding && (
        <div className="app-card" style={{ maxWidth: 640, marginTop: 40 }}>
          <div className="app-card-title">Daten exportieren</div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
            Lade alle deine Daten als JSON-Datei herunter (Profil, Dokumente, Kunden, Vorlagen).
            Gemäss DSGVO Art. 20 (Recht auf Datenportabilität).
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch("/api/account/export");
                if (!res.ok) {
                  setToast("Export fehlgeschlagen.");
                  setTimeout(() => setToast(""), 4000);
                  return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `offertio-export-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                setToast("Export fehlgeschlagen.");
                setTimeout(() => setToast(""), 4000);
              }
            }}
            style={{
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Daten herunterladen
          </button>
        </div>
      )}

      {!isOnboarding && (
        <div className="app-card" style={{ maxWidth: 640, marginTop: 40, borderColor: "var(--color-error-border)" }}>
          <div className="app-card-title" style={{ color: "var(--color-error)" }}>Gefahrenzone</div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
            Dein Konto und alle Daten werden unwiderruflich gelöscht.
          </p>
          <div style={{
            background: "var(--color-warning-soft)",
            border: "1px solid var(--color-warning-border)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--color-warning)",
          }}>
            <strong>Gesetzliche Aufbewahrungspflicht:</strong> Du bist verpflichtet, deine Rechnungen
            aufzubewahren — in der Schweiz 10 Jahre (Art. 958f OR), in Deutschland 10 Jahre (§147 AO),
            in Österreich 7 Jahre (§132 BAO). Lade alle Dokumente herunter, bevor du dein Konto löschst.
            Die Löschung ist unwiderruflich.
          </div>
          <button
            type="button"
            onClick={async () => {
              const confirmed = confirm(
                "Konto wirklich löschen?\n\n" +
                "⚠️ Gesetzliche Aufbewahrungspflicht: Stelle sicher, dass du alle Rechnungen heruntergeladen hast " +
                "(CH: 10 Jahre, DE: 10 Jahre, AT: 7 Jahre).\n\n" +
                "Diese Aktion kann nicht rückgängig gemacht werden."
              );
              if (!confirmed) return;

              try {
                const res = await fetch("/api/account/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ confirm: "DELETE_OFFERTIO_ACCOUNT" }),
                });

                if (!res.ok) {
                  setToast("Konto konnte nicht gelöscht werden.");
                  setTimeout(() => setToast(""), 4000);
                  return;
                }

                const supabase = createSupabaseBrowser();
                localStorage.clear();
                sessionStorage.clear();
                await supabase.auth.signOut();
                window.location.href = "/";
              } catch {
                setToast("Konto konnte nicht gelöscht werden.");
                setTimeout(() => setToast(""), 4000);
              }
            }}
            style={{
              background: "var(--color-error)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Konto löschen
          </button>
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
