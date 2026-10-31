"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { FOUNDER_SETUP_BUCKET, LOGO_MAX_BYTES, PRICE_LIST_MAX_BYTES } from "@/lib/founder-setup";

export type FounderSetupDefaults = {
  firmenname: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  iban: string;
  uidMwst: string;
};

type Props = {
  eligible: boolean;
  checkoutSuccess: boolean;
  userId: string;
  defaults: FounderSetupDefaults;
};

const EMPTY: FounderSetupDefaults = {
  firmenname: "",
  adresse: "",
  plz: "",
  ort: "",
  telefon: "",
  email: "",
  iban: "",
  uidMwst: "",
};

function fieldError(file: File | null, accept: RegExp, max: number, label: string): string | null {
  if (!file) return `${label} fehlt.`;
  if (file.size <= 0) return `${label} ist leer.`;
  if (file.size > max) return `${label} ist zu gross.`;
  if (!accept.test(file.name)) return `${label} hat einen nicht erlaubten Dateityp.`;
  return null;
}

export default function FounderSetupForm({
  eligible,
  checkoutSuccess,
  userId,
  defaults,
}: Props) {
  const [values, setValues] = useState<FounderSetupDefaults>({ ...EMPTY, ...defaults });
  const [logo, setLogo] = useState<File | null>(null);
  const [priceList, setPriceList] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ submittedAt: string; emailSent: boolean } | null>(null);

  function set<K extends keyof FounderSetupDefaults>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const logoError = fieldError(logo, /\.(png|svg|jpe?g)$/i, LOGO_MAX_BYTES, "Das Logo");
    const priceError = fieldError(
      priceList,
      /\.(xlsx|csv|pdf|jpe?g|png|webp|heic)$/i,
      PRICE_LIST_MAX_BYTES,
      "Die Preisliste",
    );
    if (logoError || priceError) {
      setError(logoError || priceError || "");
      return;
    }
    if (!logo || !priceList) return;

    setSubmitting(true);
    const submissionId = crypto.randomUUID();
    const logoExt = logo.name.toLowerCase().endsWith(".svg")
      ? "svg"
      : logo.name.toLowerCase().endsWith(".png")
        ? "png"
        : "jpg";
    const priceName = priceList.name.toLowerCase();
    const priceExt = priceName.endsWith(".xlsx")
      ? "xlsx"
      : priceName.endsWith(".csv")
        ? "csv"
        : priceName.endsWith(".pdf")
          ? "pdf"
          : priceName.endsWith(".png")
            ? "png"
            : priceName.endsWith(".webp")
              ? "webp"
              : priceName.endsWith(".heic")
                ? "heic"
                : "jpg";
    const logoPath = `${userId}/${submissionId}/logo.${logoExt}`;
    const preislistePath = `${userId}/${submissionId}/preisliste.${priceExt}`;
    const supabase = createSupabaseBrowser();

    const logoMime = logoExt === "png" ? "image/png" : logoExt === "svg" ? "image/svg+xml" : "image/jpeg";
    const priceMime =
      priceExt === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : priceExt === "csv"
          ? "text/csv"
          : priceExt === "pdf"
            ? "application/pdf"
            : priceExt === "png"
              ? "image/png"
              : priceExt === "webp"
                ? "image/webp"
                : priceExt === "heic"
                  ? "image/heic"
                  : "image/jpeg";
    const logoUpload = await supabase.storage.from(FOUNDER_SETUP_BUCKET).upload(logoPath, logo, {
      contentType: logoMime,
      upsert: false,
    });
    if (logoUpload.error) {
      setSubmitting(false);
      setError("Das Logo konnte nicht gespeichert werden.");
      return;
    }
    const priceUpload = await supabase.storage.from(FOUNDER_SETUP_BUCKET).upload(preislistePath, priceList, {
      contentType: priceMime,
      upsert: false,
    });
    if (priceUpload.error) {
      await supabase.storage.from(FOUNDER_SETUP_BUCKET).remove([logoPath]);
      setSubmitting(false);
      setError("Die Preisliste konnte nicht gespeichert werden.");
      return;
    }

    try {
      const response = await fetch("/api/founder-setup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, logoPath, preislistePath }),
      });
      const data = (await response.json()) as {
        error?: string;
        submittedAt?: string;
        emailSent?: boolean;
      };
      if (!response.ok || !data.submittedAt) {
        await supabase.storage.from(FOUNDER_SETUP_BUCKET).remove([logoPath, preislistePath]);
        setError(data.error || "Die Unterlagen konnten nicht gespeichert werden.");
        setSubmitting(false);
        return;
      }
      setResult({ submittedAt: data.submittedAt, emailSent: data.emailSent !== false });
    } catch {
      setError("Die Unterlagen konnten nicht gespeichert werden.");
    }
    setSubmitting(false);
  }

  if (!eligible) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--app-text)" }}>
          Einrichtung
        </h1>
        <p className="mt-4 text-sm leading-6" role="status" style={{ color: "var(--app-text-muted)" }}>
          {checkoutSuccess
            ? "Zahlung eingegangen. Sobald Ihr Gründerplatz freigeschaltet ist, können Sie Logo, Firmendaten und Preisliste hier schicken."
            : "Dieses Formular ist für Gründer nach dem Kauf. Sobald der Gründerplatz aktiv ist, können Sie die Unterlagen hier schicken."}
        </p>
        {checkoutSuccess ? (
          <button type="button" className="auth-submit mt-6" onClick={() => window.location.reload()}>
            Erneut prüfen
          </button>
        ) : (
          <a href="/gruenderplatz" className="cta-primary mt-6 inline-flex min-h-12">
            Gründerplatz sichern, CHF 249
          </a>
        )}
      </div>
    );
  }

  if (result) {
    const when = new Intl.DateTimeFormat("de-CH", {
      timeZone: "Europe/Zurich",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(result.submittedAt));
    return (
      <div className="mx-auto w-full max-w-xl" role="status">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--app-text)" }}>
          Unterlagen eingegangen
        </h1>
        <p className="mt-4 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
          Eingegangen am {when} (Europe/Zurich). Ab diesem Zeitpunkt läuft die 48-Stunden-Garantie.
        </p>
        {!result.emailSent && (
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--app-text)" }}>
            Die Benachrichtigung konnte nicht gesendet werden. Ihre Unterlagen sind trotzdem gespeichert.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto w-full max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--app-text)" }}>
          Logo, Firmendaten und Preisliste
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--app-text-muted)" }}>
          Wir richten Ihre Vorlagen und Artikel ein. Der Eingang wird mit Zeitpunkt gespeichert.
        </p>
      </div>

      <label className="block">
        <span className="form-label">Firmenname</span>
        <input className="input-field" required value={values.firmenname} onChange={(event) => set("firmenname", event.target.value)} autoComplete="organization" />
      </label>
      <label className="block">
        <span className="form-label">Adresse</span>
        <input className="input-field" required value={values.adresse} onChange={(event) => set("adresse", event.target.value)} autoComplete="street-address" />
      </label>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <label className="block">
          <span className="form-label">PLZ</span>
          <input className="input-field" required inputMode="numeric" pattern="[0-9]{4}" value={values.plz} onChange={(event) => set("plz", event.target.value)} autoComplete="postal-code" />
        </label>
        <label className="block">
          <span className="form-label">Ort</span>
          <input className="input-field" required value={values.ort} onChange={(event) => set("ort", event.target.value)} autoComplete="address-level2" />
        </label>
      </div>
      <label className="block">
        <span className="form-label">Telefon</span>
        <input className="input-field" value={values.telefon} onChange={(event) => set("telefon", event.target.value)} autoComplete="tel" />
      </label>
      <label className="block">
        <span className="form-label">E-Mail</span>
        <input className="input-field" required type="email" value={values.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" />
      </label>
      <label className="block">
        <span className="form-label">IBAN</span>
        <input className="input-field" value={values.iban} onChange={(event) => set("iban", event.target.value)} autoComplete="off" spellCheck={false} />
      </label>
      <label className="block">
        <span className="form-label">UID / MwSt</span>
        <input className="input-field" value={values.uidMwst} onChange={(event) => set("uidMwst", event.target.value)} />
      </label>
      <label className="block">
        <span className="form-label">Logo, PNG, SVG oder JPG</span>
        <input
          className="input-field"
          required
          type="file"
          accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
          onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
        />
      </label>
      <label className="block">
        <span className="form-label">Preisliste, Excel, CSV, PDF oder Foto</span>
        <input
          className="input-field"
          required
          type="file"
          accept=".xlsx,.csv,.pdf,.jpg,.jpeg,.png,.webp,.heic,image/*,application/pdf,text/csv"
          onChange={(event) => setPriceList(event.target.files?.[0] ?? null)}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm leading-6" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      <button type="submit" className="auth-submit min-h-12 w-full" disabled={submitting}>
        {submitting ? "Wird gespeichert…" : "Unterlagen schicken"}
      </button>
    </form>
  );
}
