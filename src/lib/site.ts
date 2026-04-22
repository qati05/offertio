/**
 * Canonical public site URL.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in the environment (e.g. `https://example.com`)
 * to override. The default matches `public/sitemap.xml` and
 * `public/robots.txt`. Keeping the value env-driven means the marketing
 * metadata (canonicals, og:image, JSON-LD) follows whatever domain is
 * ultimately chosen without a code change.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://offertio.io"
).replace(/\/+$/, "");

/** Absolute URL helper: `siteUrl("/blog")` → `"https://offertio.io/blog"`. */
export function siteUrl(path: string = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
