"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently
    try {
      const dismissedAt = localStorage.getItem("offertio_pwa_dismissed");
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / 86400000;
        if (daysSince < 7) {
          setDismissed(true);
          return;
        }
      }
    } catch { /* ignore */ }

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("offertio_pwa_dismissed", String(Date.now()));
    } catch { /* ignore */ }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: 16,
        right: 16,
        maxWidth: 400,
        margin: "0 auto",
        background: "var(--color-card, #fff)",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 1000,
        border: "1px solid var(--color-border, #eee)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
          App installieren
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          Offertio als App auf deinem Gerät nutzen
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Installieren
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          fontSize: 18,
          cursor: "pointer",
          padding: "0 4px",
        }}
      >
        ×
      </button>
    </div>
  );
}
