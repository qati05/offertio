"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--app-bg, #fff)",
      padding: 24,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "var(--app-text, #1A1916)",
          lineHeight: 1,
          marginBottom: 12,
          fontFamily: "var(--font-display)",
        }}>
          404
        </div>
        <p style={{
          fontSize: 17,
          fontWeight: 600,
          color: "var(--app-text, #1A1916)",
          marginBottom: 8,
          fontFamily: "var(--font-display)",
        }}>
          Seite nicht gefunden.
        </p>
        <p style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--app-text-muted, #5A5750)",
          marginBottom: 28,
        }}>
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/dashboard"
          className="btn-premium btn-premium-primary"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
