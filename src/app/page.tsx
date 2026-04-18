import { headers } from "next/headers";
import { I18nProvider } from "@/lib/i18n";
import LandingScrollReveal from "@/components/LandingScrollReveal";
import LandingNavbar from "@/components/LandingNavbar";
import LandingHero from "@/components/LandingHero";
import LandingMarquee from "@/components/LandingMarquee";
import LandingPain from "@/components/LandingPain";
import LandingHowItWorks from "@/components/LandingHowItWorks";
import LandingFeatures from "@/components/LandingFeatures";
import LandingPricing from "@/components/LandingPricing";
import LandingFaq from "@/components/LandingFaq";
import LandingCta from "@/components/LandingCta";
import LandingFooter from "@/components/LandingFooter";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Kann ich Offerten wirklich per WhatsApp senden?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Ein Tap öffnet WhatsApp mit einer fertigen Nachricht und einem sicheren Link zum PDF. Der Kunde bekommt die Offerte in demselben Chat, in dem er dich kontaktiert hat — nicht im SPAM-Ordner. Der Link ist 7 Tage gültig.",
      },
    },
    {
      "@type": "Question",
      name: "Wird die Swiss QR-Rechnung richtig erkannt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Offertio erzeugt den Swiss QR-Code nach ISO 20022 mit QR-IBAN und QRR-Referenz — genau so, wie ihn alle Schweizer Banken im E-Banking scannen.",
      },
    },
    {
      "@type": "Question",
      name: "Funktioniert das auch für Deutschland und Österreich?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Für DE erzeugen wir ZUGFeRD 2.3 BASIC (Factur-X) als hybride PDF mit eingebettetem XML — pflichtkonform für die E-Rechnungspflicht. Für AT setzen wir die UID-Schwellen und Pflichtfelder nach §11 öUStG automatisch.",
      },
    },
    {
      "@type": "Question",
      name: "Was kostet der 14-Tage-Test?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nichts. Keine Kreditkarte, keine automatische Verlängerung. 14 Tage lang alle Pro-Funktionen — danach automatisch Free (5 Dokumente/Monat) oder Upgrade.",
      },
    },
    {
      "@type": "Question",
      name: "Brauche ich technisches Wissen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nein. Als PWA läuft Offertio direkt im Browser — kein App-Store, keine Installation, kein Training.",
      },
    },
    {
      "@type": "Question",
      name: "Muss ich sofort Pro kaufen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nein. Nach dem 14-Tage-Test kannst du kostenlos weiter mit 5 Dokumenten/Monat arbeiten. Pro ergibt erst Sinn, wenn es fester Teil deines Betriebs wird.",
      },
    },
  ],
};

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Offertio",
  url: "https://offert.io",
  offers: [
    {
      "@type": "Offer",
      name: "Werkbank",
      price: "0",
      priceCurrency: "CHF",
      description: "5 Dokumente pro Monat. QR-Rechnung, ZUGFeRD, WhatsApp-Versand, PDF-Export.",
    },
    {
      "@type": "Offer",
      name: "Meister",
      price: "19",
      priceCurrency: "CHF",
      billingDuration: "P1M",
      description: "Unbegrenzte Dokumente, Logo & Branding, E-Mail-Versand, Vorlagen-Bibliothek, Offline-Modus.",
    },
    {
      "@type": "Offer",
      name: "Betrieb",
      price: "39",
      priceCurrency: "CHF",
      billingDuration: "P1M",
      description: "Alles aus Meister plus Team-Verwaltung, Rollen & Rechte, Shared Vorlagen.",
    },
  ],
};

export default async function Home() {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <>
      <I18nProvider>
        <div className="min-h-screen text-[color:var(--color-text)]" style={{
          background: `
            radial-gradient(ellipse 70% 50% at 20% 0%, rgba(200,121,61,0.12), transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 15%, rgba(200,121,61,0.07), transparent 55%),
            radial-gradient(ellipse 60% 45% at 50% 85%, rgba(168,98,46,0.05), transparent 55%),
            linear-gradient(175deg, #0F0D0B 0%, #09090B 40%, #06060A 100%)
          `,
        }}>
          <LandingScrollReveal />
          <LandingNavbar />

          <main className="overflow-hidden">
            <LandingHero />
            <LandingMarquee />
            <LandingPain />
            <LandingHowItWorks />
            <LandingFeatures />
            <LandingPricing />
            <LandingFaq />
            <LandingCta />
          </main>

          <LandingFooter />
        </div>
      </I18nProvider>

      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
    </>
  );
}
