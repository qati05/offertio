import type { Metadata } from "next";
import PublicLanding from "@/components/landing/PublicLanding";
import { getCachedFounderSeats } from "@/lib/founder-seats";
import {
  SALE_DESCRIPTION,
  SALE_TITLE,
  buildFaqs,
  getFounderMinTermDate,
  getSubscriptionPriceChf,
  isFounderOfferExpired,
  zurichDataLabel,
} from "@/lib/sale-page";
import { SITE_URL, siteUrl } from "@/lib/site";

export const preferredRegion = "fra1";
export const revalidate = 30;

export const metadata: Metadata = {
  title: SALE_TITLE,
  description: SALE_DESCRIPTION,
  openGraph: {
    title: SALE_TITLE,
    description: SALE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Offertio",
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
    languages: {
      "de-CH": SITE_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

function LandingDocument({
  seats,
  subscriptionPrice,
  expired,
  minTermDate,
  dataLabel,
}: {
  seats: Awaited<ReturnType<typeof getCachedFounderSeats>>;
  subscriptionPrice: ReturnType<typeof getSubscriptionPriceChf>;
  expired: boolean;
  minTermDate: ReturnType<typeof getFounderMinTermDate>;
  dataLabel: ReturnType<typeof zurichDataLabel>;
}) {
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
    inLanguage: "de-CH",
    description: SALE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      name: "Gründerplatz",
      price: "249",
      priceCurrency: "CHF",
      url: siteUrl("/gruenderplatz"),
      description: "Einmalig CHF 249. 2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer.",
      availability: expired
        ? "https://schema.org/Discontinued"
        : seats?.remaining === 0
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Offertio",
    url: SITE_URL,
    logo: siteUrl("/favicon.svg"),
    email: "datenschutz@getoffertio.ch",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Marbacherstrasse 12",
      postalCode: "9445",
      addressLocality: "Rebstein",
      addressCountry: "CH",
    },
  };

  return (
    <>
      <PublicLanding
        seats={seats}
        subscriptionPrice={subscriptionPrice}
        expired={expired}
        minTermDate={minTermDate}
        dataLabel={dataLabel}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />
    </>
  );
}

export default async function Home() {
  const seats = await getCachedFounderSeats();
  return (
    <LandingDocument
      seats={seats}
      subscriptionPrice={getSubscriptionPriceChf()}
      expired={isFounderOfferExpired()}
      minTermDate={getFounderMinTermDate()}
      dataLabel={zurichDataLabel(process.env.NEXT_PUBLIC_DATA_REGION)}
    />
  );
}
