import { createElement, type ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicLanding from "@/components/landing/PublicLanding";
import { SALE_DEMO_CAPTION, SALE_H1 } from "@/lib/sale-page";

function renderLanding(props: Partial<ComponentProps<typeof PublicLanding>> = {}) {
  return render(
    createElement(PublicLanding, {
      seats: { remaining: 7, limit: 20 },
      subscriptionPrice: "19",
      expired: false,
      minTermDate: null,
      ...props,
    }),
  );
}

describe("public landing", () => {
  it("shows the approved headline and three identical checkout links", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 1, name: SALE_H1 })).toBeInTheDocument();
    const ctas = screen.getAllByRole("link", { name: "Gründerplatz sichern, CHF 249" });
    expect(ctas).toHaveLength(3);
    for (const cta of ctas) expect(cta).toHaveAttribute("href", "/gruenderplatz");
    expect(screen.getByText(/noch 7 von 20 frei/)).toBeInTheDocument();
    expect(screen.getByText("Noch 7 von 20 frei.")).toBeInTheDocument();
    expect(screen.getAllByText(/2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Unser Versprechen an Gründer" })).toBeInTheDocument();
    expect(screen.getByText("Daten jederzeit als PDF/CSV exportierbar.")).toBeInTheDocument();
    expect(screen.queryByText(/Mindestlaufzeit/)).not.toBeInTheDocument();
  });

  it("hides the seat counter without live data and the dated promise without a term date", () => {
    renderLanding({ seats: null, subscriptionPrice: null, minTermDate: null });
    expect(screen.queryByText(/danach regulär CHF/)).not.toBeInTheDocument();
    expect(screen.queryByText(/von 20 frei/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mindestlaufzeit/)).not.toBeInTheDocument();
    expect(screen.getByText("Daten jederzeit als PDF/CSV exportierbar.")).toBeInTheDocument();
    expect(document.body.textContent).toContain("2 Jahre inklusive, danach Gründerpreis CHF 9 pro Monat für immer");
  });

  it("shows the minimum term only when a date is configured", () => {
    renderLanding({ minTermDate: "31.12.2028" });
    expect(screen.getByText("Mindestlaufzeit bis 31.12.2028.")).toBeInTheDocument();
    expect(screen.getByText(/anteiliger Rückerstattung vor 31\.12\.2028/)).toBeInTheDocument();
  });

  it("shows the subscription sentence only when a price is configured", () => {
    renderLanding({ subscriptionPrice: "29" });
    expect(screen.getByText(/Danach regulär CHF 29 pro Monat oder CHF 190 pro Jahr/)).toBeInTheDocument();
    expect(document.body.textContent).toContain("danach regulär CHF 29 pro Monat");
  });

  it("disables every CTA after the deadline", () => {
    renderLanding({ expired: true });
    const buttons = screen.getAllByRole("button", { name: "Gründerplatz sichern, CHF 249" });
    expect(buttons).toHaveLength(3);
    for (const button of buttons) expect(button).toBeDisabled();
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/27\.11\.2026 um 23:59/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Gründerplatz sichern, CHF 249" })).not.toBeInTheDocument();
  });

  it("keeps the demo slot hidden and makes no time claim", () => {
    const { container } = renderLanding();
    const slot = container.querySelector("[data-demo-slot='offerte-qr-gif']");
    expect(slot).not.toBeNull();
    expect(slot).toHaveAttribute("hidden");
    expect(slot?.textContent).toContain(SALE_DEMO_CAPTION);
    expect(container.textContent).not.toMatch(/Minuten/);
    expect(container.textContent).not.toMatch(/ß/);
    expect(container.querySelector("img, video")).toBeNull();
  });
});
