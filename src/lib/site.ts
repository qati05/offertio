/**
 * Canonical public site URL.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in the environment (e.g. `https://getoffertio.ch`)
 * to override. The default is the production apex. `www.getoffertio.ch`
 * redirects to the apex (see vercel.json). Canonicals, sitemap and JSON-LD
 * follow this value.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://getoffertio.ch"
).replace(/\/+$/, "");

/** Absolute URL helper: `siteUrl("/blog")` → `"https://getoffertio.ch/blog"`. */
export function siteUrl(path: string = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
