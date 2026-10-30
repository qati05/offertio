import { OffertioIcon } from "@/components/OffertioLogo";
import {
  FOUNDER_CTA_HREF,
  FOUNDER_CTA_LABEL,
  OFFER_EXPIRED_NOTICE,
  OFFER_SOLD_OUT_NOTICE,
  SALE_CLOSE_ENDS,
  SALE_CLOSE_GUARANTEE,
  SALE_CLOSE_TITLE,
  SALE_CTA_SUPPORT,
  SALE_DEMO_CAPTION,
  SALE_FAQ_TITLE,
  SALE_FOUNDER_INCLUDES,
  SALE_FOUNDER_TITLE,
  SALE_GUARANTEES,
  SALE_GUARANTEE_TITLE,
  SALE_H1,
  SALE_INCLUDED,
  SALE_INCLUDED_TITLE,
  SALE_OFFER_ENDS,
  SALE_PROMISE_TITLE,
  SALE_PROBLEM,
  SALE_PROBLEM_TITLE,
  SALE_SUB,
  SALE_WHY,
  SALE_WHY_TITLE,
  buildFaqs,
  founderAvailabilitySentence,
  founderPromiseLines,
  saleOfferState,
  seatCounterSentence,
  subscriptionPriceSentence,
  type FounderSeats,
  type SaleOfferState,
} from "@/lib/sale-page";

const NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#produkt", label: "Produkt" },
  { href: "#angebot", label: "Angebot" },
  { href: "#versprechen", label: "Versprechen" },
  { href: "#garantie", label: "Garantie" },
  { href: "#fragen", label: "Fragen" },
];

function FounderCta({ state }: { state: SaleOfferState }) {
  if (state === "open") {
    return (
      <a href={FOUNDER_CTA_HREF} className="cta-primary min-h-12 w-full px-7 sm:w-auto">
        {FOUNDER_CTA_LABEL}
      </a>
    );
  }

  const notice = state === "expired" ? OFFER_EXPIRED_NOTICE : OFFER_SOLD_OUT_NOTICE;
  return (
    <div className="w-full sm:w-auto">
      <button type="button" className="cta-primary min-h-12 w-full px-7 sm:w-auto" disabled>
        {FOUNDER_CTA_LABEL}
      </button>
      <p role="status" className="mt-3 max-w-sm text-sm leading-6" style={{ color: "var(--color-text)" }}>
        {notice}
      </p>
    </div>
  );
}

export default function PublicLanding({
  seats,
  subscriptionPrice,
  expired,
  minTermDate,
}: {
  seats: FounderSeats | null;
  subscriptionPrice: string | null;
  expired: boolean;
  minTermDate: string | null;
}) {
  const state = saleOfferState(expired, seats);
  const priceSentence = subscriptionPriceSentence(subscriptionPrice);
  const closingSeats = seatCounterSentence(seats);
  const faqs = buildFaqs(subscriptionPrice);
  const promise = founderPromiseLines(minTermDate);

  return (
    <div
      className="min-h-screen text-[color:var(--color-text)]"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 20% 0%, rgba(200,121,61,0.12), transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 15%, rgba(200,121,61,0.07), transparent 55%),
          linear-gradient(175deg, #0F0D0B 0%, #09090B 40%, #06060A 100%)
        `,
      }}
    >
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-primary)] focus:px-4 focus:py-3 focus:text-white"
      >
        Zum Inhalt
      </a>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#09090B]/85 backdrop-blur-xl">
        <div className="landing-shell flex min-h-16 items-center justify-between gap-4 py-3">
          <a href="/" className="flex items-center gap-2" aria-label="Offertio Startseite">
            <OffertioIcon size={28} theme="dark" />
            <span className="text-[15px] tracking-[-0.03em]" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              offert<em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--color-primary)" }}>io</em>
            </span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
            {NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-[13px] font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              className="ml-2 inline-flex min-h-11 items-center rounded-lg px-3 text-[13px] font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Anmelden
            </a>
          </nav>
          <div className="flex items-center gap-1 lg:hidden">
            <a href="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Anmelden
            </a>
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Menü
            </summary>
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl p-2"
              style={{ background: "rgba(9,9,11,0.96)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <nav aria-label="Mobilnavigation" className="flex flex-col">
                {NAV.map((link) => (
                  <a key={link.href} href={link.href} className="rounded-lg px-3 py-3 text-sm" style={{ color: "var(--color-text)" }}>
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </details>
          </div>
        </div>
      </header>

      <main id="inhalt">
        <section className="landing-shell pb-16 pt-12 sm:pb-24 sm:pt-20">
          <div className="max-w-3xl">
            <h1
              className="font-bold"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5.2vw, 3.75rem)",
                lineHeight: 1.08,
                letterSpacing: "-0.035em",
                textWrap: "balance",
              }}
            >
              {SALE_H1}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: "var(--color-text-muted)" }}>
              {SALE_SUB}
            </p>
            <div className="mt-8 flex flex-col items-stretch sm:items-start">
              <FounderCta state={state} />
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-text-soft)" }}>
                {SALE_CTA_SUPPORT}
              </p>
            </div>
          </div>
        </section>

        <section id="problem" className="landing-shell py-16 sm:py-24">
          <h2 className="section-title max-w-3xl">{SALE_PROBLEM_TITLE}</h2>
          <p className="section-copy mt-5 max-w-2xl">{SALE_PROBLEM}</p>
        </section>

        <section id="produkt" className="landing-shell py-16 sm:py-24">
          <h2 className="section-title max-w-3xl">{SALE_WHY_TITLE}</h2>
          <p className="section-copy mt-5 max-w-2xl">{SALE_WHY}</p>
        </section>

        {/*
          DEMO-GIF-SLOT
          Hier später das echte GIF aus Offertio einsetzen.
          Nicht anzeigen, solange keine Aufnahme vorliegt.
          Keine Zeitangabe ergänzen.
        */}
        <div hidden id="demo-gif-slot" data-demo-slot="offerte-qr-gif">
          <h2>Demo</h2>
          <p>{SALE_DEMO_CAPTION}</p>
        </div>

        <section id="inhalt-liste" className="landing-shell py-16 sm:py-24">
          <h2 className="section-title">{SALE_INCLUDED_TITLE}</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {SALE_INCLUDED.map((item) => (
              <li key={item} className="landing-card flex gap-3 p-4 text-sm leading-6 sm:p-5">
                <span aria-hidden="true" style={{ color: "var(--color-primary)" }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="angebot" className="landing-shell py-16 sm:py-24">
          <div className="landing-card-strong max-w-3xl p-6 sm:p-10">
            <h2 className="section-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
              {SALE_FOUNDER_TITLE}
            </h2>
            <p className="mt-5 text-base leading-7" style={{ color: "var(--color-text)" }}>
              {founderAvailabilitySentence(seats)}
            </p>
            {priceSentence && (
              <p className="mt-3 text-base leading-7" style={{ color: "var(--color-text-muted)" }}>
                {priceSentence}
              </p>
            )}
            <p className="mt-6 text-sm font-semibold" style={{ color: "var(--color-text)" }}>Inklusive:</p>
            <ul className="mt-3 space-y-4">
              {SALE_FOUNDER_INCLUDES.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                  <span aria-hidden="true" style={{ color: "var(--color-primary)" }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {state !== "expired" && (
              <p className="mt-6 text-sm leading-6" style={{ color: "var(--color-text)" }}>
                {SALE_OFFER_ENDS}
              </p>
            )}
          </div>
        </section>

        <section id="versprechen" className="landing-shell py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2 className="section-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
              {SALE_PROMISE_TITLE}
            </h2>
            <ul className="mt-6 space-y-4">
              {promise.map((line) => (
                <li key={line} className="flex gap-3 text-base leading-7" style={{ color: "var(--color-text-muted)" }}>
                  <span aria-hidden="true" style={{ color: "var(--color-primary)" }}>✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="garantie" className="landing-shell py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2 className="section-title" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
              {SALE_GUARANTEE_TITLE}
            </h2>
            <ol className="mt-6 list-decimal space-y-4 pl-5 text-base leading-7" style={{ color: "var(--color-text-muted)" }}>
              {SALE_GUARANTEES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <div className="mt-8">
              <FounderCta state={state} />
            </div>
          </div>
        </section>

        <section id="fragen" className="landing-shell py-16 sm:py-24">
          <h2 className="section-title">{SALE_FAQ_TITLE}</h2>
          <div className="mt-8 max-w-3xl divide-y divide-white/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="cursor-pointer list-none text-base font-semibold leading-6 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {faq.question}
                    <span aria-hidden="true" style={{ color: "var(--color-primary)" }}>+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-text-muted)" }}>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section id="schluss" className="landing-shell py-16 sm:py-28">
          <div className="max-w-3xl">
            <h2 className="section-title">{SALE_CLOSE_TITLE}</h2>
            {closingSeats && (
              <p className="mt-5 text-base leading-7" style={{ color: "var(--color-text)" }}>
                {closingSeats}
              </p>
            )}
            {state !== "expired" && (
              <p className="mt-2 text-base leading-7" style={{ color: "var(--color-text-muted)" }}>
                {SALE_CLOSE_ENDS}
              </p>
            )}
            <div className="mt-8">
              <FounderCta state={state} />
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--color-text-soft)" }}>
              {SALE_CLOSE_GUARANTEE}
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5">
        <div className="landing-shell flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ color: "var(--color-text-muted)" }}>
          <p>© 2026 Offertio · Zürich</p>
          <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="/impressum" className="min-h-11 inline-flex items-center">Impressum</a>
            <a href="/datenschutz" className="min-h-11 inline-flex items-center">Datenschutz</a>
            <a href="/agb" className="min-h-11 inline-flex items-center">AGB</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
