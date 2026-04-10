"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "var(--app-text, #1A1916)",
          lineHeight: 1,
          marginBottom: 12,
          fontFamily: "var(--font-display)",
        }}>
          Fehler
        </div>
        <p style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--app-text-muted, #5A5750)",
          marginBottom: 24,
        }}>
          Etwas ist schiefgelaufen. Bitte versuche es erneut.
        </p>
        {error.digest && (
          <p style={{
            fontSize: 12,
            color: "var(--app-text-soft, #918A80)",
            marginBottom: 16,
            fontFamily: "monospace",
          }}>
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="btn-premium btn-premium-primary"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
