import { describe, expect, it } from "vitest";
import { generateQRData } from "../../node_modules/swissqrbill/lib/esm/shared/qr-code.js";
import { buildSwissQrBillInput, generateQrrReference } from "@/lib/qr-bill";
import { isQrIban, isQrrValid, validateSpcPayload } from "@/lib/qr-payload";
import type { Profile } from "@/lib/types";

const profile: Profile = {
  id: "user-ch",
  email: "owner@example.com",
  firmenname: "Muster AG",
  vorname: "Max",
  nachname: "Muster",
  adresse: "Bahnhofstrasse 1",
  plz: "8001",
  ort: "Zürich",
  telefon: "",
  iban: "CH9300762011623852957",
  bic: "",
  uid_mwst: "",
  logo_url: "",
  land: "CH",
  sprache: "de",
  beruf: "Handwerk",
  zahlungsfrist: 30,
  plan: "free",
  created_at: "2026-01-01T00:00:00Z",
};

const qrIban = "CH4431999123000889012";

function payloadFor(input: Profile, total: number, nummer: string, reference?: string) {
  const built = buildSwissQrBillInput(input, total, nummer);
  expect(built).not.toBeNull();
  const data = {
    ...built!.input,
    ...(reference ? { reference } : { message: nummer.slice(0, 140) }),
  };
  return generateQRData(data) as string;
}

describe("Swiss QR-bill payload (SIX v2.3 / SPC 0200)", () => {
  it("encodes a regular CH-IBAN as structured address type S with reference NON", () => {
    const payload = payloadFor(profile, 1234.5, "RE-2026-001");
    const lines = payload.split("\n");
    expect(lines[0]).toBe("SPC");
    expect(lines[1]).toBe("0200");
    expect(lines[2]).toBe("1");
    expect(lines[3]).toBe("CH9300762011623852957");
    expect(lines[4]).toBe("S");
    expect(lines[5]).toBe("Muster AG");
    expect(lines[6]).toBe("Bahnhofstrasse");
    expect(lines[7]).toBe("1");
    expect(lines[8]).toBe("8001");
    expect(lines[9]).toBe("Zürich");
    expect(lines[10]).toBe("CH");
    expect(lines.slice(11, 18).every((line) => line === "")).toBe(true);
    expect(lines[18]).toBe("1234.50");
    expect(lines[19]).toBe("CHF");
    expect(lines[27]).toBe("NON");
    expect(lines[28]).toBe("");
    expect(lines[30]).toBe("EPD");
    expect(isQrIban(lines[3])).toBe(false);
    const result = validateSpcPayload(payload);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("encodes a QR-IBAN with a 27-digit QRR and a valid check digit", () => {
    const nummer = "RE-2026-001";
    const reference = generateQrrReference(nummer);
    const payload = payloadFor({ ...profile, iban: qrIban }, 100, nummer, reference);
    const lines = payload.split("\n");
    expect(isQrIban(lines[3])).toBe(true);
    expect(lines[27]).toBe("QRR");
    expect(lines[28]).toBe(reference);
    expect(isQrrValid(reference)).toBe(true);
    expect(validateSpcPayload(payload).ok).toBe(true);
  });

  it("omits amounts below 0.01 instead of writing 0.00", () => {
    const payload = payloadFor(profile, 0, "RE-2026-000");
    expect(payload.split("\n")[18]).toBe("");
    expect(validateSpcPayload(payload).ok).toBe(true);
    expect(validateSpcPayload(payload.replace("\n\nCHF", "\n0.00\nCHF")).ok).toBe(false);
  });

  it("rejects combined addresses, a QRR on a normal IBAN, and a broken check digit", () => {
    const payload = payloadFor(profile, 10, "RE-1");
    const lines = payload.split("\n");
    lines[4] = "K";
    expect(validateSpcPayload(lines.join("\n")).ok).toBe(false);

    const qrrOnIban = [...payload.split("\n")];
    qrrOnIban[27] = "QRR";
    qrrOnIban[28] = generateQrrReference("RE-1");
    expect(validateSpcPayload(qrrOnIban.join("\n")).issues.some((issue) => issue.field === "referenceType")).toBe(true);

    const broken = generateQrrReference("RE-1");
    const flipped = `${broken.slice(0, 26)}${broken.endsWith("0") ? "1" : "0"}`;
    expect(isQrrValid(flipped)).toBe(false);
  });

  it("does not build a bill when the structured address has no postal code", () => {
    expect(buildSwissQrBillInput({ ...profile, plz: " " }, 10, "RE-1")).toBeNull();
  });
});
