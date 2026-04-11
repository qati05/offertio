"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics";
import { OffertioIcon } from "@/components/OffertioLogo";

const links = [
  { href: "#produkt", label: "Produkt" },
  { href: "#ablauf",  label: "Ablauf" },
  { href: "#preise",  label: "Preise" },
  { href: "#faq",     label: "FAQ" },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (menuOpen && window.scrollY > 40) closeMenu();
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [closeMenu, menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5"
          style={{
            border: `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
            background: scrolled
              ? "rgba(9,9,11,0.85)"
              : "rgba(9,9,11,0.50)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: scrolled
              ? "0 8px 32px rgba(0,0,0,0.30)"
              : "none",
          }}
        >
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Offertio Startseite"
          >
            <OffertioIcon size={28} theme="dark" />
            <span
              className="text-[15px] tracking-[-0.03em]"
              style={{ color: "#F0EDE8", fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              offert<em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--color-primary)" }}>io</em>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 hover:text-[var(--color-text)] hover:bg-white/[0.04]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/[0.04]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Anmelden
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                background: "var(--color-primary)",
                color: "white",
                boxShadow: "0 2px 12px rgba(200,121,61,0.25)",
              }}
              onClick={() => trackCtaClick("navbar_primary")}
            >
              Kostenlos starten
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Menü schliessen" : "Menü öffnen"}
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg lg:hidden transition-colors duration-200"
            style={{ background: menuOpen ? "rgba(255,255,255,0.08)" : "transparent" }}
          >
            <div className="flex flex-col gap-[5px] items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-[1.5px] w-4 rounded-full transition-all duration-250"
                  style={{
                    background: "var(--color-text-muted)",
                    transform:
                      menuOpen && i === 0 ? "translateY(6.5px) rotate(45deg)" :
                      menuOpen && i === 1 ? "scaleX(0)" :
                      menuOpen && i === 2 ? "translateY(-6.5px) rotate(-45deg)" :
                      "none",
                    opacity: menuOpen && i === 1 ? 0 : 1,
                  }}
                />
              ))}
            </div>
          </button>
        </motion.div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[56px] z-40 rounded-2xl border p-4 lg:hidden"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background: "rgba(9,9,11,0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.40)",
            }}
          >
            <div className="flex flex-col gap-0.5">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-white/[0.04]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="cta-secondary text-center text-sm"
                  onClick={closeMenu}
                >
                  Anmelden
                </Link>
                <Link
                  href="/login"
                  className="cta-primary text-center text-sm"
                  onClick={() => { closeMenu(); trackCtaClick("navbar_mobile_primary"); }}
                >
                  Starten
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
