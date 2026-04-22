/**
 * Accent color helpers for the "farbig" PDF template.
 *
 * The UI accepts 3-/6-digit hex in any case. We normalize to canonical
 * lowercase #rrggbb before persisting (matches the DB CHECK constraint in
 * migration 031_pdf_template_farbig.sql). From the normalized brand color we
 * derive a small palette used across the template:
 *   - accent       — the brand color itself, used on dark bands, table header, total box
 *   - accentDark   — 15 % darker, used on the sub-header band for depth
 *   - accentSoft   — very faint tint of the accent, used as alternating row shading
 *   - accentOnWhite — text-on-white variant; we darken light hues so labels stay
 *                     legible (AA contrast) even if the user picked e.g. bright yellow.
 */

export const DEFAULT_ACCENT = "#c8793d";

const HEX6 = /^#[0-9a-f]{6}$/;
const HEX3 = /^#[0-9a-f]{3}$/;

/**
 * Normalize a user-supplied color string to canonical `#rrggbb` (lowercase).
 * Accepts 3- or 6-digit hex with/without leading `#`, in any case.
 * Returns null for anything unrecognized.
 */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (HEX6.test(withHash)) return withHash;
  if (HEX3.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Relative luminance per WCAG — used to decide whether to darken for on-white text. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function darken([r, g, b]: [number, number, number], factor: number): [number, number, number] {
  return [r * (1 - factor), g * (1 - factor), b * (1 - factor)];
}

export interface AccentPalette {
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentOnWhite: string;
}

/**
 * Derive the full accent palette from a stored hex (or default offertio orange
 * when null). Always returns canonical 6-digit lowercase hex values safe to
 * drop into React-PDF styles.
 */
export function resolveAccentPalette(stored: string | null | undefined): AccentPalette {
  const accent = normalizeHex(stored) ?? DEFAULT_ACCENT;
  const rgb = hexToRgb(accent);

  const [dr, dg, db] = darken(rgb, 0.18);
  const accentDark = rgbToHex(dr, dg, db);

  // Soft tint — accent mixed with white at ~7 % opacity, expressed as solid rgb
  // because React-PDF's CSS parser doesn't reliably support `rgba()` in all styles.
  const mix = 0.07;
  const [sr, sg, sb] = [
    rgb[0] * mix + 255 * (1 - mix),
    rgb[1] * mix + 255 * (1 - mix),
    rgb[2] * mix + 255 * (1 - mix),
  ];
  const accentSoft = rgbToHex(sr, sg, sb);

  // If the accent is too light for white backgrounds, darken it for label use.
  // 0.5 luminance threshold corresponds roughly to #bbb — anything lighter
  // would fall below AA contrast against white.
  const lum = relativeLuminance(rgb);
  const accentOnWhite = lum > 0.5 ? rgbToHex(...darken(rgb, 0.45)) : accent;

  return { accent, accentDark, accentSoft, accentOnWhite };
}
