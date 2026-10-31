/**
 * Validates a Swiss QR-bill payload against SIX Swiss Payment Standards
 * QR-bill Implementation Guidelines v2.3 (SPC version 0200).
 *
 * Structured addresses (type S) are mandatory since 21 November 2025.
 * Combined addresses (type K) are rejected.
 */

const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,8})\.\d{2}$/;

export type SpcIssue = { field: string; message: string };

export function isQrIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (!/^(CH|LI)\d{19}$/.test(clean)) return false;
  const iid = Number(clean.slice(4, 9));
  return iid >= 30000 && iid <= 31999;
}

export function isIbanChecksumValid(iban: string): boolean {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** Modulo-10 recursive check digit used by QRR (Swiss QR reference). */
export function qrReferenceCheckDigit(body26: string): string {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const char of body26) {
    carry = table[(carry + Number(char)) % 10];
  }
  return String((10 - carry) % 10);
}

export function isQrrValid(reference: string): boolean {
  if (!/^\d{27}$/.test(reference)) return false;
  return qrReferenceCheckDigit(reference.slice(0, 26)) === reference.slice(26);
}

/**
 * ISO 11649 creditor reference. The check digits are computed on the
 * remainder of the reference plus "RF00", then 98 minus that remainder.
 */
export function isScorValid(reference: string): boolean {
  const clean = reference.replace(/\s/g, "").toUpperCase();
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(clean)) return false;
  const rearranged = clean.slice(4) + "RF" + clean.slice(2, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

function addressIssues(lines: string[], offset: number, role: "creditor" | "debtor"): SpcIssue[] {
  const issues: SpcIssue[] = [];
  const [type, name, street, building, postal, town, country] = lines.slice(offset, offset + 7);
  const prefix = role;

  if (type === "K") {
    issues.push({
      field: `${prefix}.addressType`,
      message: "Kombinierte Adresse (K) ist seit 21.11.2025 nicht mehr zulässig. Erforderlich ist Typ S.",
    });
    return issues;
  }

  if (type === "") {
    if (role === "creditor") {
      issues.push({ field: `${prefix}.addressType`, message: "Kreditor-Adresstyp fehlt." });
    }
    const rest = [name, street, building, postal, town, country];
    if (rest.some((value) => value !== "")) {
      issues.push({ field: `${prefix}.addressType`, message: "Adressfelder sind gefüllt, obwohl der Adresstyp leer ist." });
    }
    return issues;
  }

  if (type !== "S") {
    issues.push({ field: `${prefix}.addressType`, message: `Adresstyp «${type}» ist nicht zulässig. Erlaubt ist S.` });
    return issues;
  }

  if (!name) issues.push({ field: `${prefix}.name`, message: "Name ist bei Adresstyp S Pflicht." });
  if (name.length > 70) issues.push({ field: `${prefix}.name`, message: "Name darf höchstens 70 Zeichen haben." });
  if (street.length > 70) issues.push({ field: `${prefix}.street`, message: "Strasse darf höchstens 70 Zeichen haben." });
  if (building.length > 16) issues.push({ field: `${prefix}.buildingNumber`, message: "Gebäudenummer darf höchstens 16 Zeichen haben." });
  if (!postal) issues.push({ field: `${prefix}.postalCode`, message: "Postleitzahl ist bei Adresstyp S Pflicht." });
  if (postal.length > 16) issues.push({ field: `${prefix}.postalCode`, message: "Postleitzahl darf höchstens 16 Zeichen haben." });
  if (!town) issues.push({ field: `${prefix}.town`, message: "Ort ist bei Adresstyp S Pflicht." });
  if (town.length > 35) issues.push({ field: `${prefix}.town`, message: "Ort darf höchstens 35 Zeichen haben." });
  if (!/^[A-Z]{2}$/.test(country)) {
    issues.push({ field: `${prefix}.country`, message: "Land muss ein ISO-3166-Alpha-2-Code sein." });
  }

  return issues;
}

/**
 * `payload` is the exact string encoded in the Swiss QR code (LF-separated).
 * A trailing empty element from a final newline is ignored.
 */
export function validateSpcPayload(payload: string): { ok: boolean; issues: SpcIssue[] } {
  const issues: SpcIssue[] = [];
  if (payload.includes("\r")) {
    issues.push({ field: "separator", message: "Zeilenumbruch muss LF sein. CR ist im Payload nicht erlaubt." });
  }

  const rawLines = payload.split("\n");
  const lines = rawLines[rawLines.length - 1] === "" ? rawLines.slice(0, -1) : rawLines;

  if (lines.length < 31) {
    issues.push({ field: "length", message: `Payload hat ${lines.length} Felder, mindestens 31 sind erforderlich.` });
    return { ok: false, issues };
  }

  const [
    qrType,
    version,
    coding,
    iban,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ultimateType,
    ultimateName,
    ultimateStreet,
    ultimateBuilding,
    ultimatePostal,
    ultimateTown,
    ultimateCountry,
    amount,
    currency,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    referenceType,
    reference,
    message,
    trailer,
  ] = lines;

  if (qrType !== "SPC") issues.push({ field: "qrType", message: "QR-Typ muss SPC sein." });
  if (version !== "0200") issues.push({ field: "version", message: "Version muss 0200 sein." });
  if (coding !== "1") issues.push({ field: "coding", message: "Kodierung muss 1 (UTF-8) sein." });

  const cleanIban = iban.replace(/\s/g, "").toUpperCase();
  if (!/^(CH|LI)\d{19}$/.test(cleanIban)) {
    issues.push({ field: "iban", message: "IBAN muss eine 21-stellige CH- oder LI-IBAN ohne Leerzeichen sein." });
  } else if (!isIbanChecksumValid(cleanIban)) {
    issues.push({ field: "iban", message: "IBAN-Prüfziffer (ISO 7064 MOD-97) ist ungültig." });
  }

  issues.push(...addressIssues(lines, 4, "creditor"));

  const ultimate = [ultimateType, ultimateName, ultimateStreet, ultimateBuilding, ultimatePostal, ultimateTown, ultimateCountry];
  if (ultimate.some((value) => value !== "")) {
    issues.push({
      field: "ultimateCreditor",
      message: "Ultimate Creditor muss in Version 0200 leer bleiben.",
    });
  }

  if (amount !== "") {
    if (!AMOUNT_PATTERN.test(amount)) {
      issues.push({ field: "amount", message: "Betrag muss leer oder mit zwei Nachkommastellen und Punkt als Trenner angegeben werden." });
    } else {
      const value = Number(amount);
      if (value < 0.01 || value > 999_999_999.99) {
        issues.push({ field: "amount", message: "Betrag muss zwischen 0.01 und 999999999.99 liegen oder leer sein." });
      }
    }
  }

  if (currency !== "CHF" && currency !== "EUR") {
    issues.push({ field: "currency", message: "Währung muss CHF oder EUR sein." });
  }

  issues.push(...addressIssues(lines, 20, "debtor"));

  const qrIban = isQrIban(cleanIban);
  if (referenceType === "QRR") {
    if (!qrIban) issues.push({ field: "referenceType", message: "QRR ist nur mit einer QR-IBAN (IID 30000–31999) zulässig." });
    if (!isQrrValid(reference)) issues.push({ field: "reference", message: "QRR muss 27 Ziffern mit gültiger Modulo-10-rekursiv-Prüfziffer sein." });
  } else if (referenceType === "SCOR") {
    if (qrIban) issues.push({ field: "referenceType", message: "SCOR ist mit einer QR-IBAN nicht zulässig." });
    if (!isScorValid(reference)) issues.push({ field: "reference", message: "SCOR entspricht nicht ISO 11649." });
  } else if (referenceType === "NON") {
    if (qrIban) issues.push({ field: "referenceType", message: "Ohne Referenz (NON) ist mit einer QR-IBAN nicht zulässig." });
    if (reference !== "") issues.push({ field: "reference", message: "Bei NON muss die Referenz leer sein." });
  } else {
    issues.push({ field: "referenceType", message: "Referenztyp muss QRR, SCOR oder NON sein." });
  }

  if (message.length > 140) {
    issues.push({ field: "message", message: "Unstrukturierte Mitteilung darf höchstens 140 Zeichen haben." });
  }
  if (trailer !== "EPD") issues.push({ field: "trailer", message: "Trailer muss EPD sein." });

  return { ok: issues.length === 0, issues };
}

/** Splits "Bahnhofstrasse 12a" into street and building number for address type S. */
export function splitStreetAndBuilding(line: string): { street: string; buildingNumber: string } {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (!trimmed) return { street: "", buildingNumber: "" };
  const match = trimmed.match(/^(.*\D)\s+(\d+[A-Za-z]?(?:[/-]\d+[A-Za-z]?)?)$/);
  if (!match) return { street: trimmed, buildingNumber: "" };
  const buildingNumber = match[2].replace(/\s+/g, "");
  if (buildingNumber.length > 16 || match[1].trim().length === 0) {
    return { street: trimmed, buildingNumber: "" };
  }
  return { street: match[1].trim(), buildingNumber };
}

export function clip(value: string, max: number): string {
  return value.replace(/[\r\n]/g, " ").trim().slice(0, max);
}
