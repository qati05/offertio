import type { Metadata } from "next";
import { headers } from "next/headers";
import PublicLanding from "@/components/landing/PublicLanding";
import { getCachedFounderSeats } from "@/lib/founder-seats";
import {
  SALE_DESCRIPTION,
  SALE_TITLE,
  buildFaqs,
  getFounderMinTermDate,
  getSubscriptionPriceChf,
  isFounderOfferExpired,
} from "@/lib/sale-page";
import { SITE_URL, siteUrl } from "@/lib/site";

export const preferredRegion = "fra1";

export const metadata: Metadata = {
  title: SALE_TITLE,
  description: SALE_DESCRIPTION,
  openGraph: {
    title: SALE_TITLE,
    description: SALE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    locale: "de_CH",
    images: [
      {
        url: siteUrl("/offertio/og-image.png"),
        width: 1200,
        height: 630,
        alt: "Offertio – Offerten und QR-Rechnungen für Schweizer Kleinbetriebe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SALE_TITLE,
    description: SALE_DESCRIPTION,
    images: [siteUrl("/offertio/og-image.png")],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function Home() {
  const nonce = (await headers()).get("x-nonce") ?? "";
  const [seats, subscriptionPrice, minTermDate] = await Promise.all([
    getCachedFounderSeats(),
    Promise.resolve(getSubscriptionPriceChf()),
    Promise.resolve(getFounderMinTermDate()),
  ]);
  const expired = isFounderOfferExpired();
  const faqs = buildFaqs(subscriptionPrice);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const offerJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Offertio",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SALE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      name: "Gründerplatz",
      price: "249",
      priceCurrency: "CHF",
      description: "Einmalig CHF 249. 2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer.",
      availability: expired ? "https://schema.org/Discontinued" : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <PublicLanding
        seats={seats}
        subscriptionPrice={subscriptionPrice}
        expired={expired}
        minTermDate={minTermDate}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
    </>
  );
}
