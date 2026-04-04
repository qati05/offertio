"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function DokumentSuccessPage() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<SuccessInfo | null>(null);

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
      // Ignore corrupted session state and fall back to query params.
    }
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

  let headline = `${nummer} wurde gesendet`;
  if (delivery === "share") headline = `${nummer} ist bereit zum Teilen`;
  if (delivery === "download") headline = `${nummer} wurde gespeichert`;

  let message = "Dein Dokument ist fertig.";
  if (delivery === "share") {
    message = "Du kannst dein Dokument jetzt direkt über dein Gerät weitergeben oder zusätzlich als PDF sichern.";
  } else if (email) {
    message = `Eine Kopie wurde an ${email} gesendet.${downloaded ? " Das PDF wurde zusätzlich gespeichert." : ""}`;
  } else if (downloaded) {
    message = "Das PDF wurde auf deinem Gerät gespeichert.";
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-xl animate-flow">
        <div className="success-card">
          <div className="flex justify-center">
            <div className="relative">
              <OffertioLogo variant="icon" size={56} href={undefined} />
              <div className="success-check-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="success-title">{headline}</h1>
          <p className="success-desc">{message}</p>

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
              Dein Dokument wurde erstellt, konnte aber noch nicht sauber im Konto gespeichert werden. Bitte bewahre das PDF auf und wiederhole den Speichervorgang später.
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
                  ? "Kundendaten und Positionen übernehmen und direkt den nächsten Schritt vorbereiten."
                  : "Direkt von hier aus zur nächsten Rechnung wechseln."}
              </div>
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
        </div>
      </div>
    </div>
  );
}
