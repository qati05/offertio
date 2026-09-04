
import { describe, it, expect } from "vitest";
import jsQR from "jsqr";
import { SwissQRCode } from "swissqrbill/svg";
import { QR_BILL_MM } from "@/lib/qr-bill-layout";

/**
 * The Swiss QR code, decoded rather than assumed.
 *
 * Until now the QR code was only ever reasoned about from source: "it should be
 * right, the library does it". That is not evidence. This test renders the real
 * SVG that Offertio embeds in its PDFs, reconstructs the module matrix from the
 * SVG rectangles, rasterises it, and reads it back with an independent QR
 * decoder (jsQR). What it asserts is therefore what a banking app's scanner
 * would actually see.
 *
 * The field layout below is the Swiss Payments Code payload:
 *
 *    0  SPC                       header
 *    1  0200                      version
 *    2  1                         character set, 1 = UTF-8
 *    3  IBAN
 *    4- 10  Creditor              AdrTp, Name, Street, BldgNb, PostCd, TwnNm, Ctry
 *   11- 17  Ultimate creditor     reserved, must stay empty
 *   18  Amount
 *   19  Currency
 *   20- 26  Ultimate debtor       empty when no debtor is known
 *   27  Reference type           QRR | SCOR | NON
 *   28  Reference
 *   29  Unstructured message
 *   30  EPD                      trailer, end of payment data
 *   31  Billing information
 *
 * NOT covered here, and stated plainly rather than implied: this checks the
 * payload against the field layout, not against the official SIX validator.
 * The Implementation Guidelines PDF and the SIX validation portal are on
 * six-group.com, which this environment cannot reach, so the claim "version
 * 0200 is the current IG revision" remains unverified by an official source.
 * See docs/QR-RECHNUNG.md.
 */

const CREDITOR = {
  account: "CH5604835012345678009",
  name: "Muster Reinigung GmbH",
  address: "Bahnhofstrasse",
  buildingNumber: "12",
  zip: "8001",
  city: "Zürich",
  country: "CH",
} as const;

/** Swiss QR code side length in millimetres, fixed by the standard. */
const QR_SIDE_MM = 46;

interface Decoded {
  fields: string[];
  modules: number;
  version: number;
}

/**
 * Renders the QR, rebuilds the module grid from the SVG, and decodes it.
 *
 * Rectangles wider than one module belong to the Swiss cross overlay, not to
 * the code, so they are skipped — the decoder has to see the payload modules
 * exactly as the printer lays them down.
 */
function decode(data: Record<string, unknown>): Decoded {
  const svg = new SwissQRCode(data as never).toString();

  const rects = [
    ...svg.matchAll(/<rect x="([\d.]+)mm" y="([\d.]+)mm" width="([\d.]+)mm"[^>]*fill="black"/g),
  ].map((m) => ({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]) }));
  expect(rects.length).toBeGreaterThan(100);

  const unit = Math.min(...rects.map((r) => r.w));
  const modules = Math.round(QR_SIDE_MM / unit);

  const grid = Array.from({ length: modules }, () => new Array<number>(modules).fill(0));
  for (const rect of rects) {
    if (Math.abs(rect.w - unit) > 1e-9) continue; // Swiss cross, not a module
    const cx = Math.round(rect.x / unit);
    const cy = Math.round(rect.y / unit);
    if (cx >= 0 && cx < modules && cy >= 0 && cy < modules) grid[cy][cx] = 1;
  }

  // Quiet zone plus 3x upscaling — jsQR needs both to lock on.
  const QUIET = 4;
  const SCALE = 3;
  const side = (modules + 2 * QUIET) * SCALE;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (!grid[y][x]) continue;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const i = (((y + QUIET) * SCALE + dy) * side + ((x + QUIET) * SCALE + dx)) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
  }

  const result = jsQR(pixels, side, side);
  if (!result) throw new Error("QR code could not be decoded");

  return { fields: result.data.split("\n"), modules, version: (modules - 17) / 4 };
}

describe("Swiss QR code · payload, decoded from the rendered code", () => {
  const plain = () =>
    decode({ creditor: CREDITOR, currency: "CHF", amount: 1234.55, message: "RE-2026-0001" });

  it("carries the Swiss Payments Code header", () => {
    const { fields } = plain();
    expect(fields[0]).toBe("SPC");
    expect(fields[1]).toBe("0200");
    expect(fields[2]).toBe("1"); // UTF-8
  });

  it("uses the structured address type S", () => {
    // Type "K" (combined address) is being withdrawn; anything still emitting it
    // faces the 2025/2026 deadlines. Offertio never does.
    expect(plain().fields[4]).toBe("S");
  });

  it("puts the creditor in the seven fields reserved for it", () => {
    const { fields } = plain();
    expect(fields.slice(3, 11)).toEqual([
      CREDITOR.account,
      "S",
      CREDITOR.name,
      CREDITOR.address,
      CREDITOR.buildingNumber,
      CREDITOR.zip,
      CREDITOR.city,
      CREDITOR.country,
    ]);
  });

  it("leaves the ultimate-creditor block empty, as the standard requires", () => {
    expect(plain().fields.slice(11, 18)).toEqual(["", "", "", "", "", "", ""]);
  });

  it("writes the amount with two decimals and no grouping", () => {
    const { fields } = plain();
    expect(fields[18]).toBe("1234.55");
    expect(fields[19]).toBe("CHF");
    expect(fields[18]).toMatch(/^\d+\.\d{2}$/);
  });

  it("ends the payment data with the EPD trailer in the right place", () => {
    const { fields } = plain();
    expect(fields[30]).toBe("EPD");
    expect(fields).toHaveLength(32);
  });

  it("survives non-ASCII in the creditor name", () => {
    // UTF-8 via ECI 26. A mangled umlaut here would print a wrong payee name.
    const { fields } = decode({
      creditor: { ...CREDITOR, name: "Zürcher Gebäudereinigung AG", city: "Genève" },
      currency: "CHF",
      amount: 10,
      message: "RE-1",
    });
    expect(fields[5]).toBe("Zürcher Gebäudereinigung AG");
    expect(fields[9]).toBe("Genève");
  });

  it("stays within QR version 25, the standard's ceiling", () => {
    const { version, modules } = plain();
    expect(version).toBeLessThanOrEqual(25);
    expect(modules).toBe(17 + 4 * version);
  });
});

describe("Swiss QR code · reference types", () => {
  it("uses NON with a plain IBAN and carries the number as a message", () => {
    const { fields } = decode({
      creditor: CREDITOR,
      currency: "CHF",
      amount: 1234.55,
      message: "RE-2026-0001",
    });
    expect(fields[27]).toBe("NON");
    expect(fields[28]).toBe("");
    expect(fields[29]).toBe("RE-2026-0001");
  });

  it("uses QRR with a QR-IBAN and carries the 27-digit reference", () => {
    const { fields } = decode({
      creditor: { ...CREDITOR, account: "CH4431999123000889012" },
      currency: "CHF",
      amount: 1234.55,
      reference: "000000000000000000020260010",
    });
    expect(fields[27]).toBe("QRR");
    expect(fields[28]).toBe("000000000000000000020260010");
    expect(fields[28]).toMatch(/^\d{27}$/);
    expect(fields[29]).toBe("");
  });

  it("refuses the combinations the standard forbids", () => {
    // Measured, not assumed: these are the guards Offertio relies on rather
    // than re-implementing.
    const cases: [string, Record<string, unknown>][] = [
      [
        "QRR with a wrong check digit",
        { creditor: { ...CREDITOR, account: "CH4431999123000889012" }, currency: "CHF", amount: 1, reference: "000000000000000000020260011" },
      ],
      [
        "QR-IBAN without a reference",
        { creditor: { ...CREDITOR, account: "CH4431999123000889012" }, currency: "CHF", amount: 1 },
      ],
      [
        "QRR on a conventional IBAN",
        { creditor: CREDITOR, currency: "CHF", amount: 1, reference: "000000000000000000020260010" },
      ],
    ];
    for (const [label, data] of cases) {
      expect(() => new SwissQRCode(data as never).toString(), label).toThrow();
    }
  });
});

describe("Swiss QR code · print size", () => {
  it("the library emits the code at the mandated 46 mm", () => {
    const svg = new SwissQRCode({
      creditor: CREDITOR,
      currency: "CHF",
      amount: 1,
      message: "RE-1",
    } as never).toString();
    expect(svg).toContain('width="46mm"');
    expect(svg).toContain('height="46mm"');
  });

  it("the templates take their print size from the shared geometry module", () => {
    // The size assertions themselves live in qr-bill-layout.test.ts, which owns
    // the millimetre-to-point conversion. Repeating them here would be two
    // places to update and one to forget; this only pins that the payload test
    // and the layout test are talking about the same 46 mm.
    expect(QR_BILL_MM.code).toBe(QR_SIDE_MM);
  });
});
