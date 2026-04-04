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
  it("keeps a softer time-saving hero promise and primary CTA", () => {
    render(createElement(LandingHero));

    expect(screen.getByText(/offerten und rechnungen/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kostenlos starten/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByText(/60 sekunden/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/direkt per e-mail versenden/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ein klick reicht/i)).not.toBeInTheDocument();
  });

  it("keeps both entry and pro-upgrade pricing actions visible", () => {
    render(createElement(LandingPricing));

    expect(screen.getByRole("link", { name: /kostenlos starten/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /pro freischalten/i })).toHaveAttribute("href", "/login");
  });
});
