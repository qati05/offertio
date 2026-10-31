import { isValidEmail, isValidSwissIBAN, normalizeEmail, stripControlChars } from "@/lib/security";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const PRICE_LIST_MAX_BYTES = 8 * 1024 * 1024;
export const FOUNDER_SETUP_BUCKET = "founder-setup";

export type LogoKind = {
  ext: "png" | "jpg" | "svg";
  mime: "image/png" | "image/jpeg" | "image/svg+xml";
};

export type PriceListKind = {
  ext: "xlsx" | "csv" | "pdf" | "jpg" | "png" | "webp" | "heic";
  mime:
    | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    | "text/csv"
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/heic";
};

export type FounderSetupFields = {
  firmenname: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  iban: string;
  uidMwst: string;
  logoPath: string;
  preislistePath: string;
  submissionId: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function line(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return stripControlChars(value).slice(0, max);
}

export function detectLogo(buf: Buffer): LogoKind | null {
  if (buf.length === 0 || buf.length > LOGO_MAX_BYTES) return null;
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  return detectSvg(buf);
}

function decodeXmlEntities(input: string): string {
  const fromCode = (code: number): string => {
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || code === 0) return "";
    try {
      return String.fromCodePoint(code);
    } catch {
      return "";
    }
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => fromCode(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function svgIsUnsafe(text: string): boolean {
  const decoded = decodeXmlEntities(text).toLowerCase();
  const withoutXmlns = decoded.replace(
    /xmlns(?::[a-z0-9]+)?\s*=\s*["']https?:\/\/www\.w3\.org\/[^"']+["']/g,
    "",
  );
  return (
    decoded.includes("<script") ||
    decoded.includes("<foreignobject") ||
    decoded.includes("<iframe") ||
    decoded.includes("<embed") ||
    decoded.includes("<object") ||
    decoded.includes("<!entity") ||
    decoded.includes("<use") ||
    decoded.includes("<image") ||
    decoded.includes("<set") ||
    decoded.includes("<animate") ||
    decoded.includes("javascript:") ||
    decoded.includes("data:") ||
    /\son[a-z]+\s*=/.test(decoded) ||
    /https?:|\/\//.test(withoutXmlns)
  );
}

function detectSvg(buf: Buffer): LogoKind | null {
  if (buf.length > 1024 * 1024) return null;
  if (buf.includes(0)) return null;
  const text = buf.toString("utf8").trim().replace(/^\uFEFF/, "");
  const head = text.slice(0, 300).toLowerCase();
  if (!head.includes("<svg")) return null;
  if (svgIsUnsafe(text)) return null;
  return { ext: "svg", mime: "image/svg+xml" };
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function isPng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  );
}

function isWebp(buf: Buffer): boolean {
  return buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
}

function isHeic(buf: Buffer): boolean {
  if (buf.length < 12 || buf.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buf.toString("ascii", 8, 12);
  return brand === "heic" || brand === "heix" || brand === "heif" || brand === "mif1" || brand === "msf1";
}

function isPdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

function isXlsx(buf: Buffer): boolean {
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    return false;
  }
  return buf.includes(Buffer.from("[Content_Types].xml"));
}

function isFormulaCell(cell: string): boolean {
  const value = cell.trim().replace(/^"+|"+$/g, "").trim();
  if (!value) return false;
  if (/^[=+@]/.test(value)) return true;
  if (value.startsWith("-") && !/^-\d+([.,]\d+)?$/.test(value)) return true;
  return false;
}

function isCsv(buf: Buffer): boolean {
  if (buf.length === 0 || buf.length > 2 * 1024 * 1024) return false;
  if (buf.includes(0)) return false;
  const text = buf.toString("utf8");
  const sample = text.slice(0, 4000).toLowerCase();
  if (sample.includes("<script") || sample.includes("<html") || sample.includes("<?php") || sample.includes("<svg")) {
    return false;
  }
  for (const line of text.split(/\r\n|\n|\r/)) {
    for (const cell of line.split(/[,;]/)) {
      if (isFormulaCell(cell)) return false;
    }
  }
  return true;
}

export function detectPriceList(buf: Buffer): PriceListKind | null {
  if (buf.length === 0 || buf.length > PRICE_LIST_MAX_BYTES) return null;
  if (isPdf(buf)) return { ext: "pdf", mime: "application/pdf" };
  if (isJpeg(buf)) return { ext: "jpg", mime: "image/jpeg" };
  if (isPng(buf)) return { ext: "png", mime: "image/png" };
  if (isWebp(buf)) return { ext: "webp", mime: "image/webp" };
  if (isHeic(buf)) return { ext: "heic", mime: "image/heic" };
  if (isXlsx(buf)) {
    return {
      ext: "xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  if (isCsv(buf)) return { ext: "csv", mime: "text/csv" };
  return null;
}

export function parseSetupPaths(
  userId: string,
  logoPath: unknown,
  pricePath: unknown,
): { submissionId: string; logoPath: string; preislistePath: string } | null {
  if (typeof logoPath !== "string" || typeof pricePath !== "string") return null;
  if (!UUID_RE.test(userId)) return null;
  if (logoPath.includes("..") || pricePath.includes("..")) return null;
  if (logoPath.includes("\\") || pricePath.includes("\\")) return null;

  const logoMatch = new RegExp(
    `^${userId}/([0-9a-f-]{36})/logo\\.(png|jpg|svg)$`,
    "i",
  ).exec(logoPath);
  const priceMatch = new RegExp(
    `^${userId}/([0-9a-f-]{36})/preisliste\\.(xlsx|csv|pdf|jpg|png|webp|heic)$`,
    "i",
  ).exec(pricePath);
  if (!logoMatch || !priceMatch) return null;
  if (logoMatch[1].toLowerCase() !== priceMatch[1].toLowerCase()) return null;
  if (!UUID_RE.test(logoMatch[1])) return null;

  return {
    submissionId: logoMatch[1].toLowerCase(),
    logoPath,
    preislistePath: pricePath,
  };
}

export function parseFounderSetupPayload(
  body: unknown,
  userId: string,
): { ok: true; fields: FounderSetupFields } | { ok: false; error: string } {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "Ungültige Angaben." };

  const paths = parseSetupPaths(userId, record.logoPath, record.preislistePath);
  if (!paths) return { ok: false, error: "Die Dateien konnten nicht zugeordnet werden." };

  const firmenname = line(record.firmenname, 200);
  const adresse = line(record.adresse, 300);
  const plz = line(record.plz, 10);
  const ort = line(record.ort, 120);
  const telefon = line(record.telefon, 40);
  const emailRaw = line(record.email, 200);
  const ibanRaw = line(record.iban, 42).replace(/\s/g, "").toUpperCase();
  const uidMwst = line(record.uidMwst, 40);

  if (!firmenname || !adresse || !plz || !ort || !emailRaw) {
    return { ok: false, error: "Bitte füllen Sie Firmenname, Adresse, PLZ, Ort und E-Mail aus." };
  }
  if (!/^\d{4}$/.test(plz)) {
    return { ok: false, error: "Die PLZ muss aus 4 Ziffern bestehen." };
  }
  if (!isValidEmail(emailRaw)) {
    return { ok: false, error: "Die E-Mail-Adresse ist ungültig." };
  }
  if (ibanRaw && !isValidSwissIBAN(ibanRaw)) {
    return { ok: false, error: "Die IBAN ist ungültig. Leer lassen oder eine Schweizer IBAN angeben." };
  }

  return {
    ok: true,
    fields: {
      firmenname,
      adresse,
      plz,
      ort,
      telefon,
      email: normalizeEmail(emailRaw),
      iban: ibanRaw,
      uidMwst,
      ...paths,
    },
  };
}

export function extensionMatches(path: string, ext: string): boolean {
  return path.toLowerCase().endsWith(`.${ext}`);
}
