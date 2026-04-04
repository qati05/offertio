"use client";

import { motion } from "framer-motion";

const featureGroups = [
  {
    eyebrow: "Erfassung",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 100 12A6 6 0 008 2zM5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Festhalten, was sonst verloren geht.",
    desc: "Kundendaten, Leistung und Kontext bleiben zusammen. Nicht in drei Apps, fünf Chats und einem Kopf voller offener Punkte.",
  },
  {
    eyebrow: "Auftritt",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8h6M5 5.5h4M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    ),
    title: "Ruhig und professionell wirken.",
    desc: "Eigenes Branding, klare PDF-Ausgabe und ein Dokument, das nach Betrieb aussieht, nicht nach Notlösung.",
  },
  {
    eyebrow: "Alltag",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Zeit zurückholen, nicht Features sammeln.",
    desc: "Direkter Versand, saubere Übergabe und weniger Nachziehen am Abend. Genau dort, wo kleine Teams es spüren.",
  },
];

export default function LandingFeatures() {
  return (
    <section className="py-24 sm:py-32">
      <div className="landing-shell">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">

          {/* Left: Sticky label */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="section-kicker">Warum Offertio</div>
            <h2 className="section-title mt-5">
              Nicht mehr Features.{" "}
              <span style={{ color: "var(--color-primary)" }}>Weniger Reibung.</span>
            </h2>
            <p className="section-copy mt-5 max-w-sm">
              Was sich im echten Alltag verändert, zählt mehr als eine lange Feature-Liste.
            </p>

            {/* Trust signal */}
            <div
              className="mt-8 flex items-center gap-3.5 rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(200,121,61,0.10)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2l1.5 3.1L13 5.7l-2.5 2.4.6 3.5L8 9.8l-3.1 1.8.6-3.5L3 5.7l3.5-.6L8 2z"
                    fill="var(--color-primary)" fillOpacity="0.9"/>
                </svg>
              </div>
              <p className="text-sm leading-5" style={{ color: "var(--color-text-muted)" }}>
                <strong style={{ color: "var(--color-text)" }}>Für Handwerk, Reinigung, Service</strong>
                {" "}&mdash; nicht für Software-Abteilungen.
              </p>
            </div>
          </motion.div>

          {/* Right: Feature cards */}
          <div className="space-y-3">
            {featureGroups.map((group, i) => (
              <motion.article
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl p-6 sm:p-7"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="sm:grid sm:grid-cols-[auto_1fr] sm:gap-5 sm:items-start">
                  <div className="mb-3 sm:mb-0">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
                    >
                      {group.icon}
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                        {group.eyebrow}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3
                      className="text-lg font-bold leading-snug"
                      style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
                    >
                      {group.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                      {group.desc}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
