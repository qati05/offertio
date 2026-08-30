/**
 * Geometry of the Swiss QR-bill payment part, in PDF points.
 *
 * WHY THIS MODULE EXISTS
 *
 * All five PDF templates carried the payment part as raw numbers, and one of
 * them was wrong in a way that is easy to miss and hard to see:
 *
 *   qrReceipt: { width: 175 }   ← 62 mm converted to points. Correct.
 *   qrSection: { height: 105 }  ← 105 taken straight from "105 mm". Wrong:
 *                                 105 pt is 37 mm, a third of the height the
 *                                 standard fixes.
 *
 * The width was converted, the height was copied. The QR code then had to be
 * shrunk to 80 pt (28.2 mm instead of 46 mm) simply to fit inside a strip that
 * was two thirds too short — which is why the code looked like the defect when
 * it was only the most visible symptom.
 *
 * Millimetres are the unit the standard speaks in and points are the unit
 * @react-pdf/renderer draws in, so the conversion happens here, once, and every
 * template reads the result instead of restating a number.
 *
 * THE DIMENSIONS
 *
 * The payment part and the receipt together form a strip across the full width
 * of the page, 105 mm tall, separated and bounded by perforation lines:
 *
 *   receipt       62 mm wide
 *   payment part 148 mm wide
 *   strip        105 mm tall (62 + 148 = 210 mm = A4 width)
 *   QR code       46 mm square, Swiss cross 7 mm centred on it
 *
 * VERIFIED, AND NOT VERIFIED
 *
 * The QR payload itself is decoded and checked field by field in
 * qr-payload-conformance.test.ts. These are the surrounding measurements, taken
 * from the dimensions swissqrbill itself renders to — it emits the code at
 * width="46mm" and scales the Swiss cross against mm2pt(46), which is the
 * closest thing to a reference implementation reachable from here.
 *
 * NOT verified against the official Swiss Implementation Guidelines: six-group.com
 * is unreachable from this environment. Nothing here has been printed and
 * scanned either. See docs/QR-RECHNUNG.md.
 */

/** Millimetres to PDF points. 72 points to the inch, 25.4 mm to the inch. */
export function mmToPt(mm: number): number {
  return Number(((mm * 72) / 25.4).toFixed(2));
}

export const QR_BILL_MM = {
  /** Height of the whole strip: receipt and payment part share it. */
  stripHeight: 105,
  /** Receipt, on the left, torn off by the payer. */
  receiptWidth: 62,
  /** Payment part, on the right. 62 + 148 = 210 = A4 width. */
  paymentWidth: 148,
  /** The QR code itself, square. */
  code: 46,
} as const;

export const QR_BILL_PT = {
  stripHeight: mmToPt(QR_BILL_MM.stripHeight),
  receiptWidth: mmToPt(QR_BILL_MM.receiptWidth),
  paymentWidth: mmToPt(QR_BILL_MM.paymentWidth),
  code: mmToPt(QR_BILL_MM.code),
} as const;

/**
 * Bottom padding a page needs so its content stops above the strip.
 *
 * The strip is absolutely positioned at the bottom of the page, so without this
 * the last rows of the item table would run underneath it. The extra
 * millimetres are breathing room, not part of the standard.
 */
export const QR_BILL_PAGE_BOTTOM_PT = mmToPt(QR_BILL_MM.stripHeight + 6);
