"use client";

import { motion } from "framer-motion";

const painMoments = [
  {
    time: "17:42",
    label: "Nach dem Einsatz",
    title: "Das Werkzeug ist weg. Der Papierkram beginnt jetzt.",
    copy: "Der Einsatz ist fertig — das Papierzeug beginnt erst. Dieser zweite Arbeitstag frisst die Energie kleiner Betriebe.",
  },
  {
    time: "20:11",
    label: "Am Abend",
    title: "Alles ist da. Nur nicht am selben Ort.",
    copy: "Fotos im Handy, Preise im Kopf, Notizen irgendwo. Die Arbeit ist getan — die Ordnung fehlt.",
  },
  {
    time: "Nächster Tag",
    label: "Am Morgen",
    title: "Der Kunde wartet. Das Dokument noch nicht.",
    copy: "Je länger ein Angebot herumliegt, desto kleiner die Wirkung. Tempo schlägt Perfektion.",
  },
];

export default function LandingPain() {
  return (
    <section className="py-24 sm:py-32">
      <div className="landing-shell">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">

          {/* Left: Sticky context */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="section-kicker">Das Problem</div>
            <h2 className="section-title mt-5">
              Die Arbeit draussen läuft.{" "}
              <span style={{ color: "var(--color-primary)" }}>Die Nacharbeit nicht.</span>
            </h2>
            <p className="section-copy mt-5 max-w-sm">
              Kleine Betriebe verlieren selten wegen schlechter Arbeit — sondern wegen der Zeit danach.
            </p>
          </motion.div>

          {/* Right: Pain cards */}
          <div className="space-y-3">
            {painMoments.map((item, i) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl p-6 sm:p-7"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Left accent */}
                <div
                  className="absolute left-0 top-0 h-full w-[2px]"
                  style={{
                    background: `linear-gradient(180deg, var(--color-primary) 0%, transparent 100%)`,
                    opacity: 0.6 - i * 0.15,
                  }}
                />

                <div className="pl-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-soft)" }}
                    >
                      <span style={{ color: "var(--color-primary)", fontSize: "8px" }}>&#9679;</span>
                      {item.time}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: "var(--color-text-soft)" }}>
                      {item.label}
                    </div>
                  </div>

                  <h3
                    className="mt-4 font-bold"
                    style={{
                      fontSize: "clamp(1.1rem, 2.2vw, 1.25rem)",
                      lineHeight: 1.3,
                      letterSpacing: "-0.02em",
                      color: "var(--color-text)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm" style={{ lineHeight: 1.65, color: "var(--color-text-muted)" }}>
                    {item.copy}
                  </p>
                </div>
              </motion.article>
            ))}

            {/* Transition */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-xl px-5 py-4 text-center"
              style={{ background: "rgba(200,121,61,0.04)", border: "1px solid rgba(200,121,61,0.10)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                Offertio ändert das.
              </p>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
