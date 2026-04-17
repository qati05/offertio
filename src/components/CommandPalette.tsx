"use client";

/**
 * Command Palette — ⌘K / Ctrl+K power-user navigator.
 *
 * Surfaces the most frequent actions (create document, jump to section,
 * jump to customer) via keyboard. Uses a lightweight fuzzy-score rather
 * than pulling in a search library.
 *
 * Data sources:
 *  - Static commands (create, navigate, logout, theme).
 *  - Recent customers read from localStorage's cached document history
 *    (dokument-history), which is already populated by the dashboard
 *    and documents pages — so opening the palette is zero-latency.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { toCustomerSlug } from "@/lib/customers";
import type { DokumentHistorie } from "@/lib/types";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Aktion" | "Navigation" | "Kunden" | "Konto";
  keywords?: string;
  run: () => void | Promise<void>;
}

/** Lightweight fuzzy score: lower is better; -1 = no match. */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return t.indexOf(q);
  // Subsequence match fallback
  let ti = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return -1;
    ti = idx + 1;
  }
  return 100 + (t.length - q.length);
}

function readCachedHistory(): DokumentHistorie[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("dokument-history") || "[]");
  } catch {
    return [];
  }
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ── Keyboard shortcut: ⌘K / Ctrl+K anywhere in the app ── */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isModK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    function openHandler() { setOpen(true); }
    window.addEventListener("offertio:open-command-palette", openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("offertio:open-command-palette", openHandler);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  /* ── Command set ─────────────────────────────────────── */
  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      {
        id: "new-offerte",
        label: "Neue Offerte",
        hint: "Angebot erstellen",
        group: "Aktion",
        keywords: "angebot neu create quote offer",
        run: () => go("/dokument/neu"),
      },
      {
        id: "new-rechnung",
        label: "Neue Rechnung",
        hint: "Invoice erstellen",
        group: "Aktion",
        keywords: "invoice rechnung neu",
        run: () => go("/dokument/neu?typ=rechnung"),
      },
      {
        id: "nav-dashboard",
        label: "Cockpit",
        group: "Navigation",
        keywords: "dashboard home start übersicht",
        run: () => go("/dashboard"),
      },
      {
        id: "nav-dokumente",
        label: "Alle Dokumente",
        group: "Navigation",
        keywords: "verlauf history archiv",
        run: () => go("/dokumente"),
      },
      {
        id: "nav-vorlagen",
        label: "Vorlagen",
        group: "Navigation",
        keywords: "templates muster",
        run: () => go("/einstellungen/vorlagen"),
      },
      {
        id: "nav-profil",
        label: "Profil & Firma",
        group: "Navigation",
        keywords: "settings einstellungen firma logo iban",
        run: () => go("/einstellungen/profil"),
      },
      {
        id: "toggle-theme",
        label: "Design umschalten",
        hint: "Hell / Dunkel",
        group: "Konto",
        keywords: "dark light theme nachtmodus tagmodus",
        run: () => {
          close();
          const current = document.documentElement.getAttribute("data-theme") || "light";
          const next = current === "light" ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", next);
          try { localStorage.setItem("offertio-theme", next); } catch { /* ignore */ }
        },
      },
      {
        id: "logout",
        label: "Abmelden",
        group: "Konto",
        keywords: "logout signout exit",
        run: async () => {
          close();
          try {
            const supabase = createSupabaseBrowser();
            await supabase.auth.signOut();
          } catch { /* continue to login anyway */ }
          router.replace("/login");
        },
      },
    ];

    // Inject unique recent customers (max 8) as quick-jumps
    const history = readCachedHistory();
    const seen = new Set<string>();
    const customers: Command[] = [];
    for (const doc of history) {
      const name = (doc.kundenname || "").trim();
      if (!name) continue;
      const slug = toCustomerSlug(name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      customers.push({
        id: `customer-${slug}`,
        label: name,
        hint: "Kundenprofil öffnen",
        group: "Kunden",
        keywords: name,
        run: () => go(`/kunden/${encodeURIComponent(slug)}`),
      });
      if (customers.length >= 8) break;
    }

    return [...base, ...customers];
  }, [close, go, router]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return commands;
    return commands
      .map((cmd) => ({
        cmd,
        score: Math.min(
          ...[cmd.label, cmd.keywords ?? ""]
            .map((t) => fuzzyScore(q, t))
            .filter((s) => s !== -1)
            .concat([Infinity]),
        ),
      }))
      .filter(({ score }) => score !== Infinity)
      .sort((a, b) => a.score - b.score)
      .map(({ cmd }) => cmd);
  }, [query, commands]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Scroll selected into view when navigating with arrow keys.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(
      `[data-cmd-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[selectedIdx];
      if (cmd) void cmd.run();
    }
  }

  // Group commands for display (preserve original order)
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filtered) {
      (groups[cmd.group] ||= []).push(cmd);
    }
    return groups;
  }, [filtered]);

  // Flat index → used for keyboard selection
  const flatIndex = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((cmd, i) => map.set(cmd.id, i));
    return map;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(14, 16, 18, 0.42)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "12vh",
          }}
        >
          <motion.div
            key="cmdk-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Befehlspalette"
            style={{
              width: "min(560px, 92vw)",
              maxHeight: "70vh",
              background: "var(--app-card)",
              border: "1px solid var(--app-border)",
              borderRadius: 18,
              boxShadow: "0 18px 60px -12px rgba(0,0,0,0.35)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 18px",
              borderBottom: "1px solid var(--app-border)",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: "var(--app-text-soft)" }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Suche oder tippe einen Befehl…"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--app-text)",
                  fontSize: 15,
                  padding: "2px 0",
                }}
              />
              <kbd style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--app-text-soft)",
                padding: "2px 6px",
                borderRadius: 5,
                border: "1px solid var(--app-border)",
                background: "var(--app-card-muted)",
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} style={{ overflowY: "auto", padding: "8px 0" }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: "32px 18px",
                  textAlign: "center",
                  color: "var(--app-text-muted)",
                  fontSize: 13,
                }}>
                  Keine Befehle gefunden.
                </div>
              ) : (
                Object.entries(grouped).map(([groupName, groupCmds]) => (
                  <div key={groupName}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      color: "var(--app-text-soft)",
                      padding: "8px 18px 4px",
                    }}>
                      {groupName}
                    </div>
                    {groupCmds.map((cmd) => {
                      const idx = flatIndex.get(cmd.id) ?? -1;
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          data-cmd-idx={idx}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          onClick={() => void cmd.run()}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "9px 18px",
                            border: "none",
                            background: isSelected ? "var(--app-card-muted)" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            color: "var(--app-text)",
                            fontSize: 14,
                            lineHeight: 1.4,
                            transition: "background 0.1s ease",
                          }}
                        >
                          <span style={{
                            fontWeight: 500,
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {cmd.label}
                          </span>
                          {cmd.hint && (
                            <span style={{
                              fontSize: 12,
                              color: "var(--app-text-soft)",
                              flexShrink: 0,
                            }}>
                              {cmd.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: "1px solid var(--app-border)",
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--app-text-soft)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span>
                  <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> navigieren
                </span>
                <span>
                  <kbd style={kbdStyle}>↵</kbd> ausführen
                </span>
              </div>
              <span>
                <kbd style={kbdStyle}>⌘K</kbd> schliessen
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const kbdStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  padding: "1px 5px",
  borderRadius: 4,
  border: "1px solid var(--app-border)",
  background: "var(--app-card-muted)",
  fontSize: 10,
  color: "var(--app-text-muted)",
};
