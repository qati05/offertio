/**
 * Analytics helper.
 * Supports: Vercel Web Analytics (auto-injected) + GA4 (gtag) + Meta Pixel (fbq) + custom events.
 *
 * Required env vars (set in Vercel dashboard or .env.local):
 *   NEXT_PUBLIC_GA4_MEASUREMENT_ID  — e.g. G-XXXXXXXXXX
 *   NEXT_PUBLIC_META_PIXEL_ID       — e.g. 1234567890123
 */

declare global {
  interface Window {
    va?: (event: string, data?: Record<string, string | number>) => void;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: string, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;

  // Vercel Analytics custom events
  if (window.va) {
    window.va(name, data);
  }

  // GA4 custom events
  if (window.gtag) {
    window.gtag("event", name, data);
  }

  // Meta Pixel custom events
  if (window.fbq) {
    window.fbq("trackCustom", name, data);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${name}`, data);
  }
}

/** CTA click — tracks which button/source triggered the /login navigation. */
export function trackCtaClick(source: string) {
  trackEvent("cta_click", { source });

  // GA4: also fire as a standard "generate_lead" conversion event
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "generate_lead", { source });
  }

  // Meta Pixel: fire InitiateCheckout as a standard conversion signal
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", { content_name: source });
  }
}

/** Email form submission on login page (signup or fallback magic link). */
export function trackEmailCapture(mode: "magic" | "signup") {
  trackEvent("email_capture", { mode });

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "sign_up", { method: mode });
  }

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", { content_name: mode });
  }
}

/** Login page arrival from landing page (fired on /login page mount). */
export function trackLoginPageView(referrer: string) {
  trackEvent("login_page_view", { referrer });
}

/** Document creation events. */
export function trackDocumentCreated(typ: "offerte" | "rechnung", method: "email" | "download" | "share" | "both") {
  trackEvent("document_created", { typ, method });
}

/** Onboarding completion. */
export function trackOnboardingComplete(land: string, beruf: string) {
  trackEvent("onboarding_complete", { land, beruf });
}

/** Upgrade click. */
export function trackUpgradeClick(source: string) {
  trackEvent("upgrade_click", { source });
}
