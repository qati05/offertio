"use client";

import { motion } from "framer-motion";
import { useLang } from "@/components/LangContext";

const icons = [
  <svg key="clock" width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  <svg key="exit" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8.5 6H5.5a1 1 0 00-1 1v6a1 1 0 001 1h3M12 7l3 3-3 3M15 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  <svg key="warn" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 9v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
];

export default function LandingPain() {
  const { t } = useLang();

  const cards = [
    { title: t.pain1_t, desc: t.pain1_d },
    { title: t.pain2_t, desc: t.pain2_d },
    { title: t.pain3_t, desc: t.pain3_d },
  ];

  return (
    <section id="produkt" className="py-24 sm:py-32">
      <div className="landing-shell">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="section-kicker">{t.sec_pain_eyebrow}</div>
          <h2 className="section-title mt-5">{t.sec_pain_title}</h2>
          <p className="section-copy mt-5">{t.sec_pain_lead}</p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {cards.map((card, i) => (
            <motion.article
              key={i}
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
              <div
                className="absolute left-0 top-0 h-full w-[2px]"
                style={{
                  background: `linear-gradient(180deg, var(--color-primary) 0%, transparent 100%)`,
                  opacity: 0.6 - i * 0.15,
                }}
              />

              <div className="pl-2">
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                  style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
                >
                  {icons[i]}
                </div>
                <h3
                  className="font-bold"
                  style={{
                    fontSize: "clamp(1rem, 2vw, 1.15rem)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.02em",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {card.title}
                </h3>
                <p className="mt-2.5 text-sm" style={{ lineHeight: 1.65, color: "var(--color-text-muted)" }}>
                  {card.desc}
                </p>
              </div>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}
