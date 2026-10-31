import { SITE_URL } from "@/lib/site";

/** Where /callback sends the browser after a Supabase session exists. */
export function resolvePostAuthPath(input: {
  type: string | null;
  onboardingComplete: boolean;
}): string {
  if (input.type === "recovery") return "/einstellungen/passwort";
  if (!input.onboardingComplete) return "/onboarding";
  return "/dashboard";
}

const LOCAL_RESET_HOSTS = new Set(["localhost", "127.0.0.1"]);

function siteHost(): string {
  try {
    return new URL(SITE_URL).hostname.toLowerCase();
  } catch {
    return "getoffertio.ch";
  }
}

/** Same-origin recovery callback. Unknown hosts fall back to the canonical site. */
export function passwordResetRedirect(origin: string): string {
  const fallback = `${SITE_URL.replace(/\/+$/, "")}/callback?type=recovery`;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return fallback;
  }
  const host = url.hostname.toLowerCase();
  const local = LOCAL_RESET_HOSTS.has(host);
  const allowed = host === "getoffertio.ch" || host === "www.getoffertio.ch" || host === siteHost() || local;
  if (!allowed) return fallback;
  if (!local && url.protocol !== "https:") return fallback;
  return `${url.origin}/callback?type=recovery`;
}
