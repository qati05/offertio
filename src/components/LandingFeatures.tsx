"use client";

import { motion } from "framer-motion";
import { useLang } from "@/components/LangContext";

const featureIcons = [
  <svg key="qr" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.4"/><rect x="12" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="12" width="6" height="6" stroke="currentColor" strokeWidth="1.4"/><rect x="13.5" y="13.5" width="2.5" height="2.5" fill="currentColor"/></svg>,
  <svg key="doc" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6.5 7h7M6.5 10h5M6.5 13h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  <svg key="bank" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6V5a5 5 0 0110 0v1" stroke="currentColor" strokeWidth="1.4"/><path d="M8 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  <svg key="template" width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  <svg key="offline" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10 15a1 1 0 100 2 1 1 0 000-2z" fill="currentColor"/><path d="M6.5 12a5.5 5.5 0 017 0M4 9a9 9 0 0112 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  <svg key="globe" width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 2.5c0 0-3 3-3 7.5s3 7.5 3 7.5M10 2.5c0 0 3 3 3 7.5s-3 7.5-3 7.5M2.5 10h15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
];

export default function LandingFeatures() {
  const { t } = useLang();

  const features = [
    { title: t.f1_t, desc: t.f1_d },
    { title: t.f2_t, desc: t.f2_d },
    { title: t.f3_t, desc: t.f3_d },
    { title: t.f4_t, desc: t.f4_d },
    { title: t.f5_t, desc: t.f5_d },
    { title: t.f6_t, desc: t.f6_d },
  ];

  return (
    <section className="py-24 sm:py-32" style={{ background: "#F5F2EE" }}>
      <div className="landing-shell">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div
            className="section-kicker"
            style={{ color: "rgba(26,25,22,0.45)", background: "rgba(200,121,61,0.08)", border: "1px solid rgba(200,121,61,0.15)" }}
          >
            {t.sec_feat_eyebrow}
          </div>
          <h2
            className="section-title mt-5"
            style={{ color: "#1A1916" }}
          >
            {t.sec_feat_title}
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feat, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(26,25,22,0.07)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                style={{ background: "rgba(200,121,61,0.10)", color: "#A8622E" }}
              >
                {featureIcons[i]}
              </div>
              <h3
                className="font-bold"
                style={{
                  fontSize: "1.0rem",
                  lineHeight: 1.3,
                  letterSpacing: "-0.02em",
                  color: "#1A1916",
                  fontFamily: "var(--font-display)",
                }}
              >
                {feat.title}
              </h3>
              <p className="mt-2 text-sm" style={{ lineHeight: 1.65, color: "#5A5750" }}>
                {feat.desc}
              </p>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}
