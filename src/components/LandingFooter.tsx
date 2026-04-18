"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const legal = [
  { label: "Impressum", href: "/impressum" },
  { label: "Datenschutz", href: "/datenschutz" },
  { label: "AGB", href: "/agb" },
];

export default function LandingFooter() {
  const { landing: t } = useT();

  const nav = [
    { label: t.nav_product, href: "/#produkt" },
    { label: t.nav_how, href: "/#ablauf" },
    { label: t.nav_pricing, href: "/#preise" },
    { label: t.nav_faq, href: "/#faq" },
  ];
  return (
    <footer className="pb-8 pt-4">
      <div className="landing-shell">
        <div
          className="rounded-2xl px-6 py-8 sm:px-8"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-xs"
                  style={{ background: "var(--color-primary)" }}
                >
                  O
                </div>
                <span
                  className="text-base font-bold tracking-[-0.02em]"
                  style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
                >
                  Offertio
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                {t.footer_tag}
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h4
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-soft)" }}
              >
                {t.nav_product}
              </h4>
              <ul className="mt-3 space-y-2">
                {nav.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-150 hover:text-[var(--color-text)]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-soft)" }}
              >
                Rechtliches
              </h4>
              <ul className="mt-3 space-y-2">
                {legal.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-150 hover:text-[var(--color-text)]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom */}
          <div
            className="mt-7 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--color-text-soft)" }}
          >
            <div>{t.footer_meta}</div>
            <div>{t.footer_tag}</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
