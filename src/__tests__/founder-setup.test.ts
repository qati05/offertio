import { describe, expect, it } from "vitest";
import {
  detectLogo,
  detectPriceList,
  parseFounderSetupPayload,
  parseSetupPaths,
} from "@/lib/founder-setup";

const USER = "11111111-1111-4111-8111-111111111111";
const FOLDER = "22222222-2222-4222-8222-222222222222";

const validBody = {
  firmenname: "Muster GmbH",
  adresse: "Werkstrasse 1",
  plz: "8000",
  ort: "Zürich",
  telefon: "",
  email: "Inhaber@Beispiel.ch",
  iban: "",
  uidMwst: "",
  logoPath: `${USER}/${FOLDER}/logo.png`,
  preislistePath: `${USER}/${FOLDER}/preisliste.csv`,
};

describe("founder setup files", () => {
  it("accepts png, jpg and a script-free svg logo", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
    const scripted = Buffer.from('<svg><script>alert(1)</script></svg>', "utf8");
    expect(detectLogo(png)?.ext).toBe("png");
    expect(detectLogo(jpg)?.ext).toBe("jpg");
    expect(detectLogo(svg)?.ext).toBe("svg");
    expect(detectLogo(scripted)).toBeNull();
    const entity = Buffer.from('<svg><a href="&#106;avascript:alert(1)"><text>x</text></a></svg>', "utf8");
    expect(detectLogo(entity)).toBeNull();
  });

  it("accepts xlsx, csv, pdf and a photo, and rejects html", () => {
    const pdf = Buffer.from("%PDF-1.7\n");
    const csv = Buffer.from("Artikel,Preis\nStunde,120\n", "utf8");
    const html = Buffer.from("<html><script>x</script></html>", "utf8");
    const xlsx = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("....[Content_Types].xml", "utf8"),
    ]);
    expect(detectPriceList(pdf)?.ext).toBe("pdf");
    expect(detectPriceList(csv)?.ext).toBe("csv");
    expect(detectPriceList(html)).toBeNull();
    expect(detectPriceList(xlsx)?.ext).toBe("xlsx");
    expect(detectPriceList(Buffer.from("Name,Preis\n=HYPERLINK(\"http://evil\"),1\n", "utf8"))).toBeNull();
    expect(detectPriceList(Buffer.from("Name,Preis\nRabatt,-10\n", "utf8"))?.ext).toBe("csv");
  });

  it("only accepts both files inside the owner's folder", () => {
    expect(parseSetupPaths(USER, validBody.logoPath, validBody.preislistePath)?.submissionId).toBe(FOLDER);
    expect(parseSetupPaths(USER, `${USER}/${FOLDER}/../logo.png`, validBody.preislistePath)).toBeNull();
    expect(parseSetupPaths(USER, `99999999-9999-4999-8999-999999999999/${FOLDER}/logo.png`, validBody.preislistePath)).toBeNull();
  });

  it("normalises company fields and rejects a bad IBAN", () => {
    const ok = parseFounderSetupPayload(validBody, USER);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.fields.email).toBe("inhaber@beispiel.ch");

    const bad = parseFounderSetupPayload({ ...validBody, iban: "DE89370400440532013000" }, USER);
    expect(bad.ok).toBe(false);
  });
});
