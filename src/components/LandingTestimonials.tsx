"use client";

import { motion } from "framer-motion";

const sectors = [
  {
    label: "Handwerk",
    title: "Für Betriebe, die beim Kunden arbeiten.",
    text: "Sanitär, Elektro, Maler oder Serviceeinsätze: Offertio ist für den Moment gebaut, in dem nach dem Termin schnell etwas Sauberes raus muss.",
  },
  {
    label: "Reinigung & Services",
    title: "Für Teams, die nicht im CRM wohnen wollen.",
    text: "Kein schweres System, kein Ballast. Nur ein klarer Workflow für Offerten und Rechnungen, der in Minuten funktioniert.",
  },
  {
    label: "DACH-ready",
    title: "Für CH, DE und AT mit der richtigen Logik.",
    text: "QR-Rechnung, SEPA, ZUGFeRD und Steuerlogik passen sich an, ohne dass der Alltag komplizierter wird.",
  },
];

export default function LandingTestimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="landing-shell">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="section-kicker">Zielgruppen</div>
            <h2 className="section-title mt-5">
              Gemacht für Betriebe,{" "}
              <span style={{ color: "var(--color-primary)" }}>nicht für Software-Abteilungen.</span>
            </h2>
            <p className="section-copy mt-5 max-w-sm">
              Ein gutes Arbeitsinstrument: schnell, professionell und günstiger als Systeme, die nur mitgeschleppt werden.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {["Kein CRM-Dinosaurier", "Direkt nutzbar", "Professionell ohne Aufwand"].map((note) => (
                <span
                  key={note}
                  className="rounded-md px-2.5 py-1.5 text-[11px] font-medium"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--color-text-soft)" }}
                >
                  {note}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="space-y-3">
            {sectors.map((item, i) => (
              <motion.article
                key={item.title}
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
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--color-primary)" }}
                >
                  {item.label}
                </div>
                <h3
                  className="mt-3 text-lg font-bold leading-snug"
                  style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                  {item.text}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
