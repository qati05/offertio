import { createElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingFooter from "@/components/LandingFooter";
import LandingNavbar from "@/components/LandingNavbar";
import OffertioLogo from "@/components/OffertioLogo";

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

describe("landing brand surfaces", () => {
  it("keeps the navbar brand and primary navigation links", () => {
    render(createElement(LandingNavbar));

    expect(
      screen.getByRole("link", { name: /offertio/i })
    ).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: /produkt/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /men/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kostenlos starten/i })).toHaveAttribute("href", "/login");
  });

  it("keeps the footer brand copy and legal links", () => {
    render(createElement(LandingFooter));

    expect(screen.getAllByText(/weniger nacharbeit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^impressum$/i })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /^datenschutz$/i })).toHaveLength(1);
    expect(screen.getByText(/^offertio$/i)).toBeInTheDocument();
  });

  it("renders the default logo as a linked icon plus wordmark", () => {
    const { container } = render(createElement(OffertioLogo));

    expect(
      screen.getByRole("link", { name: /offertio/i })
    ).toHaveAttribute("href", "/");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
