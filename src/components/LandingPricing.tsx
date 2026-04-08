"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics";

const freeFeatures = [
  "5 Dokumente pro Monat",
  "Offerten & Rechnungen",
  "PDF-Export",
  "Grundlayout",
];

const proFeatures = [
  "Unbegrenzte Dokumente",
  "Swiss QR-Rechnung",
  "ZUGFeRD für Deutschland",
  "E-Mail & PDF Versand",
  "Eigenes Logo & Branding",
  "Offline-Modus",
  "Vorlagen-Bibliothek",
];

export default function LandingPricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="py-24 sm:py-32" id="preise">
      <div className="landing-shell">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="section-kicker">Preise</div>
          <h2 className="section-title mt-5">
            Starte kostenlos.{" "}
            <span style={{ color: "var(--color-primary)" }}>Wachse mit Pro.</span>
          </h2>
          <p className="section-copy mt-5">
            Erst testen, dann entscheiden. Kein Risiko, keine Kreditkarte.
          </p>

          {/* Toggle */}
          <div
            className="mt-8 inline-flex rounded-xl p-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { label: "Monatlich", val: false },
              { label: "Jährlich", val: true, badge: "2 Monate gratis" },
            ].map(({ label, val, badge }) => (
              <button
                key={label}
                type="button"
                onClick={() => setAnnual(val)}
                className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  background: annual === val ? "rgba(255,255,255,0.08)" : "transparent",
                  color: annual === val ? "var(--color-text)" : "var(--color-text-soft)",
                }}
              >
                {label}
                {badge && annual && val && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(200,121,61,0.12)", color: "var(--color-primary)" }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cards */}
        <div className="mt-12 grid gap-4 lg:grid-cols-2 lg:items-start">

          {/* Free */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-7 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-soft)" }}
            >
              Gratis
            </div>
            <h3
              className="mt-4 text-xl font-bold"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              Zum Reinschnuppern
            </h3>
            <div className="mt-5 flex items-end gap-2">
              <span
                className="text-4xl font-bold leading-none tracking-tight"
                style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
              >
                CHF 0
              </span>
              <span className="mb-0.5 text-sm" style={{ color: "var(--color-text-soft)" }}>/Monat</span>
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Für die ersten echten Einsätze. Ohne Risiko und ohne ein neues System einzuführen.
            </p>

            <ul className="mt-6 space-y-2.5">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text)" }}>
                  <span
                    className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-[10px]"
                    style={{ color: "var(--color-text-soft)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="cta-secondary mt-7 w-full"
              onClick={() => trackCtaClick("pricing_free")}
            >
              Kostenlos starten
            </Link>
          </motion.article>

          {/* Pro */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl p-7 sm:p-8"
            style={{
              background: "rgba(200,121,61,0.04)",
              border: "1px solid rgba(200,121,61,0.16)",
              boxShadow: "0 0 40px rgba(200,121,61,0.06)",
            }}
          >
            {/* Pro badge */}
            <div
              className="absolute right-6 top-6 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              Pro
            </div>

            <div
              className="inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
            >
              Für wachsende Betriebe
            </div>

            <h3
              className="mt-4 text-xl font-bold"
              style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
            >
              Mehr Volumen, mehr Auftritt
            </h3>

            <div className="mt-5 flex items-end gap-2">
              <span
                className="text-4xl font-bold leading-none tracking-tight"
                style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}
              >
                CHF {annual ? "20" : "28"}
              </span>
              <span className="mb-0.5 text-sm" style={{ color: "var(--color-text-soft)" }}>/Monat</span>
              {annual && (
                <span
                  className="mb-0.5 text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
                >
                  = CHF 240/Jahr
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Sobald Offertio fester Teil deines Tages wird: mehr Volumen,
              besserer Auftritt und weniger Büro-Backlog.
            </p>

            <ul className="mt-6 space-y-2.5">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text)" }}>
                  <span className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-[10px]" style={{ color: "var(--color-primary)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/login?plan=pro"
              className="cta-primary mt-7 w-full"
              onClick={() => trackCtaClick("pricing_pro")}
            >
              Pro freischalten
            </Link>
          </motion.article>

        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-center text-sm"
          style={{ color: "var(--color-text-soft)" }}
        >
          Keine Kreditkarte nötig. Upgrade jederzeit, kündbar monatlich.
        </motion.p>

      </div>
    </section>
  );
}
