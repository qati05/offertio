import type { Metadata } from "next";
import StartLifetimeCheckout from "@/components/StartLifetimeCheckout";
import { getCachedFounderSeats } from "@/lib/founder-seats";
import { FOUNDER_CTA_LABEL, OFFER_EXPIRED_NOTICE, OFFER_SOLD_OUT_NOTICE, isFounderOfferExpired } from "@/lib/sale-page";

export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gründerplatz | Offertio",
  robots: { index: false, follow: false },
};

export default async function GruenderplatzPage() {
  const expired = isFounderOfferExpired();
  const seats = await getCachedFounderSeats();
  const soldOut = Boolean(seats && seats.remaining === 0);
  const closed = expired || soldOut;

  return (
    <div
      className="min-h-screen text-[color:var(--color-text)]"
      style={{ background: "linear-gradient(175deg, #0F0D0B 0%, #09090B 100%)" }}
    >
      {closed ? (
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {FOUNDER_CTA_LABEL}
          </h1>
          <p role="status" className="mt-4 text-sm leading-6">
            {expired ? OFFER_EXPIRED_NOTICE : OFFER_SOLD_OUT_NOTICE}
          </p>
          <a href="/" className="mt-8 inline-flex min-h-11 items-center text-sm" style={{ color: "var(--color-text-soft)" }}>
            Zur Startseite
          </a>
        </main>
      ) : (
        <StartLifetimeCheckout />
      )}
    </div>
  );
}
