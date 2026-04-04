"use client";

import { motion } from "framer-motion";

const trustItems = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 11l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Mobile-first",
    detail: "Gebaut für unterwegs, nicht fürs Büro-Backoffice.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    title: "CH, DE, AT",
    detail: "Währung, Steuer und Zahlung passen sich automatisch an.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l5 5 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "QR, SEPA, ZUGFeRD",
    detail: "Echte Standards im Produkt, nicht nur auf der Webseite.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 13l3-8h4l3 8M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "Direkt weitergeben",
    detail: "PDF oder E-Mail. Kein zweiter Büroabend nötig.",
  },
];

export default function LandingTrustBar() {
  return (
    <section className="pb-20 pt-4" id="produkt">
      <div className="landing-shell">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
              >
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {item.title}
                </div>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-muted)" }}>
                  {item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
