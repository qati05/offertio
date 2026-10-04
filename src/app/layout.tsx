import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Offertio",
  description: "Offerten und Rechnungen.",
  // A private installation: nothing here is meant to be found. robots.txt says
  // the same; this covers crawlers that ignore it and pages reached by link.
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";

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
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
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
