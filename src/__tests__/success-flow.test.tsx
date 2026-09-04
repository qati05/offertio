/**
 * @vitest-environment jsdom
 *
 * The suite defaults to `node`; this file needs a DOM.
 * React Testing Library renders components.
 */
﻿import { createElement, type ReactNode } from "react";
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
});
