"use client";

import { useState, useCallback, useRef } from "react";
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

type Decision = "pending" | "signed" | "rejected";

function initialDecision(status: string): Decision {
  if (status === "angenommen") return "signed";
  if (status === "abgelehnt") return "rejected";
  return "pending";
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
  const [decision, setDecision] = useState<Decision>(initialDecision(doc.status));
  const [submitting, setSubmitting] = useState(false);
  // Synchronous lock — setSubmitting is async, so two rapid clicks in the
  // same event-loop tick would otherwise both pass the `if (submitting)`
  // gate and fire duplicate /sign or /reject requests. A ref toggles
  // synchronously and closes that window.
  const inFlightRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const label = doc.typ === "offerte" ? "Offerte" : "Rechnung";
  const isOfferte = doc.typ === "offerte";
  // Signing is gated behind a flag until legal/consent/email-verify is in place.
  // When disabled, recipients see a "please reply by e-mail" block instead of the SignPad.
  const signingEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNING === "true";
  const canAct = signingEnabled && isOfferte && doc.status === "gesendet" && decision === "pending";

  const handleSign = useCallback(async () => {
    if (!signaturePath || inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature: signaturePath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Senden.");
      } else {
        setDecision("signed");
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es nochmal.");
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [token, signaturePath]);

  const handleReject = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: rejectReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Senden.");
      } else {
        setDecision("rejected");
        setShowReject(false);
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es nochmal.");
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [token, rejectReason]);

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
        <div className="rv-topbar">
          <div className="rv-topbar-label">
            <span style={{ fontWeight: 500, color: "#1A1916" }}>{label}</span>
            {" von "}
            <strong>{firmenname}</strong>
            <span className="rv-topbar-to">
              {" an "}
              <strong>{doc.kundenname}</strong>
            </span>
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
      <div className="rv-paper-wrap">
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 2px 24px rgba(26,25,22,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Document header */}
          <div className="rv-doc-header">
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
          <div className="rv-to-block">
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", color: "#9E9A94", textTransform: "uppercase", marginBottom: "6px" }}>
              An
            </div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>{doc.kundenname}</div>
          </div>

          {/* PDF embed — primary content view */}
          {pdfUrl && (
            <div className="rv-pdf-block">
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
          <div className="rv-totals">
            <span style={{ color: "#6B6760", fontSize: "14px" }}>Gesamtbetrag</span>
            <span style={{ fontWeight: 700, fontSize: "18px", marginLeft: "16px" }}>
              {fmtCurrency(doc.betrag, firmenLand)}
            </span>
          </div>

          {/* Sign / reject block — only for offerte */}
          {isOfferte && (
            <div
              className="rv-sign-block"
              style={{
                borderRadius: "12px",
                background:
                  decision === "signed"
                    ? "rgba(34,197,94,0.05)"
                    : decision === "rejected"
                    ? "rgba(156,163,175,0.05)"
                    : "rgba(200,121,61,0.04)",
                border: `1px solid ${
                  decision === "signed"
                    ? "rgba(34,197,94,0.15)"
                    : decision === "rejected"
                    ? "rgba(156,163,175,0.18)"
                    : "rgba(200,121,61,0.12)"
                }`,
              }}
            >
              {decision === "signed" ? (
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
              ) : decision === "rejected" ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "rgba(156,163,175,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 14px",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M6 6l10 10M16 6L6 16" stroke="#6B6760" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "17px", marginBottom: "8px" }}>
                    Offerte abgelehnt
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B6760", lineHeight: 1.6 }}>
                    <strong>{firmenname}</strong> wurde benachrichtigt.
                  </div>
                </div>
              ) : canAct ? (
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
                      role="alert"
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

                  <div
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowReject((v) => !v);
                        setError(null);
                      }}
                      disabled={submitting}
                      style={{
                        fontSize: "13px",
                        color: "#6B6760",
                        background: "none",
                        border: "none",
                        cursor: submitting ? "not-allowed" : "pointer",
                        padding: "8px 0",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      {showReject ? "Doch annehmen" : "Ablehnen"}
                    </button>

                    <button
                      type="button"
                      disabled={!signaturePath || submitting}
                      onClick={handleSign}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "11px 24px",
                        borderRadius: "10px",
                        border: "none",
                        background: signaturePath && !submitting ? "#C8793D" : "rgba(26,25,22,0.1)",
                        color: signaturePath && !submitting ? "#fff" : "rgba(26,25,22,0.3)",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: signaturePath && !submitting ? "pointer" : "not-allowed",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {submitting ? (
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

                  {showReject && (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "16px",
                        borderRadius: "10px",
                        background: "rgba(26,25,22,0.03)",
                        border: "1px solid rgba(26,25,22,0.08)",
                      }}
                    >
                      <label
                        htmlFor="reject-reason"
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: 600,
                          marginBottom: "8px",
                        }}
                      >
                        Kurze Rückmeldung (optional)
                      </label>
                      <textarea
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value.slice(0, 1000))}
                        placeholder="Zum Beispiel: zu teuer, anderes Angebot gewählt, Termin passt nicht …"
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(26,25,22,0.12)",
                          background: "#fff",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          color: "#1A1916",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleReject}
                          style={{
                            padding: "9px 18px",
                            borderRadius: "8px",
                            border: "1px solid rgba(26,25,22,0.12)",
                            background: submitting ? "rgba(26,25,22,0.05)" : "#fff",
                            color: submitting ? "rgba(26,25,22,0.4)" : "#1A1916",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: submitting ? "not-allowed" : "pointer",
                          }}
                        >
                          {submitting ? "Wird gesendet…" : "Offerte ablehnen"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "14px", fontSize: "11px", color: "#9E9A94", lineHeight: 1.7 }}>
                    Mit Klick auf „Offerte annehmen" erteilen Sie verbindlich den Auftrag gemäss dieser Offerte. Eine Kopie wird Ihnen per E-Mail zugestellt.
                  </div>
                </>
              ) : !signingEnabled && isOfferte && doc.status === "gesendet" ? (
                <div style={{ textAlign: "center", padding: "12px 4px" }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>
                    Angebot prüfen
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B6760", lineHeight: 1.65 }}>
                    Bitte antworten Sie direkt an <strong>{firmenname}</strong>, um das Angebot anzunehmen oder Fragen zu klären.
                  </div>
                </div>
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
          <div className="rv-footer">
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

        .rv-topbar {
          max-width: 760px;
          margin: 0 auto;
          padding: 10px 16px;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .rv-topbar-label {
          font-size: 13px;
          color: #6B6760;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rv-paper-wrap {
          max-width: 760px;
          margin: 0 auto;
          padding: 24px 16px 60px;
        }
        .rv-doc-header {
          padding: 32px 36px 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          border-bottom: 1px solid rgba(26,25,22,0.06);
        }
        .rv-to-block {
          padding: 20px 36px;
          border-bottom: 1px solid rgba(26,25,22,0.06);
        }
        .rv-pdf-block { padding: 0 36px 28px; }
        .rv-totals {
          padding: 16px 36px 20px;
          border-top: 1px solid rgba(26,25,22,0.06);
          display: flex;
          justify-content: flex-end;
        }
        .rv-sign-block {
          margin: 0 24px 28px;
          padding: 28px;
        }
        .rv-footer {
          padding: 16px 36px;
          border-top: 1px solid rgba(26,25,22,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #9E9A94;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .rv-topbar { padding: 8px 14px; gap: 8px; }
          .rv-topbar-label { font-size: 12px; }
          .rv-topbar-to { display: none; }

          .rv-paper-wrap { padding: 16px 12px 48px; }
          .rv-doc-header {
            padding: 20px 18px 16px;
            flex-direction: column;
            gap: 14px;
            align-items: stretch;
          }
          .rv-doc-header > div:last-child { text-align: left !important; }
          .rv-to-block { padding: 14px 18px; }
          .rv-pdf-block { padding: 0 18px 20px; }
          .rv-totals { padding: 14px 18px 18px; justify-content: space-between; align-items: baseline; }
          .rv-sign-block { margin: 0 14px 20px; padding: 18px 16px; }
          .rv-footer { padding: 14px 18px; font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
