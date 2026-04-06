"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Ich erstell die Offerte noch beim Kunden — bevor ich ins Auto steige. Früher hab ich das abends gemacht und dann meistens zu spät abgeschickt.",
    name: "Thomas B.",
    role: "Inhaber",
    company: "Sanitär Baumann",
    location: "Zürich, CH",
    initial: "T",
    accent: "rgba(200,121,61,0.12)",
  },
  {
    quote: "Rechnung raus, QR-Code dran, fertig. Kein Excel mehr, kein Nachhaken beim Steuerberater wegen ZUGFeRD. Das läuft einfach sauber.",
    name: "Markus H.",
    role: "Geschäftsführer",
    company: "Elektro Huber GmbH",
    location: "München, DE",
    initial: "M",
    accent: "rgba(200,121,61,0.08)",
  },
  {
    quote: "Meine Kunden fragen mich immer, wie ich die Rechnung so schnell rausschick. Das macht einfach einen anderen Eindruck als eine Word-Datei.",
    name: "Sandra K.",
    role: "Selbstständig",
    company: "Gebäudereinigung Kals",
    location: "Wien, AT",
    initial: "S",
    accent: "rgba(200,121,61,0.06)",
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
            <div className="section-kicker">Stimmen</div>
            <h2 className="section-title mt-5">
              Was Betriebe{" "}
              <span style={{ color: "var(--color-primary)" }}>wirklich sagen.</span>
            </h2>
            <p className="section-copy mt-5 max-w-sm">
              Keine Software-Abteilung. Kein IT-Kurs. Nur Handwerker, Dienstleister und Teams, die ihren Papierkram endlich im Griff haben.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {["CH · DE · AT", "Kein Onboarding nötig", "Direkt produktiv"].map((note) => (
                <span
                  key={note}
                  className="rounded-md px-2.5 py-1.5 text-[11px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--color-text-soft)",
                  }}
                >
                  {note}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="space-y-3">
            {testimonials.map((t, i) => (
              <motion.article
                key={t.name}
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
                {/* Quote mark */}
                <div
                  className="mb-4 text-3xl leading-none font-serif select-none"
                  style={{ color: "var(--color-primary)", opacity: 0.5 }}
                  aria-hidden="true"
                >
                  &ldquo;
                </div>

                <p
                  className="text-base leading-7"
                  style={{ color: "var(--color-text)", fontStyle: "italic" }}
                >
                  {t.quote}
                </p>

                {/* Attribution */}
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: `var(--color-primary)`, opacity: 0.85 }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold leading-snug"
                      style={{ color: "var(--color-text)" }}
                    >
                      {t.name} · {t.role}, {t.company}
                    </div>
                    <div
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--color-text-soft)" }}
                    >
                      {t.location}
                    </div>
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
