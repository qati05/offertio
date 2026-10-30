import { isValidEmail } from "@/lib/security";

export type OperatorNotice = {
  submissionId: string;
  userId: string;
  firmenname: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  iban: string;
  uidMwst: string;
  submittedAt: string;
  guaranteeStartedAt: string;
  logoPath: string;
  preislistePath: string;
  logoUrl: string | null;
  preislisteUrl: string | null;
};

export type OperatorEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
  idempotencyKey: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function formatZurichTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function fromHeader(raw: string): string {
  if (raw.includes("<")) return raw;
  return `Offertio <${raw}>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#5A5750;">${escapeHtml(label)}</td><td style="padding:4px 0;">${escapeHtml(value) || "-"}</td></tr>`;
}

export function buildOperatorEmail(
  notice: OperatorNotice,
  env: { from: string; to: string },
): OperatorEmail {
  const submitted = formatZurichTimestamp(notice.submittedAt);
  const guarantee = formatZurichTimestamp(notice.guaranteeStartedAt);
  const subject = `Gründer-Unterlagen: ${notice.firmenname}`.replace(/[\r\n]/g, " ").slice(0, 140);
  const lines = [
    `Neue Gründer-Unterlagen für ${notice.firmenname}.`,
    `Dieser Eingang: ${submitted} (Europe/Zurich).`,
    `Erster Eingang, Start der 48-Stunden-Garantie: ${guarantee} (Europe/Zurich).`,
    `E-Mail: ${notice.email}`,
    `Adresse: ${notice.adresse}, ${notice.plz} ${notice.ort}`,
    `Telefon: ${notice.telefon || "-"}`,
    `IBAN: ${notice.iban || "-"}`,
    `UID / MwSt: ${notice.uidMwst || "-"}`,
    `Logo: ${notice.logoUrl || notice.logoPath}`,
    `Preisliste: ${notice.preislisteUrl || notice.preislistePath}`,
    `Konto: ${notice.userId}`,
    `Eingang: ${notice.submissionId}`,
  ];
  const html = [
    `<p>Neue Gründer-Unterlagen für <strong>${escapeHtml(notice.firmenname)}</strong>.</p>`,
    `<p>Dieser Eingang: ${escapeHtml(submitted)} (Europe/Zurich).<br>Erster Eingang, Start der 48-Stunden-Garantie: ${escapeHtml(guarantee)} (Europe/Zurich).</p>`,
    `<table>${[
      row("E-Mail", notice.email),
      row("Adresse", `${notice.adresse}, ${notice.plz} ${notice.ort}`),
      row("Telefon", notice.telefon),
      row("IBAN", notice.iban),
      row("UID / MwSt", notice.uidMwst),
      row("Konto", notice.userId),
      row("Eingang", notice.submissionId),
    ].join("")}</table>`,
    notice.logoUrl
      ? `<p><a href="${escapeHtml(notice.logoUrl)}">Logo herunterladen</a></p>`
      : `<p>Logo-Pfad: ${escapeHtml(notice.logoPath)}</p>`,
    notice.preislisteUrl
      ? `<p><a href="${escapeHtml(notice.preislisteUrl)}">Preisliste herunterladen</a></p>`
      : `<p>Preisliste-Pfad: ${escapeHtml(notice.preislistePath)}</p>`,
  ].join("");

  return {
    from: fromHeader(env.from),
    to: env.to,
    subject,
    html,
    text: lines.join("\n"),
    replyTo: notice.email,
    idempotencyKey: `founder-setup/${notice.submissionId}`,
  };
}

type OperatorMailEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  OPERATOR_EMAIL?: string;
  RESEND_API_BASE_URL?: string;
};

export async function sendOperatorEmail(
  notice: OperatorNotice,
  env: OperatorMailEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    OPERATOR_EMAIL: process.env.OPERATOR_EMAIL,
    RESEND_API_BASE_URL: process.env.RESEND_API_BASE_URL,
  },
  fetchImpl: typeof fetch = fetch,
): Promise<{ sent: boolean }> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM_EMAIL?.trim();
  const to = env.OPERATOR_EMAIL?.trim();
  if (!apiKey || !from || !to || !isValidEmail(to)) return { sent: false };

  const email = buildOperatorEmail(notice, { from, to });
  const base = (env.RESEND_API_BASE_URL?.trim() || "https://api.resend.com").replace(/\/+$/, "");
  try {
    const response = await fetchImpl(`${base}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.replyTo,
      }),
    });
    return { sent: response.ok };
  } catch {
    return { sent: false };
  }
}
