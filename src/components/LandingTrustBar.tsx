"use client";

import { motion } from "framer-motion";

const trustItems = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/><rect x="10.5" y="2.5" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/><rect x="2.5" y="10.5" width="5" height="5" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="12" width="2.5" height="2.5" fill="currentColor"/></svg>
    ),
    title: "Swiss QR-Rechnung",
    detail: "QR-IBAN, QRR-Referenz, ISO 20022 — automatisch im PDF.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2.5 15.5l1.2-2.8A6.5 6.5 0 1 1 6.3 15l-3.8 0.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: "WhatsApp-Versand",
    detail: "Ein Tap: Nachricht + PDF-Link im Kunden-Chat.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 9h7M5.5 6h5M5.5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    title: "ZUGFeRD · DACH",
    detail: "Factur-X, §14 UStG, AT UID — ohne dass du es liest.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="5" y="2" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 13.5h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    title: "Mobile-first",
    detail: "PWA, offlinefähig, kein App-Store. Vom Einsatz direkt raus.",
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
