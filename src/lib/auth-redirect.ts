/** Where /callback sends the browser after a Supabase session exists. */
export function resolvePostAuthPath(input: {
  type: string | null;
  onboardingComplete: boolean;
}): string {
  if (input.type === "recovery") return "/einstellungen/passwort";
  if (!input.onboardingComplete) return "/onboarding";
  return "/dashboard";
}

export function passwordResetRedirect(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/callback?type=recovery`;
}
