"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics";

export default function LandingCta() {
  return (
    <section className="pb-24 pt-8 sm:pb-32">
      <div className="landing-shell">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl px-7 py-12 sm:px-12 sm:py-16"
          style={{
            background: "rgba(200,121,61,0.04)",
            border: "1px solid rgba(200,121,61,0.12)",
          }}
        >
          {/* Background glows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px]"
            style={{ background: "rgba(200,121,61,0.12)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-[60px]"
            style={{ background: "rgba(200,121,61,0.06)" }}
          />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="section-kicker">Bereit?</div>
              <h2
                className="mt-5 leading-[1.06] tracking-[-0.03em] font-bold"
                style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.8rem)", color: "var(--color-text)", fontFamily: "var(--font-display)" }}
              >
                14 Tage Pro gratis.{" "}
                <span style={{ color: "var(--color-primary)" }}>
                  Ohne Kreditkarte.
                </span>
              </h2>
              <p className="section-copy mt-4 max-w-lg">
                Swiss QR-Rechnung, ZUGFeRD und WhatsApp-Versand — zwei Wochen lang
                im echten Alltag testen. Danach automatisch Free, wenn du nicht upgradest.
              </p>

              {/* Proof */}
              <div className="mt-6 flex flex-wrap gap-4">
                {[
                  "Keine Kreditkarte",
                  "14 Tage alles drin",
                  "In 2 Min. bereit",
                ].map((point) => (
                  <div
                    key={point}
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: "var(--color-text-soft)" }}
                  >
                    <div className="w-1 h-1 rounded-full" style={{ background: "var(--color-primary)" }} />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col lg:min-w-[180px]">
              <Link
                href="/login"
                className="cta-primary px-7 py-3.5 text-sm"
                onClick={() => trackCtaClick("final_cta_primary")}
              >
                14 Tage gratis testen
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-1">
                  <path d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a href="#preise" className="cta-secondary px-7 py-3.5 text-sm">
                Preise ansehen
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
