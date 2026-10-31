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
    <div role="dialog" aria-label="Cookie-Einstellungen" className="cookie-consent">
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
            fontFamily: "system-ui, sans-serif",
            color: "var(--app-text, #1a1a1a)",
            margin: 0,
          }}
        >
          Wir verwenden Analyse-Cookies (Google Analytics), um Offertio zu
          verbessern. Keine Werbung, keine Weitergabe an Dritte.{" "}
          <a
            href="/datenschutz"
            style={{
              color: "#9A5528",
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
            gap: 12,
            marginTop: 14,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleDecline}
            style={{
              minHeight: 48,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "1px solid #c8c2ba",
              background: "#fff",
              color: "#1a1916",
              cursor: "pointer",
            }}
          >
            Ablehnen
          </button>
          <button
            onClick={handleAccept}
            style={{
              minHeight: 48,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: "#9A5528",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
