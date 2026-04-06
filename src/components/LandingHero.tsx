"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { trackCtaClick } from "@/lib/analytics";

const proofPoints = [
  "QR, SEPA & DACH-Standards",
  "CH, DE, AT ready",
  "In unter 3 Min. einsatzbereit",
];

const DOCS = [
  { nr: "OF-2026-019", kunde: "Baumann Elektro AG", betrag: "CHF 2'340.00", status: "Gesendet", statusColor: "#A8622E", statusBg: "rgba(200,121,61,0.08)", typ: "OF" },
  { nr: "RG-2026-018", kunde: "Müller Haustechnik", betrag: "CHF 1'378.80", status: "Bezahlt", statusColor: "#1A7F42", statusBg: "rgba(26,127,66,0.08)", typ: "RG" },
  { nr: "OF-2026-017", kunde: "Schneider Garten", betrag: "CHF 890.00", status: "Entwurf", statusColor: "#6b7280", statusBg: "rgba(107,114,128,0.06)", typ: "OF" },
];

const NAV_ITEMS = [
  { label: "Übersicht", id: "dashboard", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { label: "Dokumente", id: "docs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Einstellungen", id: "settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const CUSTOMER = "Baumann Elektro AG";
// 0=dashboard, 1=form-open, 2=typing, 3=positions, 4=sending, 5=success
const STEP_DURATIONS = [3800, 900, 2600, 2000, 1400, 2200];

const sceneV = {
  initial: { opacity: 0, y: 7 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -7, transition: { duration: 0.18 } },
};

// ─── Scene 0: Dashboard ───────────────────────────────────────────────────────

function DashboardScene({ highlight }: { highlight: boolean }) {
  return (
    <motion.div variants={sceneV} initial="initial" animate="animate" exit="exit" className="p-4">
      <div className="flex items-start justify-between mb-3.5">
        <div>
          <div className="text-[10px]" style={{ color: "#7A756C" }}>Guten Tag, Muster GmbH</div>
          <div className="text-sm font-bold tracking-tight" style={{ color: "#1A1916", fontFamily: "var(--font-display)" }}>Übersicht</div>
        </div>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "var(--color-primary)" }}>M</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3.5">
        <motion.div
          animate={highlight ? { scale: [1, 0.95, 1], boxShadow: ["0 4px 12px rgba(200,121,61,0.25)", "0 2px 6px rgba(200,121,61,0.50)", "0 4px 12px rgba(200,121,61,0.25)"] } : {}}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="rounded-xl p-3 cursor-pointer"
          style={{ background: "var(--color-primary)", boxShadow: "0 4px 12px rgba(200,121,61,0.25)" }}
        >
          <div className="text-[9px] font-medium text-white/75">Neues Dokument</div>
          <div className="mt-0.5 text-[11px] font-bold text-white">Neue Offerte</div>
        </motion.div>
        <div className="rounded-xl p-3" style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.08)" }}>
          <div className="text-[9px] font-medium" style={{ color: "#7A756C" }}>Neues Dokument</div>
          <div className="mt-0.5 text-[11px] font-bold" style={{ color: "#1A1916" }}>Neue Rechnung</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold" style={{ color: "#1A1916", fontFamily: "var(--font-display)" }}>Letzte Aktivität</div>
          <div className="text-[9px] font-medium" style={{ color: "#A8622E" }}>Alle ansehen</div>
        </div>
        <div className="space-y-1.5">
          {DOCS.map((doc, i) => (
            <motion.div
              key={doc.nr}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.09 }}
              className="flex items-center gap-2.5 rounded-xl p-2.5"
              style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.06)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: doc.typ === "RG" ? "rgba(200,121,61,0.08)" : "rgba(26,25,22,0.04)", color: doc.typ === "RG" ? "#A8622E" : "#5A5750" }}
              >
                {doc.typ}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold truncate" style={{ color: "#1A1916" }}>{doc.kunde}</div>
                <div className="text-[9px]" style={{ color: "#7A756C" }}>{doc.nr}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold tabular-nums" style={{ color: "#1A1916" }}>{doc.betrag}</div>
                <div className="text-[8px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-md inline-block" style={{ color: doc.statusColor, background: doc.statusBg }}>{doc.status}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Scene 1 & 2: Form open + typing ─────────────────────────────────────────

function FormScene({ charCount }: { charCount: number }) {
  const displayed = CUSTOMER.slice(0, charCount);
  const isTyping = charCount < CUSTOMER.length;
  const done = charCount >= CUSTOMER.length;

  return (
    <motion.div variants={sceneV} initial="initial" animate="animate" exit="exit" className="p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="text-[10px] font-medium" style={{ color: "#A8622E" }}>← Dashboard</div>
        <div className="text-[9px]" style={{ color: "#B0AA9E" }}>/</div>
        <div className="text-[10px]" style={{ color: "#7A756C" }}>Neue Offerte</div>
      </div>
      <div className="text-[13px] font-bold mb-3.5" style={{ color: "#1A1916", fontFamily: "var(--font-display)" }}>Neue Offerte</div>

      <div className="space-y-2.5">
        <div>
          <div className="text-[9px] font-semibold mb-1" style={{ color: "#5A5750" }}>Kundenname *</div>
          <div
            className="w-full rounded-lg px-2.5 py-2 text-[11px] font-medium flex items-center"
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${done ? "rgba(26,127,66,0.40)" : "#A8622E"}`,
              color: "#1A1916",
              boxShadow: done ? "0 0 0 3px rgba(26,127,66,0.07)" : "0 0 0 3px rgba(200,121,61,0.08)",
              minHeight: "28px",
            }}
          >
            {charCount === 0 ? (
              <>
                <span style={{ color: "#C0BCB4" }}>Kundennamen eingeben…</span>
                <span className="ml-0.5 animate-pulse" style={{ color: "#A8622E" }}>|</span>
              </>
            ) : (
              <>
                <span>{displayed}</span>
                {isTyping && <span className="ml-0.5 animate-pulse" style={{ color: "#A8622E" }}>|</span>}
                {done && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ml-auto shrink-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#1A7F42" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </motion.span>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <div className="text-[9px] font-semibold mb-1" style={{ color: "#5A5750" }}>E-Mail</div>
          <div className="w-full rounded-lg px-2.5 py-2 text-[11px]" style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.09)", color: "#C0BCB4" }}>
            E-Mail Adresse
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] font-semibold mb-1" style={{ color: "#5A5750" }}>Datum</div>
            <div className="w-full rounded-lg px-2.5 py-2 text-[11px]" style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.09)", color: "#1A1916" }}>04.04.2026</div>
          </div>
          <div>
            <div className="text-[9px] font-semibold mb-1" style={{ color: "#5A5750" }}>Typ</div>
            <div className="w-full rounded-lg px-2.5 py-2 text-[11px]" style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.09)", color: "#1A1916" }}>Offerte</div>
          </div>
        </div>

        {done && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="text-[9px] font-semibold mb-1.5 mt-0.5" style={{ color: "#5A5750" }}>Positionen</div>
            <div className="rounded-lg px-2.5 py-2 text-[10px] font-medium flex items-center gap-1.5 cursor-pointer" style={{ background: "rgba(200,121,61,0.06)", border: "1px dashed rgba(200,121,61,0.25)", color: "#A8622E" }}>
              <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span> Position hinzufügen
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Scene 3: Positions filled ───────────────────────────────────────────────

function PositionsScene() {
  const positions = [
    { desc: "Elektroinstallation", detail: "Pauschale", price: "CHF 2'100.00" },
    { desc: "Material & Teile", detail: "Verbrauchsmaterial", price: "CHF 240.00" },
  ];
  return (
    <motion.div variants={sceneV} initial="initial" animate="animate" exit="exit" className="p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="text-[10px] font-medium" style={{ color: "#A8622E" }}>← Dashboard</div>
        <div className="text-[9px]" style={{ color: "#B0AA9E" }}>/</div>
        <div className="text-[10px]" style={{ color: "#7A756C" }}>Neue Offerte</div>
      </div>

      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-3" style={{ background: "rgba(26,127,66,0.06)", border: "1px solid rgba(26,127,66,0.14)" }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#1A7F42" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div className="text-[10px] font-semibold" style={{ color: "#1A7F42" }}>{CUSTOMER}</div>
      </div>

      <div className="text-[9px] font-semibold mb-1.5" style={{ color: "#5A5750" }}>Positionen</div>
      <div className="space-y-1.5">
        {positions.map((pos, i) => (
          <motion.div
            key={pos.desc}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.16 }}
            className="flex items-center justify-between rounded-xl px-2.5 py-2"
            style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.07)" }}
          >
            <div>
              <div className="text-[10px] font-semibold" style={{ color: "#1A1916" }}>{pos.desc}</div>
              <div className="text-[9px]" style={{ color: "#7A756C" }}>{pos.detail}</div>
            </div>
            <div className="text-[10px] font-bold tabular-nums" style={{ color: "#1A1916" }}>{pos.price}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex justify-between items-center mt-2 pt-2 mb-3"
        style={{ borderTop: "1px solid rgba(26,25,22,0.09)" }}
      >
        <div className="text-[10px] font-bold" style={{ color: "#1A1916" }}>Total</div>
        <div className="text-[12px] font-bold" style={{ color: "#1A1916" }}>CHF 2'340.00</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Scene 4: Sending ─────────────────────────────────────────────────────────

function SendingScene() {
  return (
    <motion.div variants={sceneV} initial="initial" animate="animate" exit="exit" className="p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="text-[10px] font-medium" style={{ color: "#A8622E" }}>← Dashboard</div>
        <div className="text-[9px]" style={{ color: "#B0AA9E" }}>/</div>
        <div className="text-[10px]" style={{ color: "#7A756C" }}>Neue Offerte</div>
      </div>

      <div className="rounded-xl p-3 mb-3" style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,22,0.07)" }}>
        <div className="flex justify-between items-center mb-2">
          <div className="text-[11px] font-bold" style={{ color: "#1A1916" }}>Baumann Elektro AG</div>
          <div className="text-[8px] px-1.5 py-0.5 rounded-md font-semibold" style={{ color: "#6b7280", background: "rgba(107,114,128,0.08)" }}>Entwurf</div>
        </div>
        {[["Elektroinstallation", "CHF 2'100.00"], ["Material & Teile", "CHF 240.00"]].map(([d, p]) => (
          <div key={d} className="flex justify-between text-[9px] mb-0.5" style={{ color: "#7A756C" }}>
            <span>{d}</span><span className="font-medium tabular-nums">{p}</span>
          </div>
        ))}
        <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: "1px solid rgba(26,25,22,0.07)" }}>
          <div className="text-[10px] font-bold" style={{ color: "#1A1916" }}>Total</div>
          <div className="text-[11px] font-bold" style={{ color: "#1A1916" }}>CHF 2'340.00</div>
        </div>
      </div>

      <motion.div
        animate={{
          boxShadow: [
            "0 4px 14px rgba(200,121,61,0.30)",
            "0 6px 28px rgba(200,121,61,0.55)",
            "0 4px 14px rgba(200,121,61,0.30)",
          ],
          scale: [1, 1.015, 1],
        }}
        transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
        className="w-full rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white cursor-pointer"
        style={{ background: "var(--color-primary)" }}
      >
        Offerte senden
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6.5 3L10 6l-3.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </motion.div>

      <div className="mt-2 flex justify-center items-center gap-1" style={{ color: "#A8A39A" }}>
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="5.5" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5.5V4a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.3"/></svg>
        <span className="text-[9px]">PDF wird automatisch generiert</span>
      </div>
    </motion.div>
  );
}

// ─── Scene 5: Success ─────────────────────────────────────────────────────────

function SuccessScene() {
  return (
    <motion.div
      variants={sceneV}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-4 flex flex-col items-center justify-center"
      style={{ minHeight: "300px" }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(26,127,66,0.10)", border: "1.5px solid rgba(26,127,66,0.22)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="#1A7F42"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.25 }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[14px] font-bold text-center"
        style={{ color: "#1A1916", fontFamily: "var(--font-display)" }}
      >
        Offerte gesendet!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-1 text-[10px] text-center"
        style={{ color: "#7A756C" }}
      >
        Baumann Elektro AG · CHF 2'340.00
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.52 }}
        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-semibold"
        style={{ background: "rgba(26,127,66,0.08)", color: "#1A7F42" }}
      >
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M3.5 4.5L6 2l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        PDF per E-Mail versendet
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-semibold"
        style={{ background: "rgba(200,121,61,0.06)", color: "#A8622E" }}
      >
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6 4v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        Erinnerung in 14 Tagen geplant
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingHero() {
  const [step, setStep] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [highlightBtn, setHighlightBtn] = useState(false);

  // Advance steps
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = (step + 1) % STEP_DURATIONS.length;
      setStep(next);
      if (next === 1 || next === 2) setCharCount(0);
      setHighlightBtn(false);
    }, STEP_DURATIONS[step]);

    // Trigger button highlight just before leaving step 0
    if (step === 0) {
      const highlight = setTimeout(() => setHighlightBtn(true), STEP_DURATIONS[0] - 600);
      return () => { clearTimeout(timer); clearTimeout(highlight); };
    }

    return () => clearTimeout(timer);
  }, [step]);

  // Typing effect for step 2
  useEffect(() => {
    if (step !== 2) return;
    if (charCount >= CUSTOMER.length) return;
    const t = setTimeout(() => setCharCount((c) => c + 1), 105);
    return () => clearTimeout(t);
  }, [step, charCount]);

  const isFormStep = step >= 1;
  const activeNav = isFormStep ? "docs" : "dashboard";
  const urlBar = isFormStep ? "offert.io/dokument/neu" : "offert.io/dashboard";

  return (
    <section className="relative min-h-screen pt-24 sm:pt-28 lg:pt-36 pb-16 lg:pb-24 flex items-center">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[800px]"
          style={{ background: "radial-gradient(ellipse, rgba(200,121,61,0.15) 0%, transparent 65%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute top-1/3 -right-40 h-[400px] w-[400px]"
          style={{ background: "radial-gradient(circle, rgba(200,121,61,0.08) 0%, transparent 70%)", filter: "blur(80px)" }}
        />
      </div>

      <div className="landing-shell relative z-10 w-full">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">

          {/* Left: Content */}
          <div className="max-w-xl">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="landing-chip"
            >
              CH · DE · AT
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 font-bold"
              style={{
                fontSize: "clamp(3rem, 6vw, 5.2rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.045em",
                color: "#F0EDE8",
                fontFamily: "var(--font-display)",
              }}
            >
              Vom Einsatz{" "}
              <br />
              zur Offerte.{" "}
              <span style={{ color: "var(--color-primary)" }}>
                In Minuten.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-sm"
              style={{
                fontSize: "1.0625rem",
                lineHeight: 1.65,
                color: "var(--color-text-muted)",
              }}
            >
              Professionelle Offerten und Rechnungen — direkt nach dem Kundentermin, DACH-konform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/login"
                className="cta-primary px-7"
                onClick={() => trackCtaClick("hero_primary")}
              >
                Jetzt kostenlos starten
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-1">
                  <path d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a href="#ablauf" className="cta-secondary px-7">
                So funktioniert es
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mt-8 flex items-center gap-3"
            >
              {/* Stacked avatar initials */}
              <div className="flex -space-x-2">
                {["T", "M", "S", "R"].map((initial, i) => (
                  <div
                    key={i}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2"
                    style={{
                      background: `rgba(200,121,61,${0.5 + i * 0.12})`,
                      ringColor: "transparent",
                      boxShadow: "0 0 0 2px rgba(15,13,11,0.8)",
                    }}
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <div className="text-sm" style={{ color: "var(--color-text-soft)" }}>
                <span className="font-semibold" style={{ color: "var(--color-text)" }}>500+</span>
                {" "}Betriebe im DACH-Raum dabei
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2"
            >
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--color-text-soft)" }}
                >
                  <div className="w-1 h-1 rounded-full" style={{ background: "var(--color-primary)" }} />
                  {point}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Animated Dashboard Demo */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Glow behind */}
            <div
              aria-hidden="true"
              className="absolute inset-4 rounded-3xl blur-[60px] opacity-20"
              style={{ background: "var(--color-primary)" }}
            />

            {/* Browser chrome */}
            <div
              className="relative overflow-hidden"
              role="img"
              aria-label="Offertio Dashboard Vorschau"
              style={{
                borderRadius: "16px",
                background: "#F5F4F0",
                border: "1px solid rgba(200,121,61,0.16)",
                boxShadow: "0 40px 100px rgba(0,0,0,0.38), 0 8px 24px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              {/* Titlebar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(26,25,22,0.07)", background: "#EDECEA" }}>
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
                </div>
                <div className="flex-1 mx-4">
                  <div className="mx-auto max-w-[180px] h-5 rounded-md flex items-center justify-center overflow-hidden" style={{ background: "rgba(26,25,22,0.07)" }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={urlBar}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-[10px] font-medium"
                        style={{ color: "#5A5750" }}
                      >
                        {urlBar}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(26,127,66,0.10)", color: "#1A7F42" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A7F42] animate-pulse inline-block" />
                  Live Demo
                </div>
              </div>

              {/* App layout: sidebar + main */}
              <div className="flex" style={{ minHeight: "340px" }}>

                {/* Sidebar — active state animates */}
                <div className="flex flex-col gap-0.5 p-3 shrink-0" style={{ width: "110px", background: "#EDECEA", borderRight: "1px solid rgba(26,25,22,0.06)" }}>
                  <div className="flex items-center gap-2 px-2 py-2 mb-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: "var(--color-primary)" }}>O</div>
                    <span className="text-[11px] font-bold" style={{ color: "#1A1916", fontFamily: "var(--font-display)" }}>Offertio</span>
                  </div>
                  {NAV_ITEMS.map((item) => {
                    const active = item.id === activeNav;
                    return (
                      <motion.div
                        key={item.label}
                        animate={{
                          background: active ? "rgba(200,121,61,0.10)" : "transparent",
                          color: active ? "#A8622E" : "#5A5750",
                        }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={item.icon} />
                        </svg>
                        {item.label}
                      </motion.div>
                    );
                  })}

                  <div className="mt-auto pt-3">
                    <div className="rounded-lg p-2" style={{ background: "rgba(200,121,61,0.08)", border: "1px solid rgba(200,121,61,0.12)" }}>
                      <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "#A8622E" }}>Free Plan</div>
                      <div className="text-[9px] mt-0.5" style={{ color: "#7A756C" }}>3 von 5 Dok.</div>
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(200,121,61,0.15)" }}>
                        <div className="h-full rounded-full" style={{ width: "60%", background: "var(--color-primary)" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main content — animated scenes */}
                <div className="flex-1 overflow-hidden" style={{ background: "#F5F4F0", position: "relative" }}>
                  <AnimatePresence mode="wait">
                    {step === 0 && <DashboardScene key="dashboard" highlight={highlightBtn} />}
                    {(step === 1) && <FormScene key="form-open" charCount={0} />}
                    {step === 2 && <FormScene key="form-typing" charCount={charCount} />}
                    {step === 3 && <PositionsScene key="positions" />}
                    {step === 4 && <SendingScene key="sending" />}
                    {step === 5 && <SuccessScene key="success" />}
                  </AnimatePresence>
                </div>
              </div>

              {/* Step progress dots */}
              <div className="flex items-center justify-center gap-1.5 py-2.5" style={{ background: "#EDECEA", borderTop: "1px solid rgba(26,25,22,0.06)" }}>
                {STEP_DURATIONS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === step ? "18px" : "5px",
                      background: i === step ? "#A8622E" : "rgba(26,25,22,0.15)",
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ height: "5px", borderRadius: "3px" }}
                  />
                ))}
              </div>
            </div>

            {/* Floating notification — green */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -right-2 sm:-right-5 top-16 hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(250,250,247,0.97)",
                border: "1px solid rgba(26,127,66,0.18)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
              }}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(26,127,66,0.10)", color: "#1A7F42" }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold" style={{ color: "#1A1916" }}>Rechnung bezahlt</div>
                <div className="text-[9px]" style={{ color: "#7A756C" }}>Müller Haustechnik</div>
              </div>
            </motion.div>

            {/* Floating notification — orange */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -left-2 sm:-left-5 bottom-16 hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(250,250,247,0.97)",
                border: "1px solid rgba(200,121,61,0.18)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
              }}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(200,121,61,0.10)", color: "#A8622E" }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M3.5 4.5L6 2l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold" style={{ color: "#1A1916" }}>PDF gesendet</div>
                <div className="text-[9px]" style={{ color: "#7A756C" }}>Baumann Elektro AG</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
