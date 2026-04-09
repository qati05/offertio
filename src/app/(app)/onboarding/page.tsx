"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

const TOTAL_STEPS = 2;
const LAST_STEP = TOTAL_STEPS - 1;
const ease = [0.16, 1, 0.3, 1] as const;

const stepVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0, filter: "blur(2px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0, filter: "blur(2px)" }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const { t, setLocale } = useT();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

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

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
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
      setSaveError("Sitzung abgelaufen. Bitte melde dich erneut an.");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || "",
        sprache: form.sprache,
        land: form.land,
        firmenname: form.firmenname,
        beruf: form.beruf,
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
        zahlungsfrist: parseInt(form.zahlungsfrist, 10) || 30,
        plan: "free",
        onboarding_complete: true,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      setSaveError("Da ist etwas schiefgegangen. Bitte versuche es noch einmal.");
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
    router.push("/dokument/neu");
  }

  function canProceed(): boolean {
    if (step === 0) return !!form.land && !!form.firmenname && !!form.beruf && !!form.vorname;
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="mb-8 flex items-center justify-between gap-4"
        >
          <OffertioLogo size={32} href={undefined} />
          <div className="onboarding-step-label">
            {step + 1} / {TOTAL_STEPS}
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="onboarding-progress">
          <motion.div
            className="onboarding-progress-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease }}
          />
        </div>

        {/* Card with animated step transitions */}
        <div className="onboarding-card" style={{ overflow: "hidden" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease }}
            >
              {/* ── Step 1: Land + Firma (merged) ──────────── */}
              {step === 0 && (
                <div>
                  <div className="app-kicker">Einrichtung</div>
                  <h1 className="onboarding-title">Dein Betrieb in 60 Sekunden.</h1>
                  <p className="onboarding-desc">
                    Land wählen, Firma benennen — los geht's.
                  </p>

                  {/* Country selection */}
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {getAllLands().map((land, i) => {
                      const config = getDachConfig(land.value);
                      const selected = form.land === land.value;
                      const chips = [
                        config.currency,
                        config.hasQrBill ? "QR" : "SEPA",
                        config.zugferdCompatible ? "ZUGFeRD" : config.mwstLabel,
                      ];
                      return (
                        <motion.button
                          key={land.value}
                          type="button"
                          onClick={() => selectLand(land.value)}
                          className="onboarding-country-card"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 + i * 0.06, ease }}
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
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Company basics — right below country */}
                  {form.land && (
                    <motion.div
                      className="mt-8 space-y-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease }}
                    >
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
                    </motion.div>
                  )}

                  {/* Language selector */}
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

              {/* ── Step 2: Summary + optional details ────── */}
              {step === LAST_STEP && (
                <div>
                  <div className="app-kicker">Bereit.</div>
                  <motion.div
                    className="mt-6 flex justify-center"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <OffertioLogo variant="icon" size={52} href={undefined} />
                  </motion.div>
                  <h1 className="onboarding-title mt-6 text-center">
                    Du bist startklar, {form.vorname || "los geht's"}.
                  </h1>
                  <p className="onboarding-desc mx-auto text-center">
                    Offertio ist auf {dachConfig.name || "dein Land"} eingerichtet — Dokumente, Steuersätze und Zahlungsdetails sind vorbereitet.
                  </p>

                  <motion.div
                    className="onboarding-summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease }}
                  >
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
                  </motion.div>

                  {/* Optional details — expandable */}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition"
                      style={{
                        borderColor: "var(--app-border)",
                        background: showDetails ? "var(--app-card)" : "transparent",
                        color: "var(--app-text-muted)",
                      }}
                    >
                      <span>Details jetzt ergänzen</span>
                      <span style={{ fontSize: 13, color: "var(--app-text-soft)" }}>
                        {showDetails ? "−" : "+"}
                      </span>
                    </button>

                    {showDetails && (
                      <motion.div
                        className="mt-4 space-y-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.25, ease }}
                      >
                        <div className="form-group">
                          <label className="form-label">{t("profile.address")}</label>
                          <input className="auth-input" value={form.adresse} onChange={(event) => update("adresse", event.target.value)} placeholder="Bahnhofstrasse 12" />
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
                      </motion.div>
                    )}

                    <p className="mt-3 text-center text-xs" style={{ color: "var(--app-text-soft)" }}>
                      Alles jederzeit in den Einstellungen anpassbar.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="onboarding-nav">
                {step > 0 && (
                  <button className="onboarding-btn-back" onClick={goBack}>
                    Zurück
                  </button>
                )}
                {step < LAST_STEP && (
                  <button
                    className="onboarding-btn-next"
                    onClick={goNext}
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
                    {saving ? "Einen Moment…" : "Erstes Dokument erstellen"}
                  </button>
                )}
              </div>

              {saveError && (
                <div className="auth-alert auth-alert-error mt-4 text-center">
                  {saveError}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
