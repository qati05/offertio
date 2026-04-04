"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { TranslationKey } from "@/lib/i18n";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import OfflineBanner from "@/components/OfflineBanner";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { I18nProvider, useT } from "@/lib/i18n";

/* ── Icons ────────────────────────────────────────────── */
const IconOverview = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1.5" y="9.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9.5" y="9.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const IconCreate = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8.5 5.5v6M5.5 8.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconTemplates = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 6h4M5 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="8" y="5.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
  </svg>
);

const IconDocuments = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5.5 6h6M5.5 8.5h6M5.5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path
      d="M8.5 1.5V3M8.5 14v1.5M1.5 8.5H3M14 8.5h1.5M3.55 3.55l1.06 1.06M12.39 12.39l1.06 1.06M3.55 13.45l1.06-1.06M12.39 4.61l1.06-1.06"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    />
  </svg>
);

const IconCollapse = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 2v1.5M7.5 11.5V13M2 7.5h1.5M11.5 7.5H13M3.7 3.7l1.05 1.05M10.25 10.25l1.05 1.05M3.7 11.3l1.05-1.05M10.25 4.75l1.05-1.05" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M12.5 8.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NAV_ITEMS: { href: string; labelKey: TranslationKey; Icon: () => React.ReactElement }[] = [
  { href: "/dashboard",               labelKey: "nav.overview",   Icon: IconOverview },
  { href: "/dokument/neu",            labelKey: "nav.create",     Icon: IconCreate },
  { href: "/dokumente",               labelKey: "nav.documents",  Icon: IconDocuments },
  { href: "/einstellungen/vorlagen",  labelKey: "nav.templates",  Icon: IconTemplates },
  { href: "/einstellungen/profil",    labelKey: "nav.profile",    Icon: IconSettings },
];

/* ── Theme helpers ────────────────────────────────────── */
function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("offertio-theme") as "light" | "dark") || "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("offertio-theme", theme);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </I18nProvider>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);

    const savedCollapsed = localStorage.getItem("offertio-sidebar-collapsed");
    if (savedCollapsed === "true") setCollapsed(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }, [theme]);

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      localStorage.setItem("offertio-sidebar-collapsed", String(!prev));
      return !prev;
    });
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    async function bootstrap() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setLoading(false);
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_complete")
        .eq("id", currentUser.id)
        .maybeSingle();

      const onOnboarding = pathname === "/onboarding";

      if (!profile?.onboarding_complete && !onOnboarding) {
        router.replace("/onboarding");
      } else if (profile?.onboarding_complete && onOnboarding) {
        router.replace("/dashboard");
      }

      setLoading(false);
    }

    bootstrap();
  }, [pathname, router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--app-bg)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
            style={{
              background: "var(--color-primary)",
              boxShadow: "var(--shadow-brand)",
              animation: "pulse-brand 2s ease-in-out infinite",
            }}
          >
            O
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--app-text-muted)" }}>
            {t("nav.loading")}
          </div>
        </motion.div>
      </div>
    );
  }

  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const sidebarWidth = collapsed ? 68 : 232;

  return (
    <div className="flex h-screen overflow-hidden app-body">
      <OfflineBanner />
      <PwaInstallPrompt />

      {/* ── Desktop Sidebar ────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col shrink-0 z-20 overflow-hidden"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo + Collapse */}
        <div className="px-3 pt-4 pb-1 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 min-w-0"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white font-bold text-xs shrink-0"
              style={{ background: "var(--color-primary)" }}
            >
              O
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[15px] font-bold tracking-[-0.02em] overflow-hidden whitespace-nowrap"
                  style={{ color: "var(--app-text)", fontFamily: "var(--font-display)" }}
                >
                  Offertio
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={toggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 shrink-0"
            style={{ color: "var(--sidebar-text)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sidebar-item-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <IconCollapse />
            </motion.span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-4 space-y-0.5" role="navigation">
          {!collapsed && (
            <div
              className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--app-text-soft)" }}
            >
              Workspace
            </div>
          )}

          {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                title={collapsed ? t(labelKey) : undefined}
                style={collapsed ? { justifyContent: "center", padding: "10px" } : undefined}
              >
                <Icon />
                {!collapsed && <span>{t(labelKey)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Theme toggle + User */}
        <div className="px-2 pb-3 space-y-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="sidebar-item w-full"
            style={collapsed ? { justifyContent: "center", padding: "10px" } : undefined}
            title={collapsed ? (theme === "light" ? "Nachtmodus" : "Tagmodus") : undefined}
          >
            {theme === "light" ? <IconMoon /> : <IconSun />}
            {!collapsed && <span>{theme === "light" ? "Nachtmodus" : "Tagmodus"}</span>}
          </button>

          {/* User section */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--app-card)", border: "1px solid var(--app-border)" }}
          >
            <div className={`flex items-center ${collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2.5"}`}>
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[11px] font-bold shrink-0"
                style={{ background: "var(--color-primary)" }}
              >
                {initial}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: "var(--app-text-muted)" }}>
                    {user?.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] font-medium mt-0.5 transition-colors duration-150"
                    style={{ color: "var(--app-text-soft)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-soft)")}
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ── Main Content ───────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto pb-20 md:pb-0"
        style={{ background: "var(--app-bg)" }}
      >
        {children}
      </main>

      {/* ── Mobile Bottom Tab Bar ──────────────────────── */}
      <div
        className="app-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around px-2 py-1.5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
      >
        {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{
                color: isActive ? "var(--color-primary)" : "var(--app-text-soft)",
                background: isActive ? "var(--color-primary-soft)" : "transparent",
                minWidth: "52px",
              }}
            >
              <Icon />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
