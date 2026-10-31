import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StartLifetimeCheckout from "@/components/StartLifetimeCheckout";

describe("StartLifetimeCheckout", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("starts the existing lifetime checkout", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<StartLifetimeCheckout />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/checkout/lifetime", {
        method: "POST",
        redirect: "manual",
        credentials: "same-origin",
      });
    });
    expect(screen.getByRole("heading", { name: "Gründerplatz sichern, CHF 249" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
