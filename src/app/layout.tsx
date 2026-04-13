import type { Metadata } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Offertio - Mobile-first Offerten und Rechnungen für DACH-Betriebe",
  description:
    "Offertio hilft kleinen Betrieben in CH, DE und AT, Offerten und Rechnungen ohne Bürochaos direkt vom Handy zu erstellen, weiterzugeben und professionell zu organisieren.",
  openGraph: {
    title: "Offertio - Weniger Büro. Mehr erledigte Aufträge.",
    description:
      "Mobile-first Offerten und Rechnungen für Handwerk, Reinigung und Servicebetriebe in CH, DE und AT. Mit QR, SEPA und DACH-Logik im Hintergrund.",
    images: [
      {
        url: "https://offert.io/offertio/og-image.png",
        width: 1200,
        height: 630,
        alt: "Offertio - mobile-first Offerten und Rechnungen",
      },
    ],
    type: "website",
    locale: "de_CH",
    alternateLocale: ["de_DE", "de_AT"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Offertio - Mobile-first Offerten und Rechnungen",
    description:
      "Weniger Büro, mehr Klarheit im Alltag: Offertio bringt Offerten und Rechnungen dorthin, wo kleine Betriebe wirklich arbeiten.",
    images: ["https://offert.io/offertio/og-image.png"],
  },
  alternates: {
    canonical: "https://offert.io",
    languages: {
      "de-CH": "https://offert.io",
      "de-DE": "https://offert.io",
      "de-AT": "https://offert.io",
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="de-CH" className={`${bricolage.variable} ${dmSans.variable}`} suppressHydrationWarning>
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
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Offertio",
              url: "https://offert.io",
              applicationCategory: "BusinessApplication",
              applicationSubCategory: "InvoicingApplication",
              operatingSystem: "Web, iOS, Android",
              description:
                "Mobile-first Angebots- und Rechnungssoftware für kleinere Betriebe in CH, DE und AT.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "CHF",
              },
            }),
          }}
        />
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
