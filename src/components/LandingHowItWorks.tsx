"use client";

import { motion } from "framer-motion";
import { useLang } from "@/components/LangContext";

const stepIcons = [
  <svg key="phone" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="5" y="2" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg key="sign" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 14c2-4 4-6 5-6s1.5 1 2 2c1-2 2-4 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg key="qr" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.4"/><rect x="12" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="12" width="6" height="6" stroke="currentColor" strokeWidth="1.4"/><rect x="13.5" y="13.5" width="2.5" height="2.5" fill="currentColor"/></svg>,
];

const stepDetails = ["CH · DE · AT", "WhatsApp · Push", "QR · SEPA · ZUGFeRD"];
const stepNums = ["01", "02", "03"];

export default function LandingHowItWorks() {
  const { t } = useLang();

  const steps = [
    { title: t.how1_t, copy: t.how1_d },
    { title: t.how2_t, copy: t.how2_d },
    { title: t.how3_t, copy: t.how3_d },
  ];

  return (
    <section className="py-24 sm:py-32" id="ablauf">
      <div className="landing-shell">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="section-kicker">{t.sec_how_eyebrow}</div>
          <h2 className="section-title mt-5">{t.sec_how_title}</h2>
        </motion.div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map((step, i) => (
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
                className="absolute right-4 top-3 text-6xl font-bold leading-none select-none"
                style={{ color: "rgba(255,255,255,0.03)", fontFamily: "var(--font-display)" }}
                aria-hidden="true"
              >
                {stepNums[i]}
              </div>

              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
              >
                {stepIcons[i]}
              </div>

              <div
                className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-soft)" }}
              >
                <span style={{ color: "var(--color-primary)", fontSize: "6px" }}>&#9679;</span>
                {stepDetails[i]}
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
