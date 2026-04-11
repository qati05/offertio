"use client";

import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3C6.686 3 4 5.686 4 9a6 6 0 0010.83 3.6M14 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Vor Ort erfassen",
    copy: "Kunde, Leistung und Betrag direkt nach dem Termin festhalten. Kein App-Wechsel, keine Zettelwirtschaft.",
    detail: "Vom Handy, beim Kunden",
  },
  {
    n: "02",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7h6M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    title: "Compliance im Hintergrund",
    copy: "Swiss QR-Rechnung, ZUGFeRD, DE/AT-Pflichtfelder — Offertio setzt sie automatisch. Du siehst nur das fertige Dokument.",
    detail: "CH · DE · AT",
  },
  {
    n: "03",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Direkt per WhatsApp raus",
    copy: "WhatsApp, E-Mail oder System-Share — dort, wo du mit deinen Kunden wirklich redest. Ein Tap, fertig.",
    detail: "WhatsApp · E-Mail · Share",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="py-24 sm:py-32" id="ablauf">
      <div className="landing-shell">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="section-kicker">Ablauf</div>
          <h2 className="section-title mt-5">
            Weniger Schritte.{" "}
            <span style={{ color: "var(--color-primary)" }}>Weniger Papierkram.</span>
          </h2>
          <p className="section-copy mt-5">
            Drei Schritte. Kein Training. Kein Setup.
            Direkt loslegen, wo die Information entsteht.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.article
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Step number watermark */}
              <div
                className="absolute right-4 top-3 text-6xl font-bold leading-none select-none"
                style={{ color: "rgba(255,255,255,0.03)", fontFamily: "var(--font-display)" }}
                aria-hidden="true"
              >
                {step.n}
              </div>

              {/* Icon */}
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
              >
                {step.icon}
              </div>

              {/* Detail tag */}
              <div
                className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-soft)" }}
              >
                <span style={{ color: "var(--color-primary)", fontSize: "6px" }}>&#9679;</span>
                {step.detail}
              </div>

              <h3
                className="mt-4 text-lg font-bold leading-snug"
                style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
              >
                {step.title}
              </h3>
              <p className="mt-2.5 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                {step.copy}
              </p>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}
