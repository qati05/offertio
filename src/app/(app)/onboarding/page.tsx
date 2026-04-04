"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OffertioLogo from "@/components/OffertioLogo";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getAllLands, getDachConfig } from "@/lib/dach";
import { useT, LOCALE_LABELS } from "@/lib/i18n";
import { DEFAULT_VORLAGEN } from "@/lib/vorlagen-defaults";
import type { Locale } from "@/lib/i18n";
import { trackOnboardingComplete } from "@/lib/analytics";
import type { Land } from "@/lib/types";

const BERUFE = [
  "Freelancer / Berater",
  "IT / Software / Web",
  "Design / Kreativ",
  "Marketing / Kommunikation",
  "Buchhaltung / Finanzen",
  "Coaching / Training",
  "Gesundheit / Wellness",
  "Handwerk / Bau",
  "Gastronomie / Events",
  "Immobilien / Verwaltung",
  "Transport / Logistik",
  "Anderes",
];

const TOTAL_STEPS = 4;
const LAST_STEP = TOTAL_STEPS - 1;

export default function OnboardingPage() {
  const router = useRouter();
  const { t, setLocale } = useT();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState({
    sprache: "de" as Locale,
    land: "" as Land,
    firmenname: "",
    beruf: "",
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
    zahlungsfrist: "30",
  });

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectLand(land: Land) {
    setForm((current) => ({ ...current, land }));
  }

  const dachConfig = getDachConfig(form.land);

  async function handleFinish() {
    setSaving(true);
    setSaveError("");

    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveError("Sitzung abgelaufen. Bitte neu anmelden.");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || "",
        ...form,
        zahlungsfrist: parseInt(form.zahlungsfrist, 10) || 30,
        plan: "free",
        onboarding_complete: true,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      setSaveError(`Profil konnte nicht gespeichert werden: ${upsertError.message}`);
      setSaving(false);
      return;
    }

    if (form.beruf) {
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

    trackOnboardingComplete(form.land, form.beruf);
    setSaving(false);
    router.push("/dashboard");
  }

  function canProceed(): boolean {
    if (step === 0) return !!form.land;
    if (step === 1) return !!form.firmenname && !!form.beruf && !!form.vorname;
    return true;
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const countryFeatures = [
    form.land ? (dachConfig.hasQrBill ? "QR-Rechnung" : "SEPA") : "DACH-ready",
    form.land ? dachConfig.mwstLabel : "Steuerlogik",
    form.land ? (dachConfig.zugferdCompatible ? "ZUGFeRD" : "Professionelles PDF") : "Dokument-Standards",
  ];

  return (
    <div className="onboarding-shell animate-flow">
      <div className="onboarding-container">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <OffertioLogo size={32} href={undefined} />
          <div className="onboarding-step-label">
            Schritt {step + 1} von {TOTAL_STEPS}
          </div>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        <div className="onboarding-card">
          {step === 0 && (
            <div>
              <div className="app-kicker">Standort</div>
              <h1 className="onboarding-title">Wo ist dein Betrieb?</h1>
              <p className="onboarding-desc">
                Offertio passt Währung, Steuerlogik und Zahlungsstandards an dein Land an.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {getAllLands().map((land) => {
                  const config = getDachConfig(land.value);
                  const selected = form.land === land.value;
                  const chips = [
                    config.currency,
                    config.hasQrBill ? "QR" : "SEPA",
                    config.zugferdCompatible ? "ZUGFeRD" : config.mwstLabel,
                  ];
                  return (
                    <button
                      key={land.value}
                      type="button"
                      onClick={() => selectLand(land.value)}
                      className="onboarding-country-card"
                      style={{
                        borderColor: selected ? "rgba(200,121,61,0.35)" : "var(--app-border)",
                        background: selected ? "var(--color-primary-soft)" : "var(--app-card)",
                        boxShadow: selected ? "0 2px 12px rgba(200,121,61,0.08)" : "none",
                      }}
                    >
                      <div className="text-sm font-semibold" style={{ color: "var(--app-text)" }}>{land.label}</div>
                      <div className="mt-2 text-xs leading-6" style={{ color: "var(--app-text-muted)" }}>
                        {config.name} · {config.currency}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                            style={{
                              background: selected ? "rgba(255,255,255,0.7)" : "rgba(26,28,27,0.04)",
                              color: "var(--color-primary-strong)",
                            }}
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="onboarding-language-box">
                <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--app-text-soft)" }}>
                  Sprache
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.entries(LOCALE_LABELS) as [string, string][]).map(([key, value]) => {
                    const active = form.sprache === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const locale = key as Locale;
                          update("sprache", locale);
                          setLocale(locale);
                        }}
                        className="rounded-full border px-4 py-2 text-sm font-medium transition"
                        style={{
                          borderColor: active ? "rgba(200,121,61,0.3)" : "var(--app-border)",
                          background: active ? "var(--color-primary-soft)" : "var(--app-card)",
                          color: active ? "var(--color-primary-strong)" : "var(--app-text-muted)",
                        }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="app-kicker">Betrieb</div>
              <h1 className="onboarding-title">Dein Betrieb</h1>
              <p className="onboarding-desc">
                Wenige Angaben reichen, damit Offertio Vorlagen und dein erstes Dokument richtig vorbereitet.
              </p>

              <div className="mt-8 space-y-4">
                <div className="form-group">
                  <label className="form-label">{t("profile.companyName")} *</label>
                  <input className="auth-input" value={form.firmenname} onChange={(event) => update("firmenname", event.target.value)} placeholder="Musterfirma GmbH" autoFocus />
                </div>

                <div className="form-group">
                  <label className="form-label">{t("profile.industry")} *</label>
                  <div className="select-wrap">
                    <select value={form.beruf} onChange={(event) => update("beruf", event.target.value)}>
                      <option value="" disabled>{t("profile.industryPlaceholder")}</option>
                      {BERUFE.map((beruf) => (
                        <option key={beruf}>{beruf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">{t("profile.firstName")} *</label>
                    <input className="auth-input" value={form.vorname} onChange={(event) => update("vorname", event.target.value)} placeholder="Max" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("profile.lastName")}</label>
                    <input className="auth-input" value={form.nachname} onChange={(event) => update("nachname", event.target.value)} placeholder="Muster" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="app-kicker">Details</div>
              <h1 className="onboarding-title">Damit dein erstes Dokument stimmt</h1>
              <p className="onboarding-desc">
                Diese Angaben machen Offerten und Rechnungen professioneller. Du kannst alles später jederzeit ändern.
              </p>

              <div className="mt-8 space-y-4">
                <div className="form-group">
                  <label className="form-label">{t("profile.address")}</label>
                  <input className="auth-input" value={form.adresse} onChange={(event) => update("adresse", event.target.value)} placeholder="Bahnhofstrasse 12" autoFocus />
                </div>

                <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                  <div className="form-group">
                    <label className="form-label">{t("profile.zip")}</label>
                    <input className="auth-input" value={form.plz} onChange={(event) => update("plz", event.target.value)} placeholder={dachConfig.plzDigits === 4 ? "8000" : "10115"} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("profile.city")}</label>
                    <input className="auth-input" value={form.ort} onChange={(event) => update("ort", event.target.value)} placeholder={form.land === "DE" ? "Berlin" : form.land === "AT" ? "Wien" : "Zürich"} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">{t("profile.phone")}</label>
                    <input className="auth-input" value={form.telefon} onChange={(event) => update("telefon", event.target.value)} placeholder="+41 79 123 45 67" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IBAN</label>
                    <input className="auth-input" value={form.iban} onChange={(event) => update("iban", event.target.value)} placeholder={`${dachConfig.ibanPrefix}..`} />
                  </div>
                </div>

                {dachConfig.companyIdFields.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {dachConfig.companyIdFields.map((field) => (
                      <div className="form-group" key={field.key}>
                        <label className="form-label">
                          {field.label}{field.required ? " *" : ""}
                        </label>
                        <input
                          className="auth-input"
                          value={String(form[field.key] || "")}
                          onChange={(event) => update(field.key, event.target.value)}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Zahlungsfrist</label>
                  <div className="select-wrap">
                    <select value={form.zahlungsfrist} onChange={(event) => update("zahlungsfrist", event.target.value)}>
                      <option value="14">14 Tage</option>
                      <option value="30">30 Tage</option>
                      <option value="45">45 Tage</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === LAST_STEP && (
            <div>
              <div className="app-kicker">Fertig</div>
              <div className="mt-6 flex justify-center">
                <OffertioLogo variant="icon" size={52} href={undefined} />
              </div>
              <h1 className="onboarding-title mt-6 text-center">
                Alles bereit, {form.vorname || "los geht's"}.
              </h1>
              <p className="onboarding-desc mx-auto text-center">
                Offertio ist jetzt auf {dachConfig.name || "dein Land"} eingerichtet und kann deine Dokumente, Steuersätze und Zahlungsdetails entsprechend vorbereiten.
              </p>

              <div className="onboarding-summary">
                <div className="text-base font-semibold" style={{ color: "var(--app-text)" }}>
                  {form.firmenname || "Dein Betrieb"}
                </div>
                <div className="mt-2 text-sm" style={{ color: "var(--app-text-muted)" }}>
                  {form.vorname} {form.nachname}{form.beruf ? ` · ${form.beruf}` : ""}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {countryFeatures.map((item) => (
                    <span
                      key={item}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                      style={{ background: "var(--color-primary-soft)", color: "var(--color-primary-strong)" }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--app-text-soft)" }}>Adresse</div>
                    <div className="mt-1" style={{ color: "var(--app-text-muted)" }}>
                      {form.adresse ? `${form.adresse}, ${form.plz} ${form.ort}` : "Ergänzbar in den Einstellungen"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--app-text-soft)" }}>Zahlung</div>
                    <div className="mt-1" style={{ color: "var(--app-text-muted)" }}>
                      {form.iban ? `${form.iban.slice(0, 6)}…` : "IBAN später ergänzen"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="onboarding-nav">
            {step > 0 && (
              <button
                className="onboarding-btn-back"
                onClick={() => setStep((current) => current - 1)}
              >
                Zurück
              </button>
            )}
            {step < LAST_STEP && (
              <button
                className="onboarding-btn-next"
                onClick={() => setStep((current) => current + 1)}
                disabled={!canProceed()}
              >
                Weiter
              </button>
            )}
            {step === LAST_STEP && (
              <button
                className="onboarding-btn-next"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "Wird gespeichert..." : "Erstes Dokument vorbereiten"}
              </button>
            )}
          </div>

          {saveError && (
            <div className="auth-alert auth-alert-error mt-4 text-center">
              {saveError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
