import { Svg, Rect } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

/**
 * Draws the Swiss QR code into a PDF as vector rectangles.
 *
 * WHY NOT <Image src={dataUrl}>
 *
 * swissqrbill hands back an SVG, and every template used to pass it to
 * @react-pdf/renderer's <Image>. That component only knows PNG and JPEG — the
 * `@react-pdf/image` source has no SVG handling in either its node or its
 * browser build — so the payment part was drawn with an empty square where the
 * code belongs. Measured, not guessed: the same render with a PNG embeds one
 * image, with the SVG data URL it embeds none. Nothing noticed, because no test
 * ever looked inside the PDF.
 *
 * The SVG swissqrbill emits is simple: one <svg> sized in millimetres and a flat
 * list of <rect> elements, black modules plus a white square, a black square and
 * two white bars for the Swiss cross. That maps one to one onto <Rect>, with no
 * rasterising step and no blur at print size.
 *
 * FAILS LOUDLY
 *
 * If the SVG cannot be read this throws. The caller turns that into "the PDF
 * could not be created", which is the right outcome: a payment part with no
 * code on it is worse than no document, because it looks finished.
 */

export interface QrRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface ParsedQr {
  /** Edge length of the square code, in millimetres. */
  size: number;
  rects: QrRect[];
}

const num = (value: string): number => Number.parseFloat(value.replace(/mm$/, ""));

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1]! : null;
}

export function decodeDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:image/svg+xml") || comma < 0) {
    throw new Error("QR code: expected an SVG data URL");
  }
  const payload = dataUrl.slice(comma + 1);
  return dataUrl.slice(0, comma).includes(";base64")
    ? Buffer.from(payload, "base64").toString("utf8")
    : decodeURIComponent(payload);
}

export function parseQrSvg(dataUrl: string): ParsedQr {
  const svg = decodeDataUrl(dataUrl);

  const root = svg.match(/<svg\b[^>]*>/);
  const size = root ? num(attr(root[0], "width") ?? "") : Number.NaN;
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("QR code: SVG has no usable width");
  }

  const rects: QrRect[] = [];
  for (const m of svg.matchAll(/<rect\b[^>]*>/g)) {
    const tag = m[0];
    const rect = {
      x: num(attr(tag, "x") ?? "0"),
      y: num(attr(tag, "y") ?? "0"),
      width: num(attr(tag, "width") ?? ""),
      height: num(attr(tag, "height") ?? ""),
      fill: attr(tag, "fill") ?? "black",
    };
    if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) {
      throw new Error("QR code: SVG contains a rectangle that cannot be read");
    }
    rects.push(rect);
  }

  // A QR code of the smallest version already has hundreds of modules. An empty
  // or near-empty list means the SVG was not what we expected.
  if (rects.length < 100) {
    throw new Error(`QR code: SVG has only ${rects.length} rectangles`);
  }
  return { size, rects };
}

export default function QrCodeSvg({ dataUrl, style }: { dataUrl: string; style?: Style }) {
  const { size, rects } = parseQrSvg(dataUrl);
  return (
    // The viewBox is in millimetres, so every coordinate stays exactly as
    // swissqrbill emitted it; the width and height in `style` scale it to points.
    <Svg viewBox={`0 0 ${size} ${size}`} style={style}>
      {rects.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} />
      ))}
    </Svg>
  );
}
