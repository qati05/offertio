"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import OffertioLogo from "@/components/OffertioLogo";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { trackEmailCapture, trackLoginPageView } from "@/lib/analytics";
import { getCheckoutUrl } from "@/lib/payment";

type EmailMode = "magic" | "password" | "signup";

const MODE_COPY: Record<Exclude<EmailMode, "magic">, { title: string; body: string; button: string }> = {
  signup: {
    title: "Konto erstellen",
    body: "Starte mit E-Mail und Passwort. Alles Weitere richtest du danach im Onboarding ein.",
    button: "Konto erstellen",
  },
  password: {
    title: "Willkommen zurück",
    body: "Melde dich mit deinen Zugangsdaten an und arbeite direkt weiter.",
    button: "Anmelden",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsPro = searchParams.get("plan") === "pro";
  const showGoogleAuth = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [emailMode, setEmailMode] = useState<EmailMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    trackLoginPageView(document.referrer || "direct");
    void bootstrap();
  }, []);

  function redirectAfterAuth(onboardingComplete: boolean, email?: string, userId?: string) {
    if (!onboardingComplete) {
      router.replace(wantsPro ? "/onboarding?plan=pro" : "/onboarding");
      return;
    }
    if (wantsPro) {
      const checkoutUrl = getCheckoutUrl("pro_yearly", email, userId);
      router.replace(checkoutUrl !== "#upgrade" ? checkoutUrl : "/einstellungen/abonnement");
      return;
    }
    router.replace("/dashboard");
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

      redirectAfterAuth(!!profile?.onboarding_complete, user.email, user.id);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (authError) {
      const providerDisabled = authError.message.toLowerCase().includes("provider is not enabled");
      setError(
        providerDisabled
          ? "Google-Login ist in Supabase noch nicht aktiviert. Nutze bitte E-Mail oder aktiviere den Google-Provider im Auth-Dashboard."
          : `Google-Anmeldung fehlgeschlagen: ${authError.message}`,
      );
      setGoogleLoading(false);
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
      options: { emailRedirectTo: `${window.location.origin}/callback` },
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

    if (emailMode === "password") {
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
        redirectAfterAuth(!!profile?.onboarding_complete, user.email, user.id);
        return;
      }

      router.refresh();
      router.replace("/dashboard");
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    });

    if (authError) {
      setError(`Registrierung fehlgeschlagen: ${authError.message}`);
      setLoading(false);
      return;
    }

    const identities = data.user?.identities ?? [];
    if (!data.session && identities.length === 0) {
      setSuccess("");
      setError(
        "Für diese E-Mail existiert wahrscheinlich bereits ein Konto. Nutze Passwort oder Magic Link statt einer neuen Registrierung.",
      );
      setEmailMode("password");
      setPassword("");
      setLoading(false);
      return;
    }

    trackEmailCapture("signup");

    if (data.session) {
      router.refresh();
      router.replace(wantsPro ? "/onboarding?plan=pro" : "/onboarding");
      return;
    }

    setSuccess(
      "Konto erstellt. Prüfe jetzt dein Postfach und bestätige deine E-Mail. Danach geht es automatisch weiter zum Onboarding.",
    );
    setEmailMode("password");
    setPassword("");
    setLoading(false);
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

  const mode = emailMode === "magic" ? MODE_COPY.password : MODE_COPY[emailMode];

  return (
    <div className="auth-shell">
      <div className="auth-container">
        <section className="auth-card animate-flow">
          <div className="text-center">
            <OffertioLogo size={36} href={undefined} />
            {wantsPro ? (
              <div
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)", border: "1px solid rgba(200,121,61,0.2)" }}
              >
                <span>Pro freischalten</span>
                <span style={{ opacity: 0.5 }}>→</span>
                <span>nach dem Login direkt weiter</span>
              </div>
            ) : (
              <div className="auth-region-badge">CH · DE · AT</div>
            )}
            <h1 className="auth-title">{mode.title}</h1>
            <p className="auth-body">{mode.body}</p>
          </div>

          {showGoogleAuth && (
            <div className="mt-8 space-y-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="auth-google-btn"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                {googleLoading ? "Weiterleitung..." : "Mit Google fortfahren"}
              </button>
              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">oder per E-Mail</span>
                <div className="auth-divider-line" />
              </div>
            </div>
          )}

          <div className="auth-tabs">
            {(["signup", "password"] as Exclude<EmailMode, "magic">[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setEmailMode(tab);
                  setPassword("");
                  setError("");
                  setSuccess("");
                }}
                className={`auth-tab ${emailMode === tab ? "auth-tab-active" : ""}`}
              >
                {tab === "signup" ? "Registrieren" : "Anmelden"}
              </button>
            ))}
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
            />

            {emailMode !== "magic" && (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={emailMode === "signup" ? "Passwort mit mindestens 8 Zeichen" : "Passwort"}
                className="auth-input"
                required
                minLength={8}
              />
            )}

            {success && (
              <div className="auth-alert auth-alert-success">{success}</div>
            )}

            {error && (
              <div className="auth-alert auth-alert-error">{error}</div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Bitte warten..." : emailMode === "magic" ? "Link senden" : mode.button}
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

          <div className="auth-footer-links">
            <Link href="/datenschutz">Datenschutz</Link>
            <span style={{ color: "var(--app-border)" }}>·</span>
            <Link href="/impressum">Impressum</Link>
            <span style={{ color: "var(--app-border)" }}>·</span>
            <Link href="/">Zur Landing</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
