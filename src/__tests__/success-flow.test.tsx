import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import DokumentSuccessPage from "@/app/(app)/dokument/success/page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase to simulate a Pro user
vi.mock("@/lib/supabase-browser", () => ({
  createSupabaseBrowser: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "test-user" } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { plan: "pro_monthly" } }),
        }),
      }),
    }),
  }),
}));

describe("document success flow", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("stores the carryover draft before opening invoice creation", async () => {
    const carryoverDraft = {
      dokumentTyp: "rechnung",
      sourceDocumentId: "doc-offerte-1",
      sourceDocumentNumber: "OF-2026-001",
      kunde: { name: "Müller GmbH" },
      positionen: [{ bezeichnung: "Service", menge: 1, preis: 100 }],
    };

    sessionStorage.setItem(
      "dokument-success",
      JSON.stringify({
        typ: "offerte",
        nummer: "OF-2026-001",
        email: "kunde@example.com",
        downloaded: false,
        delivery: "email",
        carryoverDraft,
      }),
    );

    render(createElement(DokumentSuccessPage));

    await waitFor(() => {
      expect(screen.getByText(/als rechnung weiterführen/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/als rechnung weiterführen/i));

    expect(localStorage.getItem("dokument-draft")).toBe(JSON.stringify(carryoverDraft));
  });

  it("shows conversion card for Pro users on offerte success", async () => {
    sessionStorage.setItem(
      "dokument-success",
      JSON.stringify({
        typ: "offerte",
        nummer: "OF-2026-002",
        email: null,
        downloaded: true,
        delivery: "download",
      }),
    );

    render(createElement(DokumentSuccessPage));

    // Pro mock is active, so the conversion link should appear
    await waitFor(() => {
      expect(screen.getByText(/neue rechnung erstellen/i)).toBeInTheDocument();
    });
  });
});
