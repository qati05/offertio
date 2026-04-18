"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";

export default function LandingFaq() {
  const { landing: t } = useT();
  const [open, setOpen] = useState<number | null>(0);
  const items = t.faq;

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
            <h2 className="section-title mt-5">{t.faq_title}</h2>
          </motion.div>

          <div className="space-y-2">
            {items.map((item, i) => {
              const isOpen = open === i;
              const [q, a] = item;
              return (
                <motion.article
                  key={q}
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
                      {q}
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
                          {a}
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
