"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Shortcut = { keys: string[]; label: string };

const SHORTCUTS: Record<string, Shortcut[]> = {
  Navigation: [
    { keys: ["⌘", "K"], label: "Schnellsuche öffnen" },
    { keys: ["G", "D"], label: "Zum Dashboard" },
    { keys: ["G", "L"], label: "Zu den Dokumenten" },
    { keys: ["G", "K"], label: "Zu Kunden" },
  ],
  Erstellen: [
    { keys: ["N"], label: "Neue Offerte" },
    { keys: ["Shift", "N"], label: "Neue Rechnung" },
  ],
  Allgemein: [
    { keys: ["?"], label: "Diese Übersicht" },
    { keys: ["Esc"], label: "Schließen" },
  ],
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Hotkey chords: G-then-D/L/K for navigation, N / Shift+N for create.
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.location.href = e.shiftKey
          ? "/dokument/neu?typ=rechnung"
          : "/dokument/neu";
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="shortcuts-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tastaturkürzel"
        >
          <motion.div
            className="shortcuts-card surface"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shortcuts-header">
              <div className="kicker">Tastaturkürzel</div>
              <button
                type="button"
                className="shortcuts-close"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>
            <div className="shortcuts-groups">
              {Object.entries(SHORTCUTS).map(([group, shortcuts]) => (
                <div key={group} className="shortcuts-group">
                  <div className="shortcuts-group-title">{group}</div>
                  <ul className="shortcuts-list">
                    {shortcuts.map((s) => (
                      <li key={s.label} className="shortcuts-row">
                        <span className="shortcuts-label">{s.label}</span>
                        <span className="shortcuts-keys">
                          {s.keys.map((k, i) => (
                            <kbd key={i} className="shortcuts-kbd">{k}</kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
