"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import OffertioLogo from "@/components/OffertioLogo";

interface SuccessInfo {
  typ: "offerte" | "rechnung";
  nummer: string;
  email: string | null;
  downloaded: boolean;
  delivery?: "email" | "download" | "share";
  cloudSaved?: boolean;
  kunde?: { name: string; firma: string; email: string };
  betrag?: number;
  carryoverDraft?: Record<string, unknown> | null;
}

const CONFETTI_COLORS = ["#C8793D", "#F5A623", "#22C55E", "#3B82F6", "#A855F7", "#EC4899", "#F59E0B"];

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: (Math.random() - 0.5) * 220,
        y: -(Math.random() * 140 + 60),
        rotate: Math.random() * 540 - 270,
        scale: 0.4 + Math.random() * 0.9,
        delay: Math.random() * 0.35,
        isCircle: i % 3 === 0,
      })),
    [],
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: p.scale, rotate: p.rotate, opacity: 0 }}
          transition={{ duration: 1.1 + Math.random() * 0.4, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            borderRadius: p.isCircle ? "50%" : 2,
            background: p.color,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export default function DokumentSuccessPage() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<SuccessInfo | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dokument-success");
      if (raw) {
        setInfo(JSON.parse(raw));
        sessionStorage.removeItem("dokument-success");
      } else {
        const typParam = searchParams.get("typ");
        const nummerParam = searchParams.get("nummer");
        if (typParam && nummerParam) {
          setInfo({
            typ: typParam === "rechnung" ? "rechnung" : "offerte",
            nummer: nummerParam,
            email: searchParams.get("email"),
            downloaded: searchParams.get("downloaded") === "1",
            cloudSaved: searchParams.get("cloudSaved") !== "0",
            delivery:
              searchParams.get("delivery") === "share"
                ? "share"
                : searchParams.get("delivery") === "download"
                  ? "download"
                  : "email",
          });
        }
      }
    } catch {
      // Fall back to query params on corrupted session state.
    }

    // Trigger confetti burst after mount
    const t = setTimeout(() => setShowConfetti(true), 80);
    return () => clearTimeout(t);
  }, [searchParams]);

  const typ = info?.typ || "offerte";
  const nummer = info?.nummer || (typ === "rechnung" ? "Rechnung" : "Offerte");
  const email = info?.email;
  const downloaded = info?.downloaded;
  const delivery = info?.delivery || (email ? "email" : downloaded ? "download" : "email");
  const cloudSaved = info?.cloudSaved ?? true;
  const amount = info?.betrag;
  const carryoverDraft = info?.carryoverDraft ?? null;
  const deliveryLabels: Record<"email" | "download" | "share", string> = {
    email: "E-Mail",
    download: "Download",
    share: "Teilen",
  };

  let headline = `${nummer} ist unterwegs.`;
  if (delivery === "share") headline = `${nummer} ist bereit zum Teilen.`;
  if (delivery === "download") headline = `${nummer} gesichert.`;

  let message = "Du hast gerade etwas Professionelles erschaffen.";
  if (delivery === "share") {
    message = "Du kannst dein Dokument jetzt direkt über dein Gerät weitergeben oder als PDF sichern.";
  } else if (email) {
    message = `Eine Kopie wurde an ${email} gesendet.${downloaded ? " Das PDF liegt zusätzlich auf deinem Gerät." : ""}`;
  } else if (downloaded) {
    message = "Das PDF liegt auf deinem Gerät — sauber und bereit.";
  }

  function handleReminder() {
    const now = new Date();
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + 7);
    reminderDate.setHours(9, 0, 0, 0);

    const label = typ === "offerte" ? "Offerte" : "Rechnung";
    const kundeLabel = info?.kunde?.firma || info?.kunde?.name || "Kunde";
    const summary = `Nachfassen: ${label} ${nummer} — ${kundeLabel}`;
    const description = `Hast du bereits eine Rückmeldung zu ${label} ${nummer}${info?.kunde?.name ? ` für ${info.kunde.firma || info.kunde.name}` : ""}?\\nFalls nicht — jetzt kurz nachfragen!`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Offertio//DE",
      "BEGIN:VEVENT",
      `UID:${nummer}-reminder-${Date.now()}@offertio`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(reminderDate)}`,
      `DTEND:${formatIcsDate(new Date(reminderDate.getTime() + 15 * 60 * 1000))}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT0M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${summary}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    downloadIcs(`erinnerung-${nummer}.ics`, ics);
    setReminderSent(true);
  }

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-xl animate-flow">
        <div className="success-card">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease }}
            className="flex justify-center"
          >
            <div className="relative">
              {showConfetti && <ConfettiBurst />}
              <motion.div
                animate={{ boxShadow: ["0 0 0 0 rgba(200,121,61,0)", "0 0 0 18px rgba(200,121,61,0.14)", "0 0 0 32px rgba(200,121,61,0.06)", "0 0 0 0 rgba(200,121,61,0)"] }}
                transition={{ duration: 1.8, delay: 0.2, ease: "easeOut" }}
                style={{ borderRadius: "50%" }}
              >
                <OffertioLogo variant="icon" size={56} href={undefined} />
              </motion.div>
              <motion.div
                className="success-check-badge"
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18, ease }}
          >
            <h1 className="success-title">{headline}</h1>
            <p className="success-desc">{message}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease }}
          >
            <div className="success-summary">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--app-text-soft)" }}>
                Abschluss
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs" style={{ color: "var(--app-text-soft)" }}>Dokument</div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: "var(--app-text)" }}>{nummer}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "var(--app-text-soft)" }}>Versandart</div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: "var(--app-text)" }}>
                    {deliveryLabels[delivery]}
                  </div>
                </div>
                {amount ? (
                  <div>
                    <div className="text-xs" style={{ color: "var(--app-text-soft)" }}>Betrag</div>
                    <div className="mt-1 text-sm font-semibold" style={{ color: "var(--app-text)" }}>{amount}</div>
                  </div>
                ) : null}
                {email ? (
                  <div>
                    <div className="text-xs" style={{ color: "var(--app-text-soft)" }}>Empfänger</div>
                    <div className="mt-1 text-sm font-semibold" style={{ color: "var(--app-text)" }}>{email}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {!cloudSaved && (
              <div className="auth-alert auth-alert-error mt-6 text-left">
                Da ist etwas schiefgegangen. Dein Dokument wurde erstellt — bitte bewahre das PDF auf. Wir versuchen es beim nächsten Mal automatisch erneut.
              </div>
            )}

            {typ === "offerte" && (
              <a
                href="/dokument/neu?typ=rechnung"
                onClick={() => {
                  if (carryoverDraft) {
                    localStorage.setItem("dokument-draft", JSON.stringify(carryoverDraft));
                  }
                }}
                className="success-convert-card"
              >
                <div className="text-sm font-semibold" style={{ color: "var(--app-text)" }}>
                  {carryoverDraft ? "Als Rechnung weiterführen" : "Neue Rechnung erstellen"}
                </div>
                <div className="mt-1 text-xs leading-6" style={{ color: "var(--app-text-muted)" }}>
                  {carryoverDraft
                    ? "Kundendaten und Positionen direkt übernehmen."
                    : "Direkt von hier aus zur nächsten Rechnung."}
                </div>
              </a>
            )}

            {/* Email CTA — opens user's mail client */}
            {info?.kunde?.email && delivery !== "email" && (
              <a
                href={`mailto:${encodeURIComponent(info.kunde.email)}?subject=${encodeURIComponent(
                  `${typ === "offerte" ? "Offerte" : "Rechnung"} ${nummer}`
                )}&body=${encodeURIComponent(
                  `Guten Tag${info.kunde.name ? ` ${info.kunde.name}` : ""},\n\n` +
                  `anbei erhalten Sie ${typ === "offerte" ? "unsere Offerte" : "unsere Rechnung"} ${nummer}.\n` +
                  `Bitte finden Sie das PDF im Anhang.\n\nFreundliche Grüsse`
                )}`}
                className="auth-submit"
                style={{
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 24,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Per E-Mail an {info.kunde.name || info.kunde.email} senden
              </a>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/dokument/neu"
                className="auth-submit"
                style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => localStorage.removeItem("dokument-draft")}
              >
                {typ === "offerte" ? "Neue Offerte" : "Neue Rechnung"}
              </a>
              <Link
                href="/dashboard"
                className="onboarding-btn-back"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Zum Dashboard
              </Link>
            </div>

            {/* 7-day follow-up reminder */}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              {reminderSent ? (
                <p style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                  Erinnerung in Kalender gespeichert.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleReminder}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--app-text-muted)",
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                    padding: 0,
                  }}
                >
                  In 7 Tagen erinnern (Kalender)
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
