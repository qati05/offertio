"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
  {
    q: "Kann ich Offerten wirklich per WhatsApp senden?",
    a: "Ja. Ein Tap öffnet WhatsApp mit einer fertigen Nachricht und einem sicheren Link zum PDF. Der Kunde bekommt die Offerte in demselben Chat, in dem er dich kontaktiert hat — nicht im SPAM-Ordner. Der Link ist 7 Tage gültig, genug für die typische Rückmeldung.",
  },
  {
    q: "Wird die Swiss QR-Rechnung richtig erkannt?",
    a: "Ja. Offertio erzeugt den Swiss QR-Code nach ISO 20022 mit QR-IBAN und QRR-Referenz — also genau so, wie ihn alle Schweizer Banken im E-Banking scannen. Kein Einzahlungsschein, kein manuelles Tippen der Referenz.",
  },
  {
    q: "Funktioniert das auch für Deutschland und Österreich?",
    a: "Ja. Für DE erzeugen wir ZUGFeRD 2.3 BASIC (Factur-X) als hybride PDF mit eingebettetem XML — pflichtkonform für die E-Rechnungspflicht. Für AT setzen wir die UID-Schwellen (€400/€10.000) und Pflichtfelder nach §11 öUStG automatisch. Du arbeitest mit einem Profil für alle drei Länder.",
  },
  {
    q: "Was kostet der 14-Tage-Test?",
    a: "Nichts. Keine Kreditkarte, keine automatische Verlängerung. 14 Tage lang alle Pro-Funktionen — danach automatisch Free (5 Dokumente/Monat) oder Upgrade. Du entscheidest, wenn du es real erlebt hast.",
  },
  {
    q: "Brauche ich technisches Wissen?",
    a: "Nein. Wenn du eine WhatsApp-Nachricht schreiben kannst, kannst du Offertio bedienen. Als PWA läuft es direkt im Browser — kein App-Store, keine Installation, kein Training.",
  },
  {
    q: "Muss ich sofort Pro kaufen?",
    a: "Nein. Nach dem 14-Tage-Test kannst du kostenlos weiter mit 5 Dokumenten/Monat arbeiten. Pro ergibt erst Sinn, wenn es fester Teil deines Betriebs wird — das merkst du selbst.",
  },
];

export default function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 sm:py-32" id="faq">
      <div className="landing-shell">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr]">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="section-kicker">FAQ</div>
            <h2 className="section-title mt-5">Häufige Fragen, ehrliche Antworten.</h2>
            <p className="section-copy mt-5 max-w-xs">
              Nah an der Realität kleiner Betriebe. Nicht an Marketing-Wunschdenken.
            </p>
          </motion.div>

          <div className="space-y-2">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <motion.article
                  key={item.q}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden rounded-xl"
                  style={{
                    background: isOpen ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isOpen ? "rgba(200,121,61,0.12)" : "rgba(255,255,255,0.04)"}`,
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span
                      className="text-[15px] font-semibold leading-snug"
                      style={{ color: "var(--color-text)" }}
                    >
                      {item.q}
                    </span>
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-300"
                      style={{
                        background: isOpen ? "var(--color-primary)" : "rgba(255,255,255,0.06)",
                        transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                      }}
                      aria-hidden="true"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M5 2v6M2 5h6"
                          stroke={isOpen ? "white" : "var(--color-text-soft)"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <p className="px-5 pb-4 text-sm leading-7" style={{ color: "var(--color-text-muted)" }}>
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
