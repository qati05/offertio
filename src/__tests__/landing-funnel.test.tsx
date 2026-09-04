/**
 * @vitest-environment jsdom
 *
 * The suite defaults to `node`. This file needs a DOM.
 */
import { createElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingHero from "@/components/LandingHero";
import LandingPricing from "@/components/LandingPricing";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/lib/analytics", () => ({
  trackCtaClick: vi.fn(),
}));

describe("landing funnel messaging", () => {
  it("renders the hero promise and primary CTA pointing at /login", () => {
    render(createElement(LandingHero));

    expect(screen.getByText(/offerten und rechnungen/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /kostenlos starten/i }),
    ).toHaveAttribute("href", "/login");
  });

  it("exposes a Pro plan CTA linking to the pro signup", () => {
    render(createElement(LandingPricing));

    const proCta = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("href")?.includes("plan=pro"));
    expect(proCta).toBeTruthy();
  });

  it("still offers a free-plan action landing on /login", () => {
    render(createElement(LandingPricing));

    const freePlan = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("href") === "/login");
    expect(freePlan).toBeTruthy();
  });
});
