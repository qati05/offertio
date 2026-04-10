"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#1A1916",
            lineHeight: 1,
            marginBottom: 12,
          }}>
            Fehler
          </div>
          <p style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "#5A5750",
            marginBottom: 24,
          }}>
            Etwas ist schiefgelaufen. Bitte versuche es erneut.
          </p>
          {error.digest && (
            <p style={{
              fontSize: 12,
              color: "#918A80",
              marginBottom: 16,
              fontFamily: "monospace",
            }}>
              Ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              background: "#C8793D",
              border: "none",
              borderRadius: 13,
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
