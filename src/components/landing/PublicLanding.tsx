import { OffertioIcon } from "@/components/OffertioLogo";
import {
  FOUNDER_CTA_HREF,
  FOUNDER_CTA_LABEL,
  FOUNDER_TERM_LINE,
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
  SALE_INCLUDED_H3,
  SALE_INCLUDED_TITLE,
  SALE_KICKER,
  SALE_KMU_LINE,
  SALE_OFFER_ENDS,
  SALE_PROMISE_TITLE,
  SALE_PROBLEM,
  SALE_PROBLEM_TITLE,
  SALE_SUB,
  SALE_WHY,
  SALE_WHY_H3,
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
      <a href={FOUNDER_CTA_HREF} className="cta-primary sale-cta">
        {FOUNDER_CTA_LABEL}
      </a>
    );
  }

  const notice = state === "expired" ? OFFER_EXPIRED_NOTICE : OFFER_SOLD_OUT_NOTICE;
  return (
    <div className="w-full sm:w-auto">
      <button type="button" className="cta-primary sale-cta" disabled>
        {FOUNDER_CTA_LABEL}
      </button>
      <p role="status" className="sale-note mt-3 max-w-sm">
        {notice}
      </p>
    </div>
  );
}

function SwissCross() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="6" fill="#FFFFFF" />
      <rect x="13" y="6" width="6" height="20" fill="#D52B1E" />
      <rect x="6" y="13" width="20" height="6" fill="#D52B1E" />
    </svg>
  );
}

export default function PublicLanding({
  seats,
  subscriptionPrice,
  expired,
  minTermDate,
  dataLabel,
}: {
  seats: FounderSeats | null;
  subscriptionPrice: string | null;
  expired: boolean;
  minTermDate: string | null;
  dataLabel?: string | null;
}) {
  const state = saleOfferState(expired, seats);
  const priceSentence = subscriptionPriceSentence(subscriptionPrice);
  const closingSeats = seatCounterSentence(seats);
  const faqs = buildFaqs(subscriptionPrice);
  const promise = founderPromiseLines(minTermDate);
  const trust = ["Swiss QR-Bill", SALE_KMU_LINE, "30 Tage Geld zurück", dataLabel].filter(
    (item): item is string => Boolean(item),
  );

  return (
    <div className="sale-page min-h-screen text-[color:var(--color-text)]">
      <a href="#inhalt" className="sale-skip">
        Zum Inhalt
      </a>

      <header className="sale-header">
        <div className="landing-shell flex min-h-16 items-center justify-between gap-3 py-2">
          <a href="/" className="flex min-h-12 shrink-0 items-center gap-2" aria-label="Offertio Startseite">
            <OffertioIcon size={28} theme="dark" />
            <span className="sale-wordmark whitespace-nowrap text-[15px] tracking-[-0.03em]">
              offert<em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--color-primary)" }}>io</em>
            </span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
            {NAV.map((link) => (
              <a key={link.href} href={link.href} className="sale-nav-link">
                {link.label}
              </a>
            ))}
            <a href="/login" className="sale-nav-link">
              Anmelden
            </a>
          </nav>
          <div className="flex items-center gap-1 lg:hidden">
            <a href="/login" className="sale-nav-link">
              Anmelden
            </a>
            <details className="relative">
              <summary className="sale-nav-link cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Menü
              </summary>
              <div className="sale-menu">
                <nav aria-label="Mobilnavigation" className="flex flex-col">
                  {NAV.map((link) => (
                    <a key={link.href} href={link.href} className="sale-menu-link">
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
        <section className="landing-shell sale-hero">
          <div className="sale-hero-grid">
            <div className="sale-hero-copy min-w-0">
              <p className="sale-kicker">{SALE_KICKER}</p>
              <h1 className="sale-h1">{SALE_H1}</h1>
              <p className="sale-lead">{SALE_SUB}</p>
            </div>
            <aside className="sale-price-card" aria-label="Gründerplatz">
              <p className="sale-kicker">Gründerplatz</p>
              <p className="sale-price">CHF 249</p>
              <p className="sale-price-unit">einmalig</p>
              <p className="sale-muted mt-4">{FOUNDER_TERM_LINE}.</p>
            </aside>
            <div className="sale-hero-actions min-w-0">
              <ul className="sale-trust" aria-label="Wichtige Punkte">
                {trust.map((item) => (
                  <li key={item} className="sale-trust-item">
                    {item === "Swiss QR-Bill" ? <SwissCross /> : null}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="sale-hero-cta mt-8 flex flex-col items-stretch sm:items-start">
                <FounderCta state={state} />
                <p className="sale-note mt-3">{SALE_CTA_SUPPORT}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="landing-shell sale-section">
          <h2 className="section-title max-w-3xl">{SALE_PROBLEM_TITLE}</h2>
          <p className="section-copy sale-copy mt-5 max-w-2xl">{SALE_PROBLEM}</p>
        </section>

        <section id="produkt" className="landing-shell sale-section">
          <h2 className="section-title max-w-3xl">{SALE_WHY_TITLE}</h2>
          <h3 className="sale-h3 mt-4">{SALE_WHY_H3}</h3>
          <p className="section-copy sale-copy mt-4 max-w-2xl">{SALE_WHY}</p>
        </section>

        {/*
          DEMO-GIF-SLOT
          Hier später das echte GIF aus Offertio einsetzen.
          Nicht anzeigen, solange keine Aufnahme vorliegt.
          Keine Zeitangabe ergänzen.
        */}
        <div hidden id="demo-gif-slot" data-demo-slot="offerte-qr-gif">
          <p>Demo</p>
          <p>{SALE_DEMO_CAPTION}</p>
        </div>

        <section id="inhalt-liste" className="landing-shell sale-section">
          <h2 className="section-title">{SALE_INCLUDED_TITLE}</h2>
          <h3 className="sale-h3 mt-4">{SALE_INCLUDED_H3}</h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {SALE_INCLUDED.map((item) => (
              <li key={item} className="landing-card flex gap-3 p-4 text-sm leading-6 sm:p-5">
                <span aria-hidden="true" className="sale-check">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="angebot" className="landing-shell sale-section">
          <div className="landing-card-strong sale-offer max-w-3xl p-6 sm:p-10">
            <h2 className="section-title sale-h2-tight">{SALE_FOUNDER_TITLE}</h2>
            <p className="mt-5 text-base leading-7">{founderAvailabilitySentence(seats)}</p>
            {priceSentence && <p className="sale-muted mt-3 text-base leading-7">{priceSentence}</p>}
            <h3 className="sale-h3 mt-8">Inklusive</h3>
            <ul className="mt-4 space-y-4">
              {SALE_FOUNDER_INCLUDES.map((item) => (
                <li key={item} className="sale-muted flex gap-3 text-sm leading-6">
                  <span aria-hidden="true" className="sale-check">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {state !== "expired" && <p className="mt-6 text-sm leading-6">{SALE_OFFER_ENDS}</p>}
          </div>
        </section>

        <section id="versprechen" className="landing-shell sale-section">
          <div className="max-w-3xl">
            <h2 className="section-title sale-h2-tight">{SALE_PROMISE_TITLE}</h2>
            <ul className="mt-6 space-y-4">
              {promise.map((line) => (
                <li key={line} className="sale-muted flex gap-3 text-base leading-7">
                  <span aria-hidden="true" className="sale-check">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="garantie" className="landing-shell sale-section">
          <div className="max-w-3xl">
            <h2 className="section-title sale-h2-tight">{SALE_GUARANTEE_TITLE}</h2>
            <ol className="sale-guarantee mt-6 space-y-4">
              {SALE_GUARANTEES.map((item, index) => (
                <li key={item} className="landing-card flex gap-4 p-4 sm:p-5">
                  <span className="sale-guarantee-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="sale-muted text-base leading-7">{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <FounderCta state={state} />
            </div>
          </div>
        </section>

        <section id="fragen" className="landing-shell sale-section">
          <h2 className="section-title">{SALE_FAQ_TITLE}</h2>
          <div className="mt-6 max-w-3xl divide-y divide-white/10">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-1">
                <summary className="sale-summary">
                  <h3>{faq.question}</h3>
                  <span aria-hidden="true" className="sale-check">
                    +
                  </span>
                </summary>
                <p className="sale-muted mb-4 text-sm leading-7">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="schluss" className="landing-shell sale-section">
          <div className="landing-card-strong max-w-3xl p-6 sm:p-10">
            <h2 className="section-title sale-h2-tight">{SALE_CLOSE_TITLE}</h2>
            {closingSeats && <p className="mt-5 text-base leading-7">{closingSeats}</p>}
            {state !== "expired" && <p className="sale-muted mt-2 text-base leading-7">{SALE_CLOSE_ENDS}</p>}
            <div className="mt-8">
              <FounderCta state={state} />
            </div>
            <p className="sale-note mt-4">{SALE_CLOSE_GUARANTEE}</p>
          </div>
        </section>
      </main>

      <footer className="sale-footer">
        <div className="landing-shell flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Offertio · Zürich</p>
          <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="/impressum" className="sale-footer-link">
              Impressum
            </a>
            <a href="/datenschutz" className="sale-footer-link">
              Datenschutz
            </a>
            <a href="/agb" className="sale-footer-link">
              AGB
            </a>
          </nav>
        </div>
      </footer>

      <div className="sale-sticky-cta">
        <FounderCta state={state} />
      </div>
    </div>
  );
}
