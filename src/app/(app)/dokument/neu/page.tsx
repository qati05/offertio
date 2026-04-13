"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { peekNextNummer, commitNummer } from "@/lib/dokument-nummer";
import { useOnlineStatus } from "@/components/OfflineBanner";
import { findReusableCustomer, getCustomerDisplayName, mergeCustomerIntoDraft } from "@/lib/customers";
import { getDachConfig } from "@/lib/dach";
import { isPro } from "@/lib/payment";
import UpgradeScreen from "@/components/UpgradeScreen";
import { trackDocumentCreated } from "@/lib/analytics";
import { getMissingProfileFieldsForDocument } from "@/lib/profile";
import { validateForRegion } from "@/lib/validation";
import type { Profile, Vorlage, Position, KundenInfo, RabattInfo, DokumentTyp, CustomerRecord } from "@/lib/types";

export default function DokumentNeuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();

  const initialTyp = (searchParams.get("typ") === "rechnung" ? "rechnung" : "offerte") as DokumentTyp;
  const [dokumentTyp, setDokumentTyp] = useState<DokumentTyp>(initialTyp);
  const [profil, setProfil] = useState<Profile | null>(null);
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [loading, setLoading] = useState(true);
  // Server-side document limit — null = not yet loaded (optimistic: allow until confirmed)
  const [serverAllowed, setServerAllowed] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>([]);
  const [customerReuseHint, setCustomerReuseHint] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerDropdownIdx, setCustomerDropdownIdx] = useState(-1);
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const [sourceDocumentId, setSourceDocumentId] = useState<string | null>(null);
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState<string | null>(null);
  // Cloud draft ID: set when we've already saved this draft to Supabase as "entwurf"
  const [cloudDraftId, setCloudDraftId] = useState<string | null>(null);

  const [nummer, setNummer] = useState("");
  const [datum, setDatum] = useState("");
  const [gueltigBis, setGueltigBis] = useState("");
  const [leistungsdatum, setLeistungsdatum] = useState("");
  const [objekt, setObjekt] = useState("");
  const [mwstSatz, setMwstSatz] = useState(0);
  const [preisMode, setPreisMode] = useState<"exkl" | "inkl">("exkl");
  const [notiz, setNotiz] = useState("");
  const [selectedVorlage, setSelectedVorlage] = useState<string | null>(null);

  // Send options
  const [downloadPdf, setDownloadPdf] = useState(false);
  const [sharePdf, setSharePdf] = useState(true);
  const [whatsappPdf, setWhatsappPdf] = useState(false);
  const [emailPdf, setEmailPdf] = useState(false);
  const [eRechnungLoading, setERechnungLoading] = useState(false);

  // UI state
  const [freePlanRemaining, setFreePlanRemaining] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);

  // Rabatt
  const [rabatt, setRabatt] = useState<RabattInfo>({
    aktiv: false,
    label: "Rabatt",
    modus: "chf",
    wert: 0,
  });

  const [kunde, setKunde] = useState<KundenInfo>({
    name: "",
    firma: "",
    adresse: "",
    adresse2: "",
    plz: "",
    ort: "",
    email: "",
  });

  const [positionen, setPositionen] = useState<Position[]>([
    { bezeichnung: "", einheit: "Std.", menge: 1, preis: 0 },
  ]);
  const appliedReuseKeyRef = useRef<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const leistungsdatumInputRef = useRef<HTMLInputElement | null>(null);
  const profileRequirementsRef = useRef<HTMLDivElement | null>(null);
  /** Tracks whether user has interacted with leistungsdatum (enables live error) */
  const [touchedLeistungsdatum, setTouchedLeistungsdatum] = useState(false);

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  // DACH config based on profile
  const dachConfig = getDachConfig(profil?.land);
  const currency = dachConfig.currency;

  // Labels based on document type
  const typLabel = dokumentTyp === "offerte" ? "Offerte" : "Rechnung";
  const dateEndLabel = dokumentTyp === "offerte" ? "Gültig bis" : "Zahlbar bis";
  const activeCount = [downloadPdf, sharePdf, whatsappPdf, emailPdf].filter(Boolean).length;
  const sendBtnLabel =
    activeCount > 1
      ? `${typLabel} speichern & senden`
      : downloadPdf
        ? `${typLabel} herunterladen`
        : sharePdf
          ? `${typLabel} teilen`
          : whatsappPdf
            ? `${typLabel} per WhatsApp senden`
            : emailPdf
              ? `${typLabel} per E-Mail senden`
              : `${typLabel} weitergeben`;
  const missingProfileFields = getMissingProfileFieldsForDocument(profil, dokumentTyp, profil?.land);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDatum(today);
    setGueltigBis(addDays(today, 30));
    setNummer(peekNextNummer(initialTyp));

    // Restore draft if available
    try {
      const draft = localStorage.getItem("dokument-draft");
      if (draft) {
        const d = JSON.parse(draft);
        let hadContent = false;
        if (d.dokumentTyp) {
          setDokumentTyp(d.dokumentTyp);
          setNummer(peekNextNummer(d.dokumentTyp));
        }
        if (d.kunde) { setKunde(d.kunde); hadContent = !!(d.kunde.name || d.kunde.firma || d.kunde.email); }
        if (d.positionen?.length) { setPositionen(d.positionen); hadContent = true; }
        if (d.mwstSatz !== undefined) setMwstSatz(d.mwstSatz);
        if (d.notiz) { setNotiz(d.notiz); hadContent = true; }
        if (d.objekt) { setObjekt(d.objekt); hadContent = true; }
        if (d.rabatt) setRabatt(d.rabatt);
        if (d.preisMode) setPreisMode(d.preisMode);
        if (d.leistungsdatum) setLeistungsdatum(d.leistungsdatum);
        if (d.sourceDocumentId) setSourceDocumentId(d.sourceDocumentId);
        if (d.sourceDocumentNumber) { setSourceDocumentNumber(d.sourceDocumentNumber); hadContent = true; }
        if (d.cloudDraftId) setCloudDraftId(d.cloudDraftId);
        if (hadContent) {
          setDraftRestored(true);
          if (d._savedAt) {
            const saved = new Date(d._savedAt);
            const now = new Date();
            const diffMin = Math.round((now.getTime() - saved.getTime()) / 60000);
            if (diffMin < 1) setDraftRestoredAt("gerade eben");
            else if (diffMin < 60) setDraftRestoredAt(`vor ${diffMin} Minute${diffMin === 1 ? "" : "n"}`);
            else if (diffMin < 1440) setDraftRestoredAt(`vor ${Math.round(diffMin / 60)} Stunde${Math.round(diffMin / 60) === 1 ? "" : "n"}`);
            else setDraftRestoredAt(saved.toLocaleDateString("de-CH", { day: "numeric", month: "short" }));
          }
        }
      }
    } catch { /* ignore corrupt draft */ }

    loadData();
  }, []);

  // Update nummer when type changes
  function handleTypChange(typ: DokumentTyp) {
    setDokumentTyp(typ);
    setNummer(peekNextNummer(typ));
  }

  async function loadData() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      window.location.href = "/login";
      return;
    }

    const [profilRes, vorlagenRes, customersRes, limitRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("vorlagen").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("customers").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(200),
      fetch("/api/dokument/check-limit"),
    ]);

    if (profilRes.data) {
      const p = profilRes.data as Profile;
      setProfil(p);
      const frist = p.zahlungsfrist || 30;
      const today = new Date().toISOString().split("T")[0];
      setGueltigBis(addDays(today, frist));
      // Set default MWST based on country (only if not restored from draft)
      const cfg = getDachConfig(p.land);
      setMwstSatz((prev) => prev === 0 ? cfg.defaultMwst : prev);
    }
    if (vorlagenRes.data) setVorlagen(vorlagenRes.data as Vorlage[]);
    if (customersRes.data) setCustomerRecords(customersRes.data as CustomerRecord[]);

    // Guard: warn if source offerte was already converted to a Rechnung
    if (sourceDocumentId) {
      const { data: sourceDoc } = await supabase
        .from("dokumente")
        .select("converted_document_id, converted_document_nummer")
        .eq("id", sourceDocumentId)
        .maybeSingle();
      if (sourceDoc?.converted_document_id && sourceDoc.converted_document_id !== cloudDraftId) {
        showToast(`Hinweis: Zu dieser Offerte existiert bereits Rechnung ${sourceDoc.converted_document_nummer || ""}.`);
      }
    }

    // Server is the source of truth for the document limit
    if (limitRes.ok) {
      const limitData = await limitRes.json();
      setServerAllowed(limitData.allowed !== false);
      if (limitData.remaining !== undefined && !isPro(limitData.plan)) {
        setFreePlanRemaining(limitData.remaining);
      }
    } else {
      // On error, fall back to allowing creation (fail open for UX, server re-checks on send)
      setServerAllowed(true);
    }

    setLoading(false);
  }

  // Ref to access latest kunde inside the effect without triggering re-runs.
  const kundeRef = useRef(kunde);
  kundeRef.current = kunde;

  // Derive a stable key from identifying fields only — prevents re-fire when
  // mergeCustomerIntoDraft updates non-identifying fields (adresse, plz, etc.).
  const kundeIdentityKey = `${kunde.name}|${kunde.firma}|${kunde.email}`;

  useEffect(() => {
    const currentKunde = kundeRef.current;
    const reusableCustomer = findReusableCustomer(customerRecords, currentKunde);
    if (!reusableCustomer) {
      if (!currentKunde.email?.trim() && !currentKunde.name?.trim() && !currentKunde.firma?.trim()) {
        appliedReuseKeyRef.current = null;
        setCustomerReuseHint("");
      }
      return;
    }

    if (appliedReuseKeyRef.current === reusableCustomer.lookup_key) {
      return;
    }

    const { next, reusedFields } = mergeCustomerIntoDraft(currentKunde, reusableCustomer);
    appliedReuseKeyRef.current = reusableCustomer.lookup_key;
    setKunde(next);
    setCustomerReuseHint(
      reusedFields.length > 0
        ? `Gespeicherte Kundendaten für ${getCustomerDisplayName(reusableCustomer)} übernommen.`
        : `Kundendaten für ${getCustomerDisplayName(reusableCustomer)} erkannt.`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerRecords, kundeIdentityKey]);

  function updateKunde(key: keyof KundenInfo, value: string) {
    if (key === "email" && fieldErrors.kundeEmail) {
      setFieldErrors((current) => ({ ...current, kundeEmail: false }));
    }
    if (customerReuseHint) {
      setCustomerReuseHint("");
    }
    if (key === "name" || key === "firma" || key === "email") {
      appliedReuseKeyRef.current = null;
    }
    setKunde((k) => ({ ...k, [key]: value }));
  }

  // ── Customer Autocomplete ──────────────────────────────
  const customerQuery = (kunde.name || kunde.firma || "").toLowerCase().trim();
  const filteredCustomers = useMemo(() => {
    if (!customerQuery || customerQuery.length < 2) return [];
    return customerRecords
      .filter((c) => c.display_name.toLowerCase().includes(customerQuery))
      .slice(0, 6);
  }, [customerRecords, customerQuery]);

  function selectCustomer(record: CustomerRecord) {
    const { next, reusedFields } = mergeCustomerIntoDraft(
      { ...kunde, name: record.display_name },
      record,
    );
    // Set name explicitly since mergeCustomerIntoDraft only fills empty fields
    next.name = record.display_name;
    appliedReuseKeyRef.current = record.lookup_key;
    setKunde(next);
    setShowCustomerDropdown(false);
    setCustomerDropdownIdx(-1);
    setCustomerReuseHint(
      reusedFields.length > 0
        ? `Kundendaten für ${record.display_name} übernommen.`
        : `${record.display_name} ausgewählt.`,
    );
  }

  function updateProfilField(key: keyof Profile, value: string) {
    setProfil((current) => {
      if (!current) return current;
      return { ...current, [key]: value };
    });
  }

  function updatePos(idx: number, key: keyof Position, value: string | number) {
    setPositionen((p) =>
      p.map((pos, i) => (i === idx ? { ...pos, [key]: value } : pos))
    );
  }

  function addPosition() {
    setPositionen((p) => [
      ...p,
      { bezeichnung: "", einheit: "Std.", menge: 1, preis: 0 },
    ]);
  }

  function removePosition(idx: number) {
    setPositionen((p) => p.filter((_, i) => i !== idx));
  }

  function applyVorlage(vorlage: Vorlage) {
    setPositionen(vorlage.positionen.map((p) => ({ ...p })));
    setSelectedVorlage(vorlage.id);
    showToast(`Vorlage "${vorlage.name}" geladen.`);
  }

  // Calculations — all intermediate values rounded to 2 decimals to prevent
  // floating-point drift in VAT calculations (e.g. CHF 7.7% precision).
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const grossSubtotal = r2(positionen.reduce((sum, p) => sum + p.menge * p.preis, 0));
  const rabattBetrag = r2(
    rabatt.aktiv
      ? rabatt.modus === "chf"
        ? rabatt.wert
        : grossSubtotal * (rabatt.wert / 100)
      : 0,
  );
  const grossNachRabatt = r2(grossSubtotal - rabattBetrag);

  // exkl. mode: prices are net, VAT added on top
  // inkl. mode: prices already include VAT, VAT is extracted
  const subtotal = preisMode === "exkl"
    ? grossSubtotal
    : r2(grossSubtotal / (1 + mwstSatz / 100));
  const nettoNachRabatt = preisMode === "exkl"
    ? grossNachRabatt
    : r2(grossNachRabatt / (1 + mwstSatz / 100));
  const mwstBetrag = preisMode === "exkl"
    ? r2(nettoNachRabatt * (mwstSatz / 100))
    : r2(grossNachRabatt - nettoNachRabatt);
  const total = preisMode === "exkl"
    ? r2(nettoNachRabatt + mwstBetrag)
    : grossNachRabatt;

  function fmtAmt(n: number) {
    return n.toLocaleString("de-CH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const cur = currency; // shorthand

  function formatDate(d: string): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const datumFormatiert = formatDate(datum);
  const gueltigBisFormatiert = formatDate(gueltigBis);
  const supportedPdfLogoTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

  const generatePdfBlob = useCallback(async () => {
    if (!profil) throw new Error("Profil nicht geladen");

    // Only load qr-bill module for CH users — DE/AT never need Swiss QR-bill
    const isCH = profil.land === "CH";
    const [{ pdf }, { default: OffertePDF }, qrModule] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/OffertePDF"),
      isCH ? import("@/lib/qr-bill") : Promise.resolve(null),
    ]);

    // QR code only for CH Rechnungen
    let qrCodeDataUrl: string | null = null;
    let qrReference: string | null = null;
    if (dokumentTyp === "rechnung" && isCH && qrModule) {
      // generateQrBillData supports both regular CH-IBANs (message/NON) and
      // QR-IBANs (auto-generated QRR).  It throws IbanValidationError when
      // the stored IBAN fails the MOD-97 checksum — surface that to the user.
      try {
        const qrResult = await qrModule.generateQrBillData(profil, total, nummer);
        if (qrResult) {
          qrCodeDataUrl = qrResult.dataUrl;
          qrReference = qrResult.qrReference;
        }
      } catch (err) {
        if (err instanceof Error && err.name === "IbanValidationError") {
          showToast("Ungültige IBAN — QR-Zahlschein konnte nicht erstellt werden. Bitte IBAN im Profil prüfen.");
        }
        // qrCodeDataUrl stays null → PDF is generated without QR section
      }
    }

    // Fetch logo as data URL if available
    let logoDataUrl: string | null = null;
    if (profil.logo_url) {
      try {
        const res = await fetch(profil.logo_url);
        const blob = await res.blob();
        if (!supportedPdfLogoTypes.has(blob.type)) {
          throw new Error(`Logoformat für PDF nicht unterstützt: ${blob.type || "unbekannt"}`);
        }
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        // Logo load failed — continue PDF generation without it
      }
    }

    const blob = await pdf(
      OffertePDF({
        profil,
        kunde,
        positionen,
        nummer,
        datum,
        gueltigBis,
        leistungsdatum: leistungsdatum || undefined,
        objekt,
        mwstSatz,
        notiz,
        rabatt,
        qrCodeDataUrl,
        qrReference,
        logoDataUrl,
        dokumentTyp,
        currency,
        preisMode,
        template: profil.pdf_template ?? "classic",
      })
    ).toBlob();
    return blob;
  }, [profil, kunde, positionen, nummer, datum, gueltigBis, leistungsdatum, objekt, mwstSatz, notiz, rabatt, total, dokumentTyp, currency, preisMode]);

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function trySharePdf(blob: Blob, fileName: string) {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false;
    }

    try {
      const file = new File([blob], fileName, { type: "application/pdf" });
      if ("canShare" in navigator && !navigator.canShare?.({ files: [file] })) {
        return false;
      }
      await navigator.share({ files: [file], title: fileName });
      return true;
    } catch {
      return false;
    }
  }

  function focusField(key: "kundeEmail" | "leistungsdatum" | "profileRequirements") {
    const target =
      key === "kundeEmail"
        ? emailInputRef.current
        : key === "leistungsdatum"
          ? leistungsdatumInputRef.current
          : profileRequirementsRef.current;
    if (!target) return;
    // Smooth scroll with visual offset so field isn't cramped at viewport edge
    const yOffset = -120;
    const y = target.getBoundingClientRect().top + window.scrollY + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
    // Focus the element after scroll animation completes
    setTimeout(() => {
      if ("focus" in target && typeof (target as HTMLElement).focus === "function") {
        (target as HTMLElement).focus();
      }
    }, 400);
  }

  async function persistProfileIfNeeded() {
    if (!profil) return;

    const supabase = createSupabaseBrowser();
    // Whitelist: never write privileged server-only columns (plan, ls_*, plan_expires_at).
    // Those are set exclusively by the webhook handler.
    const { error } = await supabase.from("profiles").upsert(
      {
        id: profil.id,
        email: profil.email,
        firmenname: profil.firmenname,
        vorname: profil.vorname,
        nachname: profil.nachname,
        adresse: profil.adresse,
        plz: profil.plz,
        ort: profil.ort,
        telefon: profil.telefon,
        iban: profil.iban,
        bic: profil.bic,
        uid_mwst: profil.uid_mwst,
        steuernummer: profil.steuernummer,
        fn_nr: profil.fn_nr,
        logo_url: profil.logo_url,
        land: profil.land,
        sprache: profil.sprache,
        beruf: profil.beruf,
        zahlungsfrist: profil.zahlungsfrist,
        onboarding_complete: profil.onboarding_complete ?? true,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleSend() {
    // H7: Leistungsdatum required for DE/AT invoices (§14 UStG / §11 öUStG)
    if (dokumentTyp === "rechnung" && dachConfig.leistungsdatumRequired && !leistungsdatum) {
      setFieldErrors((current) => ({ ...current, leistungsdatum: true }));
      setTouchedLeistungsdatum(true);
      showToast("Leistungsdatum ist für Rechnungen in DE/AT gesetzlich erforderlich.");
      focusField("leistungsdatum");
      return;
    }

    // Region compliance gate — catches AT ≥10k UID rule and DE Steuernummer requirement
    if (dokumentTyp === "rechnung" && profil) {
      const regionCheck = validateForRegion(
        {
          dokumentTyp,
          datum,
          leistungsdatum: leistungsdatum || null,
          kundeEmail: kunde.email || null,
          kundeUidMwst: kunde.uid_mwst || null,
          profil: {
            iban: profil.iban,
            uid_mwst: profil.uid_mwst,
            steuernummer: profil.steuernummer,
            land: profil.land,
          },
          betrag: total,
        },
        profil.land,
      );
      if (!regionCheck.valid) {
        // Surface the most critical error with legal context
        const firstError = Object.values(regionCheck.errors)[0];
        showToast(firstError ?? "Rechtliche Pflichtangaben fehlen.");
        if (regionCheck.errors.leistungsdatum) {
          setFieldErrors((c) => ({ ...c, leistungsdatum: true }));
          setTouchedLeistungsdatum(true);
          focusField("leistungsdatum");
        } else {
          focusField("profileRequirements");
        }
        return;
      }
    }

    if (missingProfileFields.length > 0) {
      const fieldNames = missingProfileFields.map((field) => field.label).join(", ");
      showToast(`${fieldNames} — erforderlich für ${typLabel} in ${dachConfig.name}.`);
      focusField("profileRequirements");
      return;
    }

    if (!downloadPdf && !sharePdf && !whatsappPdf && !emailPdf) return;

    setSending(true);

    // Pre-open a WhatsApp tab now, while we still have the user gesture.
    // Modern popup blockers reject window.open() after several awaits,
    // so we open a blank tab synchronously and navigate it once the
    // signed URL is ready. If the save fails, we close it again.
    let waWindow: Window | null = null;
    if (whatsappPdf && typeof window !== "undefined") {
      try {
        waWindow = window.open("about:blank", "_blank");
      } catch {
        waWindow = null;
      }
    }

    try {
      await persistProfileIfNeeded();

      // Server-side limit check before creating document
      if (profil && !isPro(profil.plan)) {
        try {
          const limitRes = await fetch("/api/dokument/check-limit");
          if (!limitRes.ok) throw new Error("Limit-Check fehlgeschlagen");
          const limitData = await limitRes.json();
          if (!limitData.allowed) {
            showToast("Monatslimit erreicht — bitte auf Pro upgraden.");
            setSending(false);
            waWindow?.close();
            return;
          }
        } catch (e) {
          // Limit check failed — user sees toast below
          showToast("Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.");
          setSending(false);
          waWindow?.close();
          return;
        }
      }

      let blob: Blob;
      try {
        blob = await generatePdfBlob();
      } catch (e) {
        // PDF generation failed — user sees toast below
        showToast("Fehler beim Erstellen des PDFs. Bitte überprüfe deine Daten.");
        setSending(false);
        waWindow?.close();
        return;
      }

      // Commit the nummer immediately after PDF is generated — before download/share.
      // This prevents the same number from being reused if the network save fails later.
      commitNummer(dokumentTyp);

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("PDF konnte nicht gelesen werden."));
        reader.readAsDataURL(blob);
      });

      let downloadedResult = false;
      let delivery: "download" | "share" | "whatsapp" | "email" = "share";
      let cloudSaved = true;
      let savedCustomerId: string | null = null;
      let finalNummer = nummer;

      if (downloadPdf) {
        downloadBlob(blob, `${finalNummer}.pdf`);
        downloadedResult = true;
        delivery = "download";
      }

      if (sharePdf) {
        const shared = await trySharePdf(blob, `${finalNummer}.pdf`);
        if (!shared) {
          // Web Share API not available — fall back to download
          if (!downloadedResult) {
            downloadBlob(blob, `${finalNummer}.pdf`);
            downloadedResult = true;
          }
          delivery = "download";
        } else {
          delivery = "share";
        }
      }

      if (whatsappPdf && !downloadedResult) {
        // Safety-net download: if the WhatsApp signed-URL flow fails below
        // (save rejected, storage not reachable), the user still has the
        // file on their device and can attach it manually.
        downloadBlob(blob, `${finalNummer}.pdf`);
        downloadedResult = true;
      }

      if (emailPdf) {
        // Download the PDF first so user can attach it
        if (!downloadedResult) {
          downloadBlob(blob, `${finalNummer}.pdf`);
          downloadedResult = true;
        }
        // Open mailto: with pre-filled subject and body
        const kundeEmail = kunde.email || "";
        const subject = encodeURIComponent(
          `${typLabel} ${finalNummer}${profil?.firmenname ? ` — ${profil.firmenname}` : ""}`
        );
        const body = encodeURIComponent(
          `Guten Tag${kunde.name ? ` ${kunde.name}` : ""},\n\n` +
          `anbei erhalten Sie ${typLabel === "Offerte" ? "unsere Offerte" : "unsere Rechnung"} ${finalNummer}.\n` +
          `Bitte finden Sie das PDF im Anhang.\n\n` +
          `Freundliche Grüsse\n${profil?.firmenname || profil?.vorname || ""}`
        );
        const mailto = `mailto:${encodeURIComponent(kundeEmail)}?subject=${subject}&body=${body}`;
        window.open(mailto, "_self");
        delivery = "email";
      }

      let savedDocumentId: string | null = null;
      let savedSourceDocumentNumber = sourceDocumentNumber;
      try {
        const saveRes = await fetch("/api/dokument/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64: base64,
            typ: dokumentTyp,
            nummer,
            objekt,
            kundenname: getCustomerDisplayName(kunde),
            kunde,
            betrag: total,
            datum,
            leistungsdatum: leistungsdatum || null,
            status: "entwurf",
            sourceDocumentId,
            sourceDocumentNummer: sourceDocumentNumber,
            sourceDocumentTyp: sourceDocumentId ? "offerte" : null,
          }),
        });

        if (!saveRes.ok) {
          const saveData = await saveRes.json();
          // Save failed — falls through to cloudSaved=false handling
          cloudSaved = false;
        } else {
          const saveData = await saveRes.json();
          if (saveData.metadataStored === false) {
            cloudSaved = false;
          } else {
            savedDocumentId = saveData.document?.id || null;
            savedSourceDocumentNumber = saveData.document?.source_document_nummer || sourceDocumentNumber;
            savedCustomerId = saveData.document?.customer_id || null;
            finalNummer = saveData.document?.nummer || nummer;
          }
        }
      } catch (e) {
        // Network save error — PDF already downloaded locally
        cloudSaved = false;
      }

      // WhatsApp send: request a signed URL and open wa.me with a prefilled
      // message. Ordering matters — we need savedDocumentId from the save
      // call above, but we also pre-opened waWindow synchronously so the
      // user's click gesture still counts toward popup-blocker policy.
      if (whatsappPdf) {
        const firmaSignatur = profil?.firmenname || profil?.vorname || "";
        const greeting = kunde.name ? ` ${kunde.name}` : "";
        const typDescription =
          typLabel === "Offerte" ? "unsere Offerte" : "unsere Rechnung";

        let signedUrl: string | null = null;
        if (cloudSaved && savedDocumentId) {
          try {
            const shareRes = await fetch("/api/dokument/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: savedDocumentId }),
            });
            if (shareRes.ok) {
              const shareData = await shareRes.json();
              if (typeof shareData?.url === "string") {
                signedUrl = shareData.url;
                if (typeof shareData?.nummer === "string" && shareData.nummer) {
                  finalNummer = shareData.nummer;
                }
              }
            }
          } catch {
            // Fall through — we'll send the message without a link.
          }
        }

        const messageLines = [
          `Guten Tag${greeting},`,
          "",
          `anbei ${typDescription} ${finalNummer}.`,
        ];
        if (signedUrl) {
          messageLines.push(signedUrl);
        } else {
          messageLines.push(
            "Das PDF liegt auf meinem Gerät bereit — ich hänge es direkt in WhatsApp an.",
          );
        }
        messageLines.push("", "Freundliche Grüsse", firmaSignatur);

        const waText = encodeURIComponent(messageLines.join("\n"));
        const waUrl = `https://wa.me/?text=${waText}`;

        if (waWindow && !waWindow.closed) {
          try {
            waWindow.location.href = waUrl;
          } catch {
            // Cross-origin navigation restrictions — fall back to opening
            // a fresh tab. May be blocked by the browser, but we tried.
            window.open(waUrl, "_blank");
          }
        } else {
          window.open(waUrl, "_blank");
        }

        delivery = "whatsapp";

        if (!signedUrl) {
          showToast(
            "WhatsApp geöffnet. Das PDF liegt auf deinem Gerät — bitte manuell anhängen.",
          );
        }
      }

      // Increment counters only after the server confirms the increment.
      try {
        const incrRes = await fetch("/api/dokument/check-limit", { method: "POST" });
        if (incrRes.ok) {
          const incrData = await incrRes.json();
          if (incrData.remaining !== undefined) {
            setFreePlanRemaining(incrData.remaining);
            setServerAllowed(incrData.remaining > 0);
          }
        } else if (incrRes.status === 403) {
          setFreePlanRemaining(0);
          setServerAllowed(false);
        }
      } catch (e) {
        // Counter increment failed — non-blocking, document already saved
      }

      trackDocumentCreated(dokumentTyp, delivery);
      localStorage.removeItem("dokument-draft");

      // Save to document history
      try {
        const history = JSON.parse(localStorage.getItem("dokument-history") || "[]");
        history.unshift({
          typ: dokumentTyp,
          nummer: finalNummer,
          objekt,
          id: savedDocumentId || undefined,
          kundenname: getCustomerDisplayName(kunde),
          customer_id: savedCustomerId,
          kunde_email: kunde.email || null,
          kunde_adresse: kunde.adresse || null,
          kunde_adresse2: kunde.adresse2 || null,
          kunde_plz: kunde.plz || null,
          kunde_ort: kunde.ort || null,
          betrag: total,
          datum,
          status: "entwurf",
          source_document_id: sourceDocumentId,
          source_document_nummer: savedSourceDocumentNumber,
          source_document_typ: sourceDocumentId ? "offerte" : null,
        });
        localStorage.setItem("dokument-history", JSON.stringify(history.slice(0, 100)));
      } catch { /* ignore */ }

      // Navigate to success page
      const carryoverDraft =
        dokumentTyp === "offerte"
          ? {
              dokumentTyp: "rechnung",
              kunde,
              positionen,
              objekt,
              notiz,
              rabatt,
              preisMode,
              mwstSatz,
              sourceDocumentId: savedDocumentId,
              sourceDocumentNumber: finalNummer,
              // Carry over leistungsdatum only when the source Offerte already
              // has one — otherwise leave blank for the user to fill in.
              ...(leistungsdatum ? { leistungsdatum } : {}),
            }
          : null;

      sessionStorage.setItem(
        "dokument-success",
        JSON.stringify({
          typ: dokumentTyp,
          nummer: finalNummer,
          downloaded: downloadedResult,
          delivery,
          cloudSaved,
          kunde: { name: kunde.name, firma: kunde.firma, email: kunde.email },
          betrag: total,
          carryoverDraft,
        })
      );
      const successParams = new URLSearchParams({
        typ: dokumentTyp,
        nummer: finalNummer,
        downloaded: downloadedResult ? "1" : "0",
        delivery,
      });
      if (!cloudSaved) {
        successParams.set("cloudSaved", "0");
      }
      router.push(`/dokument/success?${successParams.toString()}`);
    } catch (err) {
      // Unexpected error — user sees toast below
      showToast("Ein unerwarteter Fehler ist aufgetreten.");
      waWindow?.close();
    } finally {
      setSending(false);
    }
  }

  async function saveDraft() {
    const draftPayload = {
      dokumentTyp,
      kunde,
      positionen,
      nummer,
      datum,
      gueltigBis,
      leistungsdatum,
      mwstSatz,
      notiz,
      objekt,
      rabatt,
      preisMode,
      sourceDocumentId,
      sourceDocumentNumber,
      cloudDraftId,
    };

    // Always persist to localStorage first (instant, offline-safe).
    try {
      localStorage.setItem("dokument-draft", JSON.stringify({ ...draftPayload, _savedAt: new Date().toISOString() }));
    } catch { /* ignore quota errors */ }

    // Try to generate a PDF and save to Supabase as "entwurf" for cross-device access.
    if (!profil) {
      showToast("Entwurf lokal gespeichert.");
      return;
    }

    try {
      const blob = await generatePdfBlob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(blob);
      });

      const saveRes = await fetch("/api/dokument/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: base64,
          typ: dokumentTyp,
          nummer,
          objekt,
          kundenname: getCustomerDisplayName(kunde),
          kunde,
          betrag: total,
          datum,
          leistungsdatum: leistungsdatum || null,
          status: "entwurf",
          sourceDocumentId,
          sourceDocumentNummer: sourceDocumentNumber,
          sourceDocumentTyp: sourceDocumentId ? "offerte" : null,
          existingDocumentId: cloudDraftId,
        }),
      });

      if (saveRes.ok) {
        const saveData = await saveRes.json();
        const newCloudDraftId = saveData.document?.id ?? cloudDraftId ?? null;
        const resolvedDraftNummer = saveData.document?.nummer ?? nummer;
        if (newCloudDraftId) {
          setCloudDraftId(newCloudDraftId);
          if (resolvedDraftNummer !== nummer) {
            setNummer(resolvedDraftNummer);
          }
          // Persist cloudDraftId into localStorage draft so it survives page reload.
          try {
            localStorage.setItem(
              "dokument-draft",
              JSON.stringify({ ...draftPayload, nummer: resolvedDraftNummer, cloudDraftId: newCloudDraftId, _savedAt: new Date().toISOString() }),
            );
          } catch { /* ignore */ }
        }
        showToast(cloudDraftId ? "Cloud-Entwurf aktualisiert." : "Entwurf in der Cloud gespeichert.");
      } else {
        showToast("Entwurf lokal gespeichert.");
      }
    } catch {
      // PDF generation or network failure — localStorage save already succeeded.
      showToast("Entwurf lokal gespeichert.");
    }
  }

  async function handleErechnung() {
    if (!profil) return;

    // Same mandatory checks as handleSend
    if (dachConfig.leistungsdatumRequired && !leistungsdatum) {
      showToast("Leistungsdatum ist für E-Rechnungen in DE/AT gesetzlich erforderlich.");
      focusField("leistungsdatum");
      return;
    }

    if (missingProfileFields.length > 0) {
      const fieldNames = missingProfileFields.map((field) => field.label).join(", ");
      showToast(`${fieldNames} — erforderlich für ${typLabel} in ${dachConfig.name}.`);
      focusField("profileRequirements");
      return;
    }

    setERechnungLoading(true);
    try {
      const blob = await generatePdfBlob();
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("PDF konnte nicht gelesen werden."));
        reader.readAsDataURL(blob);
      });
      const invoiceData = { nummer, datum, kunde, positionen, mwstSatz, notiz, profil, rabatt };
      const res = await fetch("/api/e-rechnung/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, invoiceData, leistungsdatum: leistungsdatum || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Fehler beim Erstellen der E-Rechnung.");
        return;
      }
      const { pdfBase64: resultBase64 } = await res.json();
      const bytes = Uint8Array.from(atob(resultBase64), (c) => c.charCodeAt(0));
      const outBlob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nummer}-e-rechnung.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      showToast("Fehler beim Erstellen der E-Rechnung.");
    } finally {
      setERechnungLoading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  if (loading) {
    return (
      <div>
        <div className="greeting">
          <div className="greeting-name">Neues Dokument</div>
          <div className="greeting-sub">Laden…</div>
        </div>
      </div>
    );
  }

  const kundeDisplay = kunde.name || kunde.firma || "Kunde";
  const kundeAdresse = [
    kunde.adresse,
    kunde.adresse2,
    [kunde.plz, kunde.ort].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const firmenInitials = profil?.firmenname
    ? profil.firmenname
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "OF";

  return (
    <div className="mx-auto max-w-4xl px-5 pb-8">
      {/* Top Nav */}
      <div className="top-nav">
        <a href="/dashboard" className="nav-back">
          ←
        </a>
        <span className="nav-title" style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>
          {typLabel} erstellen
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Upgrade screen when server confirms limit reached */}
      {serverAllowed === false && profil && (
        <UpgradeScreen
          email={profil.email}
          land={profil.land}
          trialEndsAt={profil.trial_ends_at ?? null}
        />
      )}

      <div>
        <div>

      {/* Draft recovery banner */}
      {draftRestored && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 14,
          padding: "10px 14px",
          borderRadius: 13,
          background: "rgba(200,121,61,0.08)",
          border: "1px solid rgba(200,121,61,0.2)",
          fontSize: 13,
          color: "var(--app-text)",
        }}>
          <span>Entwurf wiederhergestellt{draftRestoredAt ? ` · gespeichert ${draftRestoredAt}` : ""}.</span>
          <button
            type="button"
            onClick={() => { localStorage.removeItem("dokument-draft"); setDraftRestored(false); }}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--color-primary)",
              fontWeight: 600,
              padding: "2px 4px",
            }}
          >
            Verwerfen
          </button>
        </div>
      )}

      {sourceDocumentNumber && (
        <div
          className="form-section"
          style={{
            marginBottom: 18,
            border: "1px solid rgba(200,121,61,0.12)",
            background: "rgba(200,121,61,0.04)",
          }}
        >
          <div className="form-label" style={{ marginBottom: 8 }}>Verknüpfung</div>
          <div style={{ fontSize: 14, color: "var(--color-text)" }}>
            Diese {typLabel.toLowerCase()} wird aus <strong>{sourceDocumentNumber}</strong> weitergeführt.
          </div>
        </div>
      )}

      {missingProfileFields.length > 0 && profil && (
        <div
          ref={profileRequirementsRef}
          className="form-section"
          style={{
            marginBottom: 20,
            border: "1px solid rgba(180,35,24,0.18)",
            background: "rgba(180,35,24,0.04)",
          }}
        >
          <div className="form-label" style={{ marginBottom: 8 }}>Pflichtangaben für {typLabel}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
            Bitte ergänze {missingProfileFields.map((field) => field.label).join(", ")} direkt hier, ohne in die Einstellungen zu wechseln.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input-field"
              placeholder="Firmenname"
              value={profil.firmenname}
              onChange={(event) => updateProfilField("firmenname", event.target.value)}
              style={{ marginBottom: 0 }}
            />
            <input
              className="input-field"
              placeholder="Adresse"
              value={profil.adresse}
              onChange={(event) => updateProfilField("adresse", event.target.value)}
              style={{ marginBottom: 0 }}
            />
            <input
              className="input-field"
              placeholder="PLZ"
              value={profil.plz}
              onChange={(event) => updateProfilField("plz", event.target.value)}
              style={{ marginBottom: 0 }}
            />
            <input
              className="input-field"
              placeholder="Ort"
              value={profil.ort}
              onChange={(event) => updateProfilField("ort", event.target.value)}
              style={{ marginBottom: 0 }}
            />
            {dokumentTyp === "rechnung" && (
              <input
                className="input-field"
                placeholder="IBAN"
                value={profil.iban}
                onChange={(event) => updateProfilField("iban", event.target.value)}
                style={{ marginBottom: 0 }}
              />
            )}
            {dokumentTyp === "rechnung" && profil.land === "DE" && (
              <input
                className="input-field"
                placeholder="Steuernummer"
                value={profil.steuernummer || ""}
                onChange={(event) => updateProfilField("steuernummer", event.target.value)}
                style={{ marginBottom: 0 }}
              />
            )}
            {/* CH uid_mwst is optional (required: false in dach.ts) — shown in the
                optional-fields block below, never in the red Pflichtangaben block */}
          </div>
        </div>
      )}

      {/* Optional country-specific fields — shown only when not yet filled */}
      {profil && (() => {
        const optionalFields: { key: keyof Profile; label: string; placeholder: string }[] = [];
        if (profil.land === "AT" && !profil.fn_nr?.trim()) {
          optionalFields.push({ key: "fn_nr", label: "Firmenbuchnummer", placeholder: "FN 123456a" });
        }
        if ((profil.land === "AT" || profil.land === "CH") && !profil.uid_mwst?.trim()) {
          optionalFields.push({
            key: "uid_mwst",
            label: profil.land === "AT" ? "UID-Nummer" : "UID / MWST-Nr.",
            placeholder: profil.land === "AT" ? "ATU12345678" : "CHE-123.456.789 MWST",
          });
        }
        if (profil.land === "DE" && !profil.uid_mwst?.trim()) {
          optionalFields.push({ key: "uid_mwst", label: "USt-IdNr.", placeholder: "DE123456789" });
        }
        if (optionalFields.length === 0) return null;
        return (
          <div
            className="form-section"
            style={{
              marginBottom: 20,
              border: "1px solid var(--app-border)",
              background: "transparent",
            }}
          >
            <div className="form-label" style={{ marginBottom: 8 }}>Optionale Angaben</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {optionalFields.map((f) => (
                <div key={f.key} style={{ position: "relative" }}>
                  <input
                    className="input-field"
                    placeholder={`${f.label} (optional)`}
                    value={(profil[f.key] as string | undefined) || ""}
                    onChange={(event) => updateProfilField(f.key, event.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dokument-Typ Toggle */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 20,
          borderRadius: 13,
          overflow: "hidden",
          border: "1px solid var(--app-border)",
        }}
      >
        <button
          onClick={() => handleTypChange("offerte")}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            background: dokumentTyp === "offerte" ? "var(--color-primary)" : "transparent",
            color: dokumentTyp === "offerte" ? "#fff" : "var(--color-text-muted)",
            transition: "all 0.2s ease",
          }}
        >
          Offerte
        </button>
        <button
          onClick={() => handleTypChange("rechnung")}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            borderLeft: "1px solid var(--app-border)",
            cursor: "pointer",
            background: dokumentTyp === "rechnung" ? "var(--color-primary)" : "transparent",
            color: dokumentTyp === "rechnung" ? "#fff" : "var(--color-text-muted)",
            transition: "all 0.2s ease",
          }}
        >
          Rechnung
        </button>
      </div>

      {/* Dokument Meta */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        <input
          value={nummer}
          onChange={(e) => setNummer(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--color-text-muted)",
            padding: "2px 0",
            width: 120,
          }}
          title={`${typLabel}-Nummer (editierbar)`}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="date"
            value={datum}
            onChange={(e) => {
              setDatum(e.target.value);
              const frist = profil?.zahlungsfrist || 30;
              setGueltigBis(addDays(e.target.value, frist));
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--color-text-muted)",
              padding: "2px 0",
            }}
            title="Datum"
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          marginTop: -8,
          fontSize: 11,
          color: "var(--color-text-muted)",
        }}
      >
        <span>{dateEndLabel}:</span>
        <input
          type="date"
          value={gueltigBis}
          onChange={(e) => setGueltigBis(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--color-text-muted)",
            padding: "2px 0",
          }}
          title={dateEndLabel}
        />
      </div>

      {/* Leistungsdatum — mandatory for DE/AT, optional for CH (Art. 26 Abs. 2 lit. c MWSTG) */}
      {dokumentTyp === "rechnung" && (dachConfig.leistungsdatumRequired || profil?.land === "CH") && (
        <div style={{ marginBottom: 16, marginTop: -8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--color-text-muted)",
            }}
          >
            {/* Required-field marker — only for DE/AT */}
            {dachConfig.leistungsdatumRequired && (
              <span style={{ color: "var(--app-text)", fontSize: 9, lineHeight: 1 }} aria-hidden="true">●</span>
            )}
            <span>
              Leistungsdatum{!dachConfig.leistungsdatumRequired && <span style={{ fontStyle: "italic" }}> (optional)</span>}:
            </span>
            <input
              type="date"
              value={leistungsdatum}
              onChange={(e) => {
                setLeistungsdatum(e.target.value);
                if (fieldErrors.leistungsdatum) {
                  setFieldErrors((current) => ({ ...current, leistungsdatum: false }));
                }
              }}
              onBlur={() => {
                if (!leistungsdatum && dachConfig.leistungsdatumRequired) setTouchedLeistungsdatum(true);
              }}
              ref={leistungsdatumInputRef}
              style={{
                background: "transparent",
                border: (fieldErrors.leistungsdatum || (touchedLeistungsdatum && !leistungsdatum))
                  ? "1px solid var(--color-error)"
                  : "none",
                borderRadius: 4,
                outline: "none",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--color-text-muted)",
                padding: "2px 4px",
                transition: "border-color 0.18s ease",
              }}
              title={
                profil?.land === "DE"
                  ? "Leistungsdatum (§14 Abs. 4 Nr. 6 UStG)"
                  : profil?.land === "AT"
                    ? "Leistungsdatum (§11 Abs. 1 Z 6 öUStG)"
                    : "Leistungsdatum (Art. 26 Abs. 2 lit. c MWSTG) — falls abweichend vom Rechnungsdatum"
              }
            />
          </div>
          {/* Live error — only for mandatory countries */}
          {dachConfig.leistungsdatumRequired && (fieldErrors.leistungsdatum || (touchedLeistungsdatum && !leistungsdatum)) && (
            <div style={{
              textAlign: "right",
              fontSize: 10,
              color: "var(--color-error)",
              marginTop: 3,
              lineHeight: 1.4,
            }}>
              {profil?.land === "DE"
                ? "Wann haben Sie die Leistung erbracht? (Pflicht nach §14 Abs. 4 Nr. 6 UStG)"
                : "Wann haben Sie die Leistung erbracht? (Pflicht nach §11 Abs. 1 Z 6 öUStG)"}
            </div>
          )}
          {/* Info hint for CH — only when field is filled and differs from invoice date */}
          {profil?.land === "CH" && !dachConfig.leistungsdatumRequired && !leistungsdatum && (
            <div style={{ textAlign: "right", fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
              Falls Leistungsdatum = Rechnungsdatum, kann leer gelassen werden.
            </div>
          )}
        </div>
      )}

      {/* Objekt / Kurzbezeichnung */}
      <input
        className="input-field"
        placeholder="Objekt / Kurzbezeichnung (z.B. Badezimmer EG, Neubau Gartenstrasse 4)"
        value={objekt}
        onChange={(e) => setObjekt(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {/* Kunde */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="form-label">Kunde</div>
        <div style={{ position: "relative" }}>
          <input
            className="input-field"
            placeholder="Name / Firma"
            value={kunde.name || kunde.firma}
            autoComplete="off"
            onChange={(e) => {
              updateKunde("name", e.target.value);
              setShowCustomerDropdown(true);
              setCustomerDropdownIdx(-1);
            }}
            onFocus={() => {
              if (customerQuery.length >= 2) setShowCustomerDropdown(true);
            }}
            onBlur={() => {
              // Delay so click on dropdown item registers first
              setTimeout(() => setShowCustomerDropdown(false), 180);
            }}
            onKeyDown={(e) => {
              if (!showCustomerDropdown || filteredCustomers.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCustomerDropdownIdx((i) => Math.min(i + 1, filteredCustomers.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCustomerDropdownIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && customerDropdownIdx >= 0) {
                e.preventDefault();
                selectCustomer(filteredCustomers[customerDropdownIdx]);
              } else if (e.key === "Escape") {
                setShowCustomerDropdown(false);
              }
            }}
          />
          {/* Autocomplete dropdown */}
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div
              ref={customerDropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                marginTop: 4,
                borderRadius: 13,
                border: "1px solid var(--app-border-strong)",
                background: "var(--app-card)",
                boxShadow: "var(--shadow-float)",
                overflow: "hidden",
                animation: "toast-in 0.18s var(--ease-out-expo) both",
              }}
            >
              {filteredCustomers.map((record, i) => (
                <button
                  key={record.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCustomer(record)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: i < filteredCustomers.length - 1 ? "1px solid var(--app-border)" : "none",
                    background: i === customerDropdownIdx ? "var(--color-primary-soft)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s ease",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>
                    {record.display_name}
                  </span>
                  {(record.email || record.ort) && (
                    <span style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                      {[record.email, record.ort].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {customerReuseHint && (
          <div style={{ marginTop: 6, marginBottom: 8, fontSize: 12, color: "var(--app-text-muted)" }}>
            {customerReuseHint}
          </div>
        )}
        <div className="input-row" style={{ marginBottom: 8 }}>
          <input
            className="input-field"
            placeholder="Adresse"
            value={kunde.adresse}
            onChange={(e) => updateKunde("adresse", e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
        <div className="input-row" style={{ marginBottom: 8 }}>
          <input
            className="input-field"
            placeholder="Adresszeile 2 (z.Hd. Herr Müller, 3. OG links)"
            value={kunde.adresse2}
            onChange={(e) => updateKunde("adresse2", e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
        <div className="input-row" style={{ marginBottom: 8 }}>
          <input
            className="input-field"
            placeholder="PLZ"
            value={kunde.plz}
            onChange={(e) => updateKunde("plz", e.target.value)}
            style={{ marginBottom: 0, maxWidth: 90 }}
          />
          <input
            className="input-field"
            placeholder="Ort"
            value={kunde.ort}
            onChange={(e) => updateKunde("ort", e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
        <input
          className="input-field"
          type="email"
          placeholder="E-Mail (für Versand)"
          value={kunde.email}
          onChange={(e) => updateKunde("email", e.target.value)}
          ref={emailInputRef}
          style={
            fieldErrors.kundeEmail
              ? { borderColor: "var(--color-error)", boxShadow: "0 0 0 4px var(--color-error-soft)" }
              : undefined
          }
        />
        {profil?.land === "DE" && dokumentTyp === "rechnung" && (
          <input
            className="input-field"
            placeholder="USt-IdNr. des Kunden (optional, für E-Rechnung)"
            value={kunde.uid_mwst || ""}
            onChange={(e) => updateKunde("uid_mwst", e.target.value)}
            style={{ marginBottom: 0 }}
          />
        )}
        {/* AT: Empfänger-UID becomes mandatory when total ≥ 10 000 EUR */}
        {profil?.land === "AT" && dokumentTyp === "rechnung" && (
          <div style={{ position: "relative" }}>
            <input
              className="input-field"
              placeholder={
                total >= 10_000
                  ? "UID-Nummer des Empfängers (Pflicht ab EUR 10.000)"
                  : "UID-Nummer des Empfängers (optional)"
              }
              value={kunde.uid_mwst || ""}
              onChange={(e) => updateKunde("uid_mwst", e.target.value)}
              style={{
                marginBottom: 0,
                borderColor: total >= 10_000 && !kunde.uid_mwst?.trim()
                  ? "var(--color-error-border)"
                  : undefined,
              }}
            />
            {total >= 10_000 && !kunde.uid_mwst?.trim() && (
              <div style={{ fontSize: 10, color: "var(--color-error)", marginTop: 4, lineHeight: 1.4 }}>
                ● Ab EUR 10.000 Pflicht nach §11 Abs. 1 Z 8 UStG
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vorlagen */}
      {vorlagen.length > 0 && (
        <div className="form-section" style={{ marginBottom: 20 }}>
          <div className="form-label">Vorlage wählen</div>
          <div className="chip-row">
            {vorlagen.map((v) => (
              <button
                key={v.id}
                className={`chip ${selectedVorlage === v.id ? "selected" : ""}`}
                onClick={() => applyVorlage(v)}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Positionen */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="form-label">Positionen</div>
        <div className="pos-table">
          <div className="pos-header">
            <div className="pos-h">Bezeichnung</div>
            <div className="pos-h" style={{ textAlign: "right" }}>
              Menge
            </div>
            <div className="pos-h" style={{ textAlign: "right" }}>
              {preisMode === "exkl" ? "Preis exkl." : "Preis inkl."}
            </div>
            <div />
          </div>
          {positionen.map((pos, i) => (
            <div key={i} className="pos-row">
              <input
                className="pos-input"
                style={{ textAlign: "left" }}
                value={pos.bezeichnung}
                onChange={(e) => updatePos(i, "bezeichnung", e.target.value)}
                placeholder="Bezeichnung"
              />
              <input
                className="pos-input"
                type="number"
                step="0.5"
                min="0"
                value={pos.menge}
                onChange={(e) =>
                  updatePos(i, "menge", parseFloat(e.target.value) || 0)
                }
              />
              <input
                className="pos-input"
                type="number"
                step="0.01"
                min="0"
                value={pos.preis}
                onChange={(e) =>
                  updatePos(i, "preis", parseFloat(e.target.value) || 0)
                }
              />
              {positionen.length > 1 ? (
                <button className="pos-del" onClick={() => removePosition(i)}>
                  ×
                </button>
              ) : (
                <div style={{ width: 20 }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="add-pos-btn" onClick={addPosition}>
            + Position hinzufügen
          </button>
          {!rabatt.aktiv && (
            <button
              className="add-pos-btn"
              onClick={() => setRabatt((r) => ({ ...r, aktiv: true }))}
              style={{ color: "#22c55e" }}
            >
              % Rabatt hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* Freitext-Notiz */}
      <div className="form-section" style={{ marginBottom: 20 }}>
        <div className="form-label">Bemerkungen (optional)</div>
        <textarea
          className="input-field"
          rows={2}
          value={notiz}
          onChange={(e) => {
            if (e.target.value.length <= 500) setNotiz(e.target.value);
          }}
          placeholder="z.B. Preise exkl. Material. Nicht inkl. Entsorgung. Bei Mehraufwand separates Angebot."
          style={{ resize: "vertical", width: "100%", marginBottom: 0 }}
        />
        {notiz.length > 0 && (
          <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "right", marginTop: 2 }}>
            {notiz.length}/500
          </div>
        )}
      </div>

      {/* Rabatt-Feld */}
      {rabatt.aktiv && (
        <div className="form-section" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="form-label" style={{ marginBottom: 0 }}>Rabatt</div>
            <button
              onClick={() => setRabatt({ aktiv: false, label: "Rabatt", modus: "chf", wert: 0 })}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Entfernen
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              className="input-field"
              value={rabatt.label}
              onChange={(e) => setRabatt((r) => ({ ...r, label: e.target.value }))}
              placeholder="Bezeichnung"
              style={{ flex: 2, marginBottom: 0 }}
            />
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button
                onClick={() => setRabatt((r) => ({ ...r, modus: "chf" }))}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  border: "1px solid var(--app-border)",
                  borderRadius: 6,
                  background: rabatt.modus === "chf" ? "var(--color-primary)" : "transparent",
                  color: rabatt.modus === "chf" ? "#fff" : "inherit",
                  cursor: "pointer",
                }}
              >
                {cur}
              </button>
              <button
                onClick={() => setRabatt((r) => ({ ...r, modus: "prozent" }))}
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  border: "1px solid var(--app-border)",
                  borderRadius: 6,
                  background: rabatt.modus === "prozent" ? "var(--color-primary)" : "transparent",
                  color: rabatt.modus === "prozent" ? "#fff" : "inherit",
                  cursor: "pointer",
                }}
              >
                %
              </button>
            </div>
            <input
              className="input-field"
              type="number"
              step="0.01"
              min="0"
              value={rabatt.wert}
              onChange={(e) => setRabatt((r) => ({ ...r, wert: parseFloat(e.target.value) || 0 }))}
              style={{ width: 80, marginBottom: 0, textAlign: "right" }}
            />
          </div>
        </div>
      )}

      {/* MWST Mode Toggle + helper note */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
          {preisMode === "exkl" ? "Alle Positionspreise exkl. MWST" : "Alle Positionspreise inkl. MWST"}
        </div>
        <div
          style={{
            display: "flex",
            gap: 0,
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid var(--app-border)",
          }}
        >
          <button
            onClick={() => setPreisMode("exkl")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: preisMode === "exkl" ? "var(--color-primary)" : "transparent",
              color: preisMode === "exkl" ? "#fff" : "var(--color-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            Exkl. MWST
          </button>
          <button
            onClick={() => setPreisMode("inkl")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              borderLeft: "1px solid var(--app-border)",
              cursor: "pointer",
              background: preisMode === "inkl" ? "var(--color-primary)" : "transparent",
              color: preisMode === "inkl" ? "#fff" : "var(--color-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            Inkl. MWST
          </button>
        </div>
      </div>

      {/* MWST + Total */}
      <div className="total-box">
        {preisMode === "exkl" ? (
          <>
            <div className="total-row">
              <div className="total-label">Zwischentotal</div>
              <div className="total-val">{cur} {fmtAmt(grossSubtotal)}</div>
            </div>
            {rabatt.aktiv && rabattBetrag > 0 && (
              <div className="total-row">
                <div className="total-label">{rabatt.label}</div>
                <div className="total-val" style={{ color: "#22c55e" }}>
                  −{cur} {fmtAmt(rabattBetrag)}
                </div>
              </div>
            )}
            <div className="total-row">
              <div className="total-label">
                {dachConfig.mwstLabel}{" "}
                <select
                  className="mwst-select"
                  value={mwstSatz}
                  onChange={(e) => setMwstSatz(parseFloat(e.target.value))}
                >
                  {dachConfig.mwstOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="total-val">{cur} {fmtAmt(mwstBetrag)}</div>
            </div>
            <div className="total-divider" />
            <div className="total-row total-final">
              <div className="total-label">Total</div>
              <div className="total-val">{cur} {fmtAmt(total)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="total-row">
              <div className="total-label">Bruttototal</div>
              <div className="total-val">{cur} {fmtAmt(grossSubtotal)}</div>
            </div>
            {rabatt.aktiv && rabattBetrag > 0 && (
              <div className="total-row">
                <div className="total-label">{rabatt.label}</div>
                <div className="total-val" style={{ color: "#22c55e" }}>
                  −{cur} {fmtAmt(rabattBetrag)}
                </div>
              </div>
            )}
            <div className="total-row">
              <div className="total-label" style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                davon{" "}
                {dachConfig.mwstLabel}{" "}
                <select
                  className="mwst-select"
                  value={mwstSatz}
                  onChange={(e) => setMwstSatz(parseFloat(e.target.value))}
                >
                  {dachConfig.mwstOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="total-val" style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                {cur} {fmtAmt(mwstBetrag)}
              </div>
            </div>
            <div className="total-divider" />
            <div className="total-row total-final">
              <div className="total-label">Total</div>
              <div className="total-val">{cur} {fmtAmt(total)}</div>
            </div>
          </>
        )}
      </div>

      {/* AT ≥ 10 000 EUR compliance nudge — §11 Abs. 1 Z 8 UStG */}
      {profil?.land === "AT" && dokumentTyp === "rechnung" && total >= 10_000 && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(185,28,28,0.20)",
            background: "rgba(185,28,28,0.04)",
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--app-text)",
          }}
        >
          <strong style={{ color: "var(--color-error)" }}>Pflichtangaben ab EUR 10.000</strong> (§11 Abs. 1 Z 8 UStG)
          <ul style={{ margin: "6px 0 0 16px", padding: 0, color: "var(--app-text-muted)" }}>
            {!profil.uid_mwst?.trim() && (
              <li>Deine UID-Nummer fehlt im Profil</li>
            )}
            {!kunde.uid_mwst?.trim() && (
              <li>UID-Nummer des Empfängers fehlt</li>
            )}
          </ul>
        </div>
      )}

      {/* Send Options */}
      <div className="send-opts" style={{ marginTop: 16 }}>
        <button
          type="button"
          className={`send-opt ${downloadPdf ? "active" : ""}`}
          onClick={() => setDownloadPdf(!downloadPdf)}
          aria-pressed={downloadPdf}
        >
          <div className="send-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div>
            <div className="send-title">PDF herunterladen</div>
            <div className="send-sub">Auf Gerät speichern</div>
          </div>
          <div className="send-check">{downloadPdf ? "✓" : ""}</div>
        </button>
        <button
          type="button"
          className={`send-opt ${sharePdf ? "active" : ""}`}
          onClick={() => setSharePdf(!sharePdf)}
          aria-pressed={sharePdf}
        >
          <div className="send-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </div>
          <div>
            <div className="send-title">Teilen (Handy)</div>
            <div className="send-sub">Öffnet System-Share — PDF direkt anhängen</div>
          </div>
          <div className="send-check">{sharePdf ? "✓" : ""}</div>
        </button>
        <button
          type="button"
          className={`send-opt ${whatsappPdf ? "active" : ""}`}
          onClick={() => setWhatsappPdf(!whatsappPdf)}
          aria-pressed={whatsappPdf}
        >
          <div className="send-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 3.4L3 21"/><path d="M9 10a1 1 0 0 0 1 1 1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1"/><path d="M13 13a1 1 0 0 0 1 1 1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1"/></svg>
          </div>
          <div>
            <div className="send-title">Per WhatsApp senden</div>
            <div className="send-sub">Öffnet WhatsApp mit Link zum PDF</div>
          </div>
          <div className="send-check">{whatsappPdf ? "✓" : ""}</div>
        </button>
        <button
          type="button"
          className={`send-opt ${emailPdf ? "active" : ""}`}
          onClick={() => setEmailPdf(!emailPdf)}
          aria-pressed={emailPdf}
        >
          <div className="send-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <div className="send-title">Per E-Mail senden</div>
            <div className="send-sub">PDF herunterladen & Mail öffnen</div>
          </div>
          <div className="send-check">{emailPdf ? "✓" : ""}</div>
        </button>
      </div>

      {/* Free plan document counter */}
      {freePlanRemaining !== null && freePlanRemaining <= 5 && (
        <div style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 12,
          color: freePlanRemaining <= 1 ? "var(--color-error)" : "var(--app-text-muted)",
        }}>
          <span style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 99,
            background: freePlanRemaining <= 1 ? "rgba(180,35,24,0.08)" : "rgba(0,0,0,0.05)",
            fontWeight: 600,
          }}>
            {freePlanRemaining === 0
              ? "Monatslimit erreicht — "
              : `Noch ${freePlanRemaining} von 5 kostenlosen Dokumenten — `}
            <a href="/einstellungen/abonnement" style={{ color: "var(--color-primary)", textDecoration: "none" }}>
              Pro freischalten
            </a>
          </span>
        </div>
      )}

      {profil?.land === "DE" && dokumentTyp === "rechnung" && (
        <button
          onClick={handleErechnung}
          disabled={eRechnungLoading}
          style={{
            display: "block",
            width: "100%",
            marginTop: 10,
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 600,
            border: "2px solid var(--color-primary)",
            borderRadius: 13,
            background: "transparent",
            color: eRechnungLoading ? "var(--color-text-muted)" : "var(--color-primary)",
            cursor: eRechnungLoading ? "not-allowed" : "pointer",
            opacity: eRechnungLoading ? 0.6 : 1,
          }}
        >
          {eRechnungLoading ? "E-Rechnung wird erstellt…" : "Als E-Rechnung herunterladen (ZUGFeRD)"}
        </button>
      )}

      {/* Bottom Bar — single dominant CTA */}
      <div className="bottom-bar" style={{ flexDirection: "column", gap: 8, alignItems: "stretch" }}>
        <button
          className="btn-primary"
          style={{ width: "100%", padding: "14px 0", fontSize: 15 }}
          onClick={handleSend}
          disabled={sending || (!downloadPdf && !sharePdf && !whatsappPdf && !emailPdf) || serverAllowed === false}
        >
          {sending ? "Wird gesendet…" : sendBtnLabel}
        </button>
        <button
          onClick={saveDraft}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--app-text-muted)",
            padding: "4px 0",
          }}
        >
          Als Entwurf speichern
        </button>
      </div>

        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.includes("Fehler") || toast.includes("Bitte") ? "toast-error" : "toast-success"}`}>
          {toast}
        </div>
      )}
    </div>
  );
}


