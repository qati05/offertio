"use client";

import { getCheckoutUrl } from "@/lib/payment";
import type { Profile } from "@/lib/types";

interface Props {
  profile: Profile;
}

/**
 * Shows a non-intrusive banner when:
 * - The subscription has been cancelled (grace period active until plan_expires_at)
 * - The subscription expires within the next 7 days
 *
 * Renders nothing for free users or healthy Pro subscriptions.
 */
export default function PlanExpiryBanner({ profile }: Props) {
  const { plan, plan_cancelled_at, plan_expires_at } = profile;

  // Only relevant for Pro users
  if (plan === "free") return null;
  if (!plan_cancelled_at && !plan_expires_at) return null;

  const now = Date.now();
  const expiresAt = plan_expires_at ? new Date(plan_expires_at).getTime() : null;
  const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

  // Already expired
  if (expiresAt && expiresAt < now) return null;

  const isCancelled = !!plan_cancelled_at;
  const isTrial = !profile.ls_subscription_id;
  const renewUrl = getCheckoutUrl("pro_yearly", profile.email, profile.id);

  // Trial banner — friendly, not alarming
  if (isTrial && daysUntilExpiry !== null) {
    const message =
      daysUntilExpiry <= 1
        ? "Dein Pro-Testlauf endet morgen. Sichere dir jetzt Pro."
        : daysUntilExpiry <= 3
          ? `Noch ${daysUntilExpiry} Tage in deinem Pro-Testlauf.`
          : `Pro-Testlauf aktiv — noch ${daysUntilExpiry} Tage.`;

    return (
      <div
        role="status"
        className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
        style={{
          background: "rgba(200,121,61,0.06)",
          borderBottom: "1px solid rgba(200,121,61,0.12)",
          color: "var(--color-primary)",
        }}
      >
        <span className="font-medium">{message}</span>
        {renewUrl !== "#upgrade" && (
          <a
            href={renewUrl}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            style={{ background: "var(--color-primary)", color: "white" }}
          >
            Pro behalten
          </a>
        )}
      </div>
    );
  }

  // Don't show if expiry is more than 7 days away and not cancelled
  if (!plan_cancelled_at && daysUntilExpiry !== null && daysUntilExpiry > 7) return null;

  const renewLabel = isCancelled ? "Jetzt verlängern" : "Jetzt verlängern";

  let message: string;
  if (isCancelled && daysUntilExpiry !== null) {
    message =
      daysUntilExpiry <= 1
        ? "Dein Pro-Abo läuft morgen ab. Danach wechselst du auf Free."
        : `Dein Pro-Abo ist gekündigt und läuft in ${daysUntilExpiry} Tagen ab.`;
  } else if (daysUntilExpiry !== null) {
    message = `Dein Pro-Abo läuft in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "Tag" : "Tagen"} ab.`;
  } else {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
      style={{
        background: "rgba(185,28,28,0.07)",
        borderBottom: "1px solid rgba(185,28,28,0.15)",
        color: "#b91c1c",
      }}
    >
      <span className="font-medium">{message}</span>
      {renewUrl !== "#upgrade" && (
        <a
          href={renewUrl}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
          style={{ background: "#b91c1c", color: "white" }}
        >
          {renewLabel}
        </a>
      )}
    </div>
  );
}
