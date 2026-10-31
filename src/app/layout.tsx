import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google";
import CookieConsent from "@/components/CookieConsent";
import { SALE_DESCRIPTION, SALE_TITLE } from "@/lib/sale-page";
import { SITE_URL, siteUrl } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "optional",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  adjustFontFallback: true,
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "optional",
  weight: ["400", "600", "700"],
  adjustFontFallback: true,
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "optional",
  weight: ["400", "500"],
  preload: false,
});

/** Vercel function region: Frankfurt, closest EU region to Switzerland. */
export const preferredRegion = "fra1";

export const metadata: Metadata = {
  // metadataBase makes relative og:image / twitter:image URLs resolve correctly
  // across environments; override via NEXT_PUBLIC_SITE_URL.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Offertio",
    template: "%s",
  },
  description: SALE_DESCRIPTION,
  openGraph: {
    title: SALE_TITLE,
    description: SALE_DESCRIPTION,
    images: [
      {
        url: siteUrl("/offertio/og-image.png"),
        width: 1200,
        height: 630,
        alt: SALE_TITLE,
      },
    ],
    type: "website",
    locale: "de_CH",
    siteName: "Offertio",
  },
  twitter: {
    card: "summary_large_image",
    title: SALE_TITLE,
    description: SALE_DESCRIPTION,
    images: [siteUrl("/offertio/og-image.png")],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "de-CH": SITE_URL,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? "";
  const pathname = headerList.get("x-pathname") ?? "";

  return (
    <html lang="de-CH" className={`${fraunces.variable} ${dmSans.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Preconnect to Supabase — shaves ~100-300 ms off the first auth/data call */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C8793D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Offertio" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        {pathname === "/" && (
          <>
            <meta name="description" content={SALE_DESCRIPTION} />
            <link rel="canonical" href={SITE_URL} />
          </>
        )}
      </head>
      <body>
        {children}
        <CookieConsent />
        <script nonce={nonce} suppressHydrationWarning defer src="/register-sw.js" />
        {process.env.NODE_ENV === "production" && (
          <script nonce={nonce} defer src="/_vercel/insights/script.js" />
        )}
        {process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && (
          <>
            {/* GA4 Consent Mode v2: default to denied, CookieConsent component updates on opt-in */}
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('consent', 'default', {
                    analytics_storage: 'denied',
                    ad_storage: 'denied',
                    ad_user_data: 'denied',
                    ad_personalization: 'denied',
                    wait_for_update: 500
                  });
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}', { anonymize_ip: true });
                `,
              }}
            />
            <script
              nonce={nonce}
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}`}
            />
          </>
        )}
      </body>
    </html>
  );
}
