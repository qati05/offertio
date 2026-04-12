"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { TranslationKey } from "@/lib/i18n";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import OfflineBanner from "@/components/OfflineBanner";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import PlanExpiryBanner from "@/components/PlanExpiryBanner";
import { I18nProvider, useT } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { OffertioIcon } from "@/components/OffertioLogo";

/* ── Haptic feedback ─────────────────────────────────────────── */
function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

/* ── Icons — all 16×16, strokeWidth 1.5, optically balanced ── */
const IconOverview = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.75" y="1.75" width="5.25" height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9" y="1.75" width="5.25" height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1.75" y="9" width="5.25" height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9" y="9" width="5.25" height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const IconCreate = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 5.5v5M5.5 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconTemplates = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 2h6.5l3.5 3.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M9.5 2v4h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 8.5h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconDocuments = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 6.5h6M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1.06 1.06M11.74 11.74l1.06 1.06M3.2 12.8l1.06-1.06M11.74 4.26l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconCollapse = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M9.5 3.5L5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 2v1.75M8 12.25V14M2 8h1.75M12.25 8H14M3.64 3.64l1.24 1.24M11.12 11.12l1.24 1.24M3.64 12.36l1.24-1.24M11.12 4.88l1.24-1.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M13.5 10.5a6 6 0 01-8-8 6 6 0 108 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();

  // Focus Mode: hide sidebar + bottom nav during document creation for a distraction-free flow
  const isFocusMode = pathname === "/dokument/neu" || pathname?.startsWith("/dokument/neu?");

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

  const profileFetched = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    async function bootstrap() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          setLoading(false);
          window.location.href = "/login";
          return;
        }

        setUser(currentUser);

        // Fetch profile only once per session — avoids a DB query on every navigation.
        if (!profileFetched.current) {
          profileFetched.current = true;

          // Seed from cache instantly so child pages can read it before Supabase responds.
          try {
            const cached = localStorage.getItem("offertio-profile-cache");
            if (cached) setProfile(JSON.parse(cached) as Profile);
          } catch { /* ignore */ }

          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

          if (profileData) {
            setProfile(profileData as Profile);
            // Cache for instant reads on next navigation / page load.
            try { localStorage.setItem("offertio-profile-cache", JSON.stringify(profileData)); } catch { /* ignore quota */ }
          }

          const onOnboarding = pathname === "/onboarding";

          if (!profileData?.onboarding_complete && !onOnboarding) {
            router.replace("/onboarding");
          } else if (profileData?.onboarding_complete && onOnboarding) {
            router.replace("/dashboard");
          }
        }
      } catch {
        // Auth or profile fetch failed (network/Supabase outage).
        // Fall through to clear loading — the app renders in a degraded state
        // and OfflineBanner will inform the user about connectivity.
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — auth.getUser() is cached by the Supabase client
          // so re-running on every pathname change is unnecessary and adds latency.

  async function handleLogout() {
    try {
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
    } catch {
      // Sign-out failed — redirect to login anyway to clear client state
    }
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
          <div style={{ animation: "pulse-brand 2s ease-in-out infinite" }}>
            <OffertioIcon size={40} />
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

      {/* ── Desktop Sidebar (hidden in Focus Mode) ─────── */}
      <AnimatePresence initial={false}>
      {!isFocusMode && (
      <motion.aside
        key="sidebar"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarWidth, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
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
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="shrink-0">
              <OffertioIcon size={30} />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: "var(--app-text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  offert<em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--color-primary)" }}>io</em>
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
        <nav className="flex-1 px-2 pt-3 space-y-0.5" role="navigation">
          {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                title={collapsed ? t(labelKey) : undefined}
                style={collapsed ? { justifyContent: "center", padding: "12px", minHeight: "44px" } : undefined}
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
            style={collapsed ? { justifyContent: "center", padding: "12px", minHeight: "44px" } : undefined}
            title={collapsed ? (theme === "light" ? "Nachtmodus" : "Tagmodus") : undefined}
          >
            {theme === "light" ? <IconMoon /> : <IconSun />}
            {!collapsed && <span>{theme === "light" ? "Nachtmodus" : "Tagmodus"}</span>}
          </button>

          {/* User section */}
          <div className={`flex items-center ${collapsed ? "justify-center px-1 py-2" : "gap-2.5 px-3 py-2"}`}>
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-white text-[10px] font-bold shrink-0"
              style={{ background: "var(--color-primary)" }}
            >
              {initial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div
                  className="text-[11px] truncate"
                  style={{ color: "var(--sidebar-text)", letterSpacing: "-0.01em" }}
                >
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-medium mt-0.5 transition-colors duration-150"
                  style={{ color: "var(--sidebar-text)", letterSpacing: "-0.01em" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sidebar-text)")}
                >
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
      )}
      </AnimatePresence>

      {/* ── Main Content ───────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto md:pb-0"
        style={{
          background: "var(--app-bg)",
          paddingBottom: isFocusMode ? "0" : "calc(60px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {profile && <PlanExpiryBanner profile={profile} />}
        {children}
      </main>

      {/* ── Mobile Bottom Tab Bar (hidden in Focus Mode) ── */}
      <AnimatePresence initial={false}>
        {!isFocusMode && (
          <motion.nav
            key="bottom-nav"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="app-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch"
            style={{
              height: "calc(60px + env(safe-area-inset-bottom, 0px))",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            aria-label="Hauptnavigation"
          >
            {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
              const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onClick={() => haptic(8)}
                  className="bottom-nav-item flex flex-col items-center justify-center flex-1 gap-[3px]"
                  style={{
                    color: isActive ? "var(--color-primary)" : "var(--app-text-soft)",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    userSelect: "none",
                    /* Minimum 44pt touch target per Apple HIG */
                    minHeight: 44,
                  }}
                >
                  <div
                    className="bottom-nav-pill"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 28,
                      borderRadius: 14,
                      background: isActive ? "rgba(200,121,61,0.10)" : "transparent",
                      transition: "background 0.15s ease, transform 0.1s ease",
                    }}
                  >
                    <Icon />
                  </div>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                  }}>
                    {t(labelKey)}
                  </span>
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
