"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import OffertioLogo from "@/components/OffertioLogo";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { trackEmailCapture, trackLoginPageView } from "@/lib/analytics";

type EmailMode = "magic" | "password";

// Single-user installation: there is no sign-up. The account is created once,
// by the owner, in the Supabase dashboard.
const MODE_COPY = {
  title: "Willkommen zurück",
  body: "Melde dich mit deinen Zugangsdaten an und arbeite direkt weiter.",
  button: "Anmelden",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The middleware sends a logged-in stranger here with ?error=not_owner.
  const notOwner = searchParams.get("error") === "not_owner";
  const [emailMode, setEmailMode] = useState<EmailMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(
    notOwner ? "Dieses Konto ist für diese Installation nicht freigeschaltet." : "",
  );

  useEffect(() => {
    trackLoginPageView(document.referrer || "direct");
    void bootstrap();
  }, []);

  function redirectAfterAuth(onboardingComplete: boolean) {
    router.replace(onboardingComplete ? "/dashboard" : "/onboarding");
  }

  async function bootstrap() {
    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();

      redirectAfterAuth(!!profile?.onboarding_complete);
    }
  }

  async function handleMagicLink(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const normalizedEmail = email.trim();

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        // Signing in is not signing up: an unknown address must not become an
        // account. (A convenience only — the real lock is the sign-up switch
        // in the Supabase dashboard plus the owner check in the middleware.)
        shouldCreateUser: false,
      },
    });

    if (authError) {
      setError(`Magic Link fehlgeschlagen: ${authError.message}`);
      setLoading(false);
      return;
    }

    trackEmailCapture("magic");
    setSent(true);
    setLoading(false);
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const normalizedEmail = email.trim();

    const supabase = createSupabaseBrowser();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      setError(`Login fehlgeschlagen: ${authError.message}`);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();

      router.refresh();
      redirectAfterAuth(!!profile?.onboarding_complete);
      return;
    }

    router.refresh();
    router.replace("/dashboard");
    return;
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-container">
          <div className="auth-card animate-flow text-center">
            <OffertioLogo size={36} href={undefined} />
            <div className="auth-check-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="auth-title">Link gesendet</h1>
            <p className="auth-body">
              Wir haben dir einen Login-Link an <strong style={{ color: "var(--app-text)" }}>{email}</strong> gesendet.
              Öffne die E-Mail und klicke auf den Link, um direkt weiterzumachen.
            </p>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--app-text-soft)" }}>
              Falls nichts ankommt, prüfe kurz den Spam-Ordner oder melde dich mit Passwort an.
            </p>
          </div>
        </div>
      </div>
    );
  }

  
  return (
    <div className="auth-shell">
      <div className="auth-container">
        <section className="auth-card animate-flow">
          <div className="text-center">
            <OffertioLogo size={36} href={undefined} />
            <div className="auth-region-badge">CH · DE · AT</div>
            <h1 className="auth-title">{MODE_COPY.title}</h1>
            <p className="auth-body">{MODE_COPY.body}</p>
          </div>

          <form onSubmit={emailMode === "magic" ? handleMagicLink : handlePasswordSubmit} className="mt-5 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="deine@email.ch"
              className="auth-input"
              required
              autoFocus
              autoComplete="email"
            />

            {emailMode !== "magic" && (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Passwort"
                className="auth-input"
                required
              />
            )}

            {success && (
              <div className="auth-alert auth-alert-success">{success}</div>
            )}

            {error && (
              <div className="auth-alert auth-alert-error">{error}</div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Bitte warten..." : emailMode === "magic" ? "Link senden" : MODE_COPY.button}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setEmailMode(emailMode === "magic" ? "password" : "magic");
                setSuccess("");
                setError("");
              }}
              className="auth-link"
            >
              {emailMode === "magic" ? "Zurück zum Passwort-Login" : "Ohne Passwort per Login-Link fortfahren"}
            </button>
          </div>

          {/* §1 of the AGB says registration is the act of acceptance, so the
              terms have to be readable from the screen where that happens —
              §305 Abs. 2 BGB asks for a reasonable opportunity to take notice
              before they become part of the contract. */}
          <div className="auth-footer-links">
            <Link href="/agb">AGB</Link>
            <span style={{ color: "var(--app-border)" }}>·</span>
            <Link href="/datenschutz">Datenschutz</Link>
            <span style={{ color: "var(--app-border)" }}>·</span>
            <Link href="/impressum">Impressum</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
