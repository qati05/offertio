"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "offertio-analytics-consent";

type ConsentState = "granted" | "denied" | null;

function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "granted" || stored === "denied") return stored;
  return null;
}

function updateGtagConsent(granted: boolean) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

/**
 * GDPR-compliant cookie consent banner.
 *
 * Uses GA4 Consent Mode v2:
 * - GA4 loads with consent defaulting to "denied" (set in layout.tsx)
 * - When user accepts → consent updated to "granted", GA4 starts collecting
 * - When user declines → consent stays "denied", GA4 sends no data
 * - Choice persisted in localStorage
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (consent === "granted") {
      updateGtagConsent(true);
    } else if (consent === null) {
      // No choice made yet — show banner
      setVisible(true);
    }
    // "denied" → do nothing, stay denied
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "granted");
    updateGtagConsent(true);
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, "denied");
    updateGtagConsent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "0 16px calc(16px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--card-border, #e5e5e5)",
          borderRadius: 16,
          padding: "20px 20px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          pointerEvents: "auto",
        }}
      >
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--app-text, #1a1a1a)",
            margin: 0,
          }}
        >
          Wir verwenden Analyse-Cookies (Google Analytics), um Offertio zu
          verbessern. Keine Werbung, keine Weitergabe an Dritte.{" "}
          <a
            href="/datenschutz"
            style={{
              color: "var(--color-primary, #C8793D)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Mehr erfahren
          </a>
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleDecline}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              border: "1px solid var(--card-border, #e5e5e5)",
              background: "transparent",
              color: "var(--app-text-muted, #666)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            Ablehnen
          </button>
          <button
            onClick={handleAccept}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: "var(--color-primary, #C8793D)",
              color: "#fff",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
