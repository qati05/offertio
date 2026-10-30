import { isValidEmail, isValidUUID, stripControlChars } from "@/lib/security";
import { SITE_URL } from "@/lib/site";

/** Transactional sender. The domain must stay getoffertio.ch. */
export const DEFAULT_FROM_EMAIL = "offerte@getoffertio.ch";
export const DEFAULT_FROM_ADDRESS = `Offertio <${DEFAULT_FROM_EMAIL}>`;

export type DocumentEmailKind = "offerte" | "rechnung";

export function resolveFromAddress(
  raw: string | undefined = process.env.RESEND_FROM_EMAIL,
): { ok: true; from: string; email: string } | { ok: false; reason: string } {
  const value = raw?.trim() ?? "";
  if (!value) return { ok: true, from: DEFAULT_FROM_ADDRESS, email: DEFAULT_FROM_EMAIL };

  const match = value.match(/^(?:(.+?)\s*)?<([^<>\s]+@[^<>\s]+)>$|^([^<>\s]+@[^<>\s]+)$/);
  if (!match) return { ok: false, reason: "invalid-from" };
  const email = (match[2] || match[3] || "").toLowerCase();
  if (!email.endsWith("@getoffertio.ch")) return { ok: false, reason: "wrong-domain" };
  const name = stripControlChars(match[1] || "Offertio") || "Offertio";
  return { ok: true, from: `${name} <${email}>`, email };
}

export function renderDocumentEmail(input: {
  kind: DocumentEmailKind;
  nummer: string;
  kundeName?: string | null;
  firmenname?: string | null;
  viewUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const label = input.kind === "offerte" ? "Offerte" : "Rechnung";
  const nummer = stripControlChars(input.nummer);
  const kundeName = input.kundeName ? stripControlChars(input.kundeName) : "";
  const firmenname = input.firmenname ? stripControlChars(input.firmenname) : "";
  const greeting = kundeName ? `Guten Tag ${kundeName}` : "Guten Tag";
  const sender = firmenname || "Offertio";
  const documentLabel = label === "Offerte" ? "unsere Offerte" : "unsere Rechnung";
  const viewLine = input.viewUrl
    ? `Dokument ansehen und PDF herunterladen: ${input.viewUrl}`
    : "Bitte finden Sie das PDF im Anhang.";
  const subject = `${label} ${nummer}${firmenname ? ` — ${firmenname}` : ""}`;
  const text = [
    `${greeting},`,
    "",
    `anbei erhalten Sie ${documentLabel} ${nummer}.`,
    viewLine,
    "",
    "Freundliche Grüsse",
    sender,
  ].join("\n");

  const html = [
    `<p>${escapeHtml(greeting)},</p>`,
    `<p>anbei erhalten Sie <strong>${escapeHtml(label)} ${escapeHtml(nummer)}</strong>.</p>`,
    input.viewUrl
      ? `<p><a href="${escapeHtml(input.viewUrl)}">Dokument ansehen und PDF herunterladen</a></p>`
      : "<p>Bitte finden Sie das PDF im Anhang.</p>",
    `<p>Freundliche Grüsse<br>${escapeHtml(sender)}</p>`,
  ].join("");

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only links we generated ourselves may appear in mail from offerte@. */
export function viewUrlForShareToken(shareToken: string | null | undefined): string | null {
  if (!shareToken || !isValidUUID(shareToken)) return null;
  return `${SITE_URL}/view/${shareToken}`;
}

export function isDocumentEmailKind(value: unknown): value is DocumentEmailKind {
  return value === "offerte" || value === "rechnung";
}

export function canAddressEmail(value: unknown): value is string {
  return typeof value === "string" && isValidEmail(value) && value.length <= 320;
}
