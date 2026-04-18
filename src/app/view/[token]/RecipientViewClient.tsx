"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import SignPad from "@/components/SignPad";

interface DocInfo {
  id: string;
  typ: "offerte" | "rechnung";
  nummer: string;
  objekt: string | null;
  kundenname: string;
  betrag: number;
  datum: string;
  status: string;
}

interface Props {
  token: string;
  doc: DocInfo;
  pdfUrl: string | null;
  firmenname: string;
  firmenAdresse: string;
  firmenTelefon: string;
  logoUrl: string | null;
  firmenLand: "CH" | "DE" | "AT";
}

function fmtCurrency(amount: number, land: string): string {
  const currency = land === "CH" ? "CHF" : "EUR";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function RecipientViewClient({
  token,
  doc,
  pdfUrl,
  firmenname,
  firmenAdresse,
  firmenTelefon,
  logoUrl,
  firmenLand,
}: Props) {
  const [signaturePath, setSignaturePath] = useState("");
  const [signed, setSigned] = useState(doc.status === "angenommen");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = doc.typ === "offerte" ? "Offerte" : "Rechnung";
  const isOfferte = doc.typ === "offerte";
  const canSign = isOfferte && doc.status === "gesendet" && !signed;

  const handleSign = useCallback(async () => {
    if (!signaturePath || signing) return;
    setSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/public/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Senden.");
      } else {
        setSigned(true);
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es nochmal.");
    } finally {
      setSigning(false);
    }
  }, [token, signaturePath, signing]);

  const initials = firmenname
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F2EE",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1A1916",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(245,242,238,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(26,25,22,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            padding: "0 20px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "13px", color: "#6B6760", minWidth: 0 }}>
            <span style={{ fontWeight: 500, color: "#1A1916" }}>{label}</span>
            {" von "}
            <strong>{firmenname}</strong>
            {" an "}
            <strong>{doc.kundenname}</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={`${doc.nummer}.pdf`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#1A1916",
                  background: "rgba(26,25,22,0.06)",
                  border: "1px solid rgba(26,25,22,0.09)",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 2v6m0 0L4 6m2.5 2L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 10h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                PDF
              </a>
            )}
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "#6B6760",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "14px" }}>←</span>
              <span
                style={{
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#1A1916",
                }}
              >
                offert<em style={{ fontStyle: "italic", color: "#C8793D" }}>io</em>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Document paper */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "24px 16px 60px" }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 2px 24px rgba(26,25,22,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Document header */}
          <div
            style={{
              padding: "32px 36px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "24px",
              borderBottom: "1px solid rgba(26,25,22,0.06)",
            }}
          >
            <div>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={firmenname}
                  style={{ height: "36px", width: "auto", objectFit: "contain", marginBottom: "10px" }}
                />
              ) : (
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#C8793D",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "10px",
                  }}
                >
                  {initials || "?"}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{firmenname}</div>
              {firmenAdresse && (
                <div style={{ fontSize: "12px", color: "#6B6760", marginTop: "2px" }}>{firmenAdresse}</div>
              )}
              {firmenTelefon && (
                <div style={{ fontSize: "12px", color: "#6B6760" }}>{firmenTelefon}</div>
              )}
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#1A1916",
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: "13px", color: "#6B6760", marginTop: "2px" }}>{doc.nummer}</div>
              <table style={{ marginTop: "10px", fontSize: "12px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#9E9A94", paddingRight: "12px", paddingBottom: "2px" }}>Datum</td>
                    <td style={{ fontWeight: 500 }}>{fmtDate(doc.datum)}</td>
                  </tr>
                  {doc.objekt && (
                    <tr>
                      <td style={{ color: "#9E9A94", paddingRight: "12px", paddingBottom: "2px" }}>Objekt</td>
                      <td style={{ fontWeight: 500 }}>{doc.objekt}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* To block */}
          <div style={{ padding: "20px 36px", borderBottom: "1px solid rgba(26,25,22,0.06)" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", color: "#9E9A94", textTransform: "uppercase", marginBottom: "6px" }}>
              An
            </div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>{doc.kundenname}</div>
          </div>

          {/* PDF embed — primary content view */}
          {pdfUrl && (
            <div style={{ padding: "0 36px 28px" }}>
              <div style={{ paddingTop: "20px", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "#9E9A94", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Dokument
                </span>
              </div>
              <div
                style={{
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid rgba(26,25,22,0.08)",
                  background: "#F5F2EE",
                }}
              >
                <object
                  data={pdfUrl}
                  type="application/pdf"
                  style={{ display: "block", width: "100%", height: "600px" }}
                  aria-label={`${label} ${doc.nummer} als PDF`}
                >
                  <div style={{ padding: "32px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "#6B6760", marginBottom: "12px" }}>
                      PDF-Vorschau nicht verfügbar.
                    </p>
                    <a
                      href={pdfUrl}
                      download={`${doc.nummer}.pdf`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        background: "#C8793D",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "13px",
                        textDecoration: "none",
                      }}
                    >
                      PDF herunterladen
                    </a>
                  </div>
                </object>
              </div>
            </div>
          )}

          {/* Totals summary */}
          <div
            style={{
              padding: "16px 36px 20px",
              borderTop: "1px solid rgba(26,25,22,0.06)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ fontSize: "14px" }}>
              <span style={{ color: "#6B6760", marginRight: "16px" }}>Gesamtbetrag</span>
              <span style={{ fontWeight: 700, fontSize: "18px" }}>
                {fmtCurrency(doc.betrag, firmenLand)}
              </span>
            </div>
          </div>

          {/* Sign block — only for offerte in "gesendet" status */}
          {isOfferte && (
            <div
              style={{
                margin: "0 24px 28px",
                borderRadius: "12px",
                padding: "28px",
                background: signed ? "rgba(34,197,94,0.05)" : "rgba(200,121,61,0.04)",
                border: `1px solid ${signed ? "rgba(34,197,94,0.15)" : "rgba(200,121,61,0.12)"}`,
              }}
            >
              {signed ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "rgba(34,197,94,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 14px",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M5 11l5 5 7-9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "17px", marginBottom: "8px" }}>
                    Angenommen — danke!
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B6760", lineHeight: 1.6 }}>
                    <strong>{firmenname}</strong> wurde benachrichtigt. Sie erhalten in Kürze eine Auftragsbestätigung.
                  </div>
                </div>
              ) : canSign ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>
                    Offerte annehmen
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B6760", marginBottom: "20px", lineHeight: 1.6 }}>
                    Unterschreiben Sie unten. {firmenname} erhält direkt eine Bestätigung.
                  </div>

                  <SignPad
                    onDraw={setSignaturePath}
                    onClear={() => setSignaturePath("")}
                  />

                  {error && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        fontSize: "13px",
                        color: "#dc2626",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={!signaturePath || signing}
                      onClick={handleSign}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "11px 24px",
                        borderRadius: "10px",
                        border: "none",
                        background: signaturePath && !signing ? "#C8793D" : "rgba(26,25,22,0.1)",
                        color: signaturePath && !signing ? "#fff" : "rgba(26,25,22,0.3)",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: signaturePath && !signing ? "pointer" : "not-allowed",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {signing ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                            <path d="M7 1v2M7 11v2M1 7h2m8 0h2M3.05 3.05l1.41 1.41M9.54 9.54l1.41 1.41M3.05 10.95l1.41-1.41M9.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Wird gesendet…
                        </>
                      ) : (
                        <>
                          Offerte annehmen
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M2.5 7l3.5 3.5 5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ marginTop: "14px", fontSize: "11px", color: "#9E9A94", lineHeight: 1.7 }}>
                    Mit Klick auf „Offerte annehmen" erteilen Sie verbindlich den Auftrag gemäss dieser Offerte. Eine Kopie wird Ihnen per E-Mail zugestellt.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "13px", color: "#6B6760", textAlign: "center", padding: "8px 0" }}>
                  {doc.status === "abgelaufen"
                    ? "Diese Offerte ist abgelaufen."
                    : doc.status === "entwurf"
                    ? "Diese Offerte wurde noch nicht freigegeben."
                    : "Diese Offerte wurde bereits bearbeitet."}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: "16px 36px",
              borderTop: "1px solid rgba(26,25,22,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "#9E9A94",
            }}
          >
            <div>{firmenname}</div>
            <div>
              Erstellt mit{" "}
              <strong style={{ color: "#1A1916" }}>
                offert<em style={{ fontStyle: "italic", color: "#C8793D" }}>io</em>
              </strong>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
