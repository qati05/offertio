import { describe, expect, it } from "vitest";
import {
  FOUNDER_CTA_LABEL,
  FOUNDER_OFFER_DEADLINE_ISO,
  FOUNDER_TERM_LINE,
  SALE_DESCRIPTION,
  SALE_H1,
  SALE_INCLUDED,
  SALE_TITLE,
  afterSeatsAnswer,
  buildFaqs,
  founderAccessUntil,
  founderAvailabilitySentence,
  founderPromiseLines,
  getFounderMinTermDate,
  getSubscriptionPriceChf,
  isFounderOfferExpired,
  parseSeatAvailability,
  saleOfferState,
  seatCounter,
  subscriptionPriceSentence,
} from "@/lib/sale-page";

describe("subscription price placeholder", () => {
  it("reads a positive amount and keeps the written form", () => {
    expect(getSubscriptionPriceChf("29")).toBe("29");
    expect(getSubscriptionPriceChf(" 19,90 ")).toBe("19,90");
  });

  it("anchors CHF 19 when unset and hides an invalid override", () => {
    expect(getSubscriptionPriceChf(undefined)).toBe("19");
    expect(getSubscriptionPriceChf("")).toBe("19");
    expect(getSubscriptionPriceChf("CHF 29")).toBeNull();
    expect(getSubscriptionPriceChf("0")).toBeNull();
    expect(subscriptionPriceSentence(null)).toBeNull();
    expect(subscriptionPriceSentence("19")).toContain("Danach regulär CHF 19 pro Monat");
    expect(subscriptionPriceSentence("19")).toContain("CHF 190 pro Jahr");
    expect(subscriptionPriceSentence("19")).toContain("CHF 99");
  });

  it("keeps the founder term when the regular price is hidden", () => {
    expect(afterSeatsAnswer(null)).toBe(`${FOUNDER_TERM_LINE}.`);
    expect(afterSeatsAnswer("19")).toContain("danach regulär CHF 19 pro Monat");
    const without = buildFaqs(null).find((faq) => faq.question.startsWith("Was passiert"));
    expect(without?.answer).not.toMatch(/CHF 19/);
    expect(without?.answer).toContain(FOUNDER_TERM_LINE);
    expect(buildFaqs("19").some((faq) => /lifetime/i.test(faq.question + faq.answer))).toBe(false);
  });
});

describe("founder promise and access window", () => {
  it("hides dated lines until a real date is configured", () => {
    expect(getFounderMinTermDate(undefined)).toBeNull();
    expect(getFounderMinTermDate("")).toBeNull();
    expect(getFounderMinTermDate("bald")).toBeNull();
    expect(getFounderMinTermDate("31.02.2028")).toBeNull();
    expect(getFounderMinTermDate("2028-12-31")).toBe("31.12.2028");
    expect(founderPromiseLines(null)).toEqual(["Daten jederzeit als PDF/CSV exportierbar."]);
    expect(founderPromiseLines("31.12.2028")[0]).toBe("Mindestlaufzeit bis 31.12.2028.");
    expect(founderPromiseLines("31.12.2028")[2]).toContain("vor 31.12.2028");
  });

  it("sets access until two calendar years after payment", () => {
    expect(founderAccessUntil(new Date("2026-11-27T22:59:00.000Z")).toISOString()).toBe(
      "2028-11-27T22:59:00.000Z",
    );
  });
});

describe("founder offer deadline", () => {
  it("is 27.11.2026 23:59 Europe/Zurich", () => {
    expect(FOUNDER_OFFER_DEADLINE_ISO).toBe("2026-11-27T23:59:00+01:00");
    expect(isFounderOfferExpired(new Date("2026-11-27T22:58:59.000Z"))).toBe(false);
    expect(isFounderOfferExpired(new Date("2026-11-27T22:59:00.000Z"))).toBe(false);
    expect(isFounderOfferExpired(new Date("2026-11-27T22:59:01.000Z"))).toBe(true);
  });

  it("disables the offer after the deadline even when seats remain", () => {
    expect(saleOfferState(true, { remaining: 4, limit: 20 })).toBe("expired");
    expect(saleOfferState(false, { remaining: 0, limit: 20 })).toBe("sold_out");
    expect(saleOfferState(false, null)).toBe("open");
  });
});

describe("seat counter", () => {
  it("uses the real remaining count and hides unusable data", () => {
    expect(parseSeatAvailability({ remaining: 7 }, 20)).toEqual({ remaining: 7, limit: 20 });
    expect(parseSeatAvailability({ remaining: "7" }, 20)).toBeNull();
    expect(parseSeatAvailability({ remaining: 7 }, null)).toBeNull();
    expect(parseSeatAvailability(null, 20)).toBeNull();
    expect(seatCounter({ remaining: 7, limit: 20 })).toBe("noch 7 von 20 frei");
    expect(seatCounter(null)).toBeNull();
  });

  it("omits the counter clause when no live number exists", () => {
    expect(founderAvailabilitySentence(null)).toBe(
      "CHF 249 einmalig. 2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer. Nur 20 Plätze.",
    );
    expect(founderAvailabilitySentence({ remaining: 3, limit: 20 })).toBe(
      "CHF 249 einmalig. 2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer. Nur 20 Plätze, noch 3 von 20 frei.",
    );
  });
});

describe("approved copy", () => {
  it("keeps the Swiss wording and the single CTA label", () => {
    const blob = [SALE_TITLE, SALE_DESCRIPTION, SALE_H1, ...SALE_INCLUDED, FOUNDER_CTA_LABEL].join("\n");
    expect(blob).not.toMatch(/ß/);
    expect(blob).not.toMatch(/Minuten/);
    expect(blob).not.toMatch(/Lifetime|für immer nutzen|nie wieder/i);
    expect(FOUNDER_CTA_LABEL).toBe("Gründerplatz sichern, CHF 249");
  });
});
