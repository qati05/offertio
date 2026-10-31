import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LifetimeCheckout from "@/components/LifetimeCheckout";

const readyStatus = {
  configured: true,
  priceChf: 249,
  currency: "CHF",
  productName: "Lifetime / Gründerplatz",
  seatLimit: 20,
  soldOut: false,
  remaining: 7,
  alreadyLifetime: false,
};

describe("LifetimeCheckout", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("shows the offer and keeps checkout disabled when Stripe is not configured", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ...readyStatus, configured: false, remaining: null }), { status: 200 }),
    ) as typeof fetch;

    render(<LifetimeCheckout />);

    expect(await screen.findByText(/Zahlungsfreischaltung folgt/)).toBeInTheDocument();
    expect(screen.getByText(/CHF 249/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gründerplatz sichern" })).not.toBeInTheDocument();
  });

  it("starts Stripe Checkout when the offer is on sale", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test" }), { status: 200 });
      }
      return new Response(JSON.stringify(readyStatus), { status: 200 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    render(<LifetimeCheckout />);
    const button = await screen.findByRole("button", { name: "Gründerplatz sichern" });
    expect(screen.getByText(/Noch 7 von 20 Gründerplätzen frei/)).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/checkout/lifetime", { method: "POST" });
    });
  });

  it("shows the sold-out state and does not offer checkout", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ...readyStatus, soldOut: true, remaining: 0 }), { status: 200 }),
    ) as typeof fetch;

    render(<LifetimeCheckout />);
    expect(await screen.findByText(/Alle Gründerplätze sind vergeben/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gründerplatz sichern" })).not.toBeInTheDocument();
  });
});
