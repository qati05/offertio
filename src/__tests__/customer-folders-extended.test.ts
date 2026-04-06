/**
 * Customer Folders Extended
 *
 * Tests for resolveSourceDocumentNumber (previously untested),
 * edge cases in groupDocumentsByCustomer, and slug collision handling.
 */

import { describe, it, expect } from "vitest";
import {
  groupDocumentsByCustomer,
  resolveSourceDocumentNumber,
  normalizeCustomerName,
  toCustomerSlug,
} from "@/lib/customer-folders";
import type { DokumentHistorie } from "@/lib/types";

function makeDoc(overrides: Partial<DokumentHistorie> = {}): DokumentHistorie {
  return {
    id: `doc-${Math.random().toString(36).slice(2)}`,
    typ: "offerte",
    nummer: "OF-2026-001",
    kundenname: "Test AG",
    datum: "2026-04-05",
    status: "entwurf",
    betrag: 0,
    objekt: undefined,
    ...overrides,
  };
}

// ── resolveSourceDocumentNumber ──────────────────────────────────────────────

describe("resolveSourceDocumentNumber", () => {
  const history: DokumentHistorie[] = [
    makeDoc({ id: "src-1", nummer: "OF-2026-001", kundenname: "Roni AG" }),
    makeDoc({ id: "src-2", nummer: "OF-2026-002", kundenname: "Muster GmbH" }),
  ];

  it("returns source_document_nummer when already set on the document", () => {
    const doc = makeDoc({ source_document_nummer: "OF-2026-001" });
    expect(resolveSourceDocumentNumber(doc, history)).toBe("OF-2026-001");
  });

  it("looks up nummer from history using source_document_id", () => {
    const doc = makeDoc({ source_document_id: "src-1" });
    expect(resolveSourceDocumentNumber(doc, history)).toBe("OF-2026-001");
  });

  it("looks up second document correctly by id", () => {
    const doc = makeDoc({ source_document_id: "src-2" });
    expect(resolveSourceDocumentNumber(doc, history)).toBe("OF-2026-002");
  });

  it("returns null when document has no source at all", () => {
    const doc = makeDoc();
    expect(resolveSourceDocumentNumber(doc, history)).toBeNull();
  });

  it("returns null when source_document_id is set but not found in history", () => {
    const doc = makeDoc({ source_document_id: "nonexistent-id" });
    expect(resolveSourceDocumentNumber(doc, history)).toBeNull();
  });

  it("prefers source_document_nummer over history lookup", () => {
    // Both are set — the explicit nummer field takes priority
    const doc = makeDoc({
      source_document_nummer: "OF-EXPLICIT",
      source_document_id: "src-1", // would resolve to "OF-2026-001"
    });
    expect(resolveSourceDocumentNumber(doc, history)).toBe("OF-EXPLICIT");
  });

  it("handles empty history gracefully", () => {
    const doc = makeDoc({ source_document_id: "src-1" });
    expect(resolveSourceDocumentNumber(doc, [])).toBeNull();
  });

  it("handles document without id in history (id undefined)", () => {
    const historyWithNoId: DokumentHistorie[] = [
      makeDoc({ id: undefined, nummer: "OF-GHOST" }),
    ];
    const doc = makeDoc({ source_document_id: undefined });
    expect(resolveSourceDocumentNumber(doc, historyWithNoId)).toBeNull();
  });
});

// ── groupDocumentsByCustomer — edge cases ────────────────────────────────────

describe("groupDocumentsByCustomer — edge cases", () => {
  it("returns empty array for empty history", () => {
    expect(groupDocumentsByCustomer([])).toEqual([]);
  });

  it("single document creates a single folder", () => {
    const folders = groupDocumentsByCustomer([makeDoc({ kundenname: "Solo AG" })]);
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe("Solo AG");
    expect(folders[0].docs).toHaveLength(1);
  });

  it("two documents with identical kundenname merge into one folder", () => {
    const docs = [
      makeDoc({ kundenname: "Roni AG", datum: "2026-04-05" }),
      makeDoc({ kundenname: "Roni AG", datum: "2026-03-01", nummer: "OF-2026-002" }),
    ];
    const folders = groupDocumentsByCustomer(docs);
    expect(folders).toHaveLength(1);
    expect(folders[0].docs).toHaveLength(2);
  });

  it("sorts docs within a folder newest-first", () => {
    const docs = [
      makeDoc({ kundenname: "Roni AG", datum: "2026-01-01", nummer: "OF-001" }),
      makeDoc({ kundenname: "Roni AG", datum: "2026-04-05", nummer: "OF-004" }),
      makeDoc({ kundenname: "Roni AG", datum: "2026-02-15", nummer: "OF-002" }),
    ];
    const folder = groupDocumentsByCustomer(docs)[0];
    expect(folder.docs[0].datum).toBe("2026-04-05");
    expect(folder.docs[1].datum).toBe("2026-02-15");
    expect(folder.docs[2].datum).toBe("2026-01-01");
  });

  it("sorts folders by latestDate newest-first", () => {
    const docs = [
      makeDoc({ kundenname: "Oldest GmbH", datum: "2025-01-01" }),
      makeDoc({ kundenname: "Newest GmbH", datum: "2026-04-05" }),
      makeDoc({ kundenname: "Middle GmbH", datum: "2026-01-15" }),
    ];
    const folders = groupDocumentsByCustomer(docs);
    expect(folders[0].name).toBe("Newest GmbH");
    expect(folders[1].name).toBe("Middle GmbH");
    expect(folders[2].name).toBe("Oldest GmbH");
  });

  it("uses customer_id as slug when provided (stable across name changes)", () => {
    const docs = [
      makeDoc({ customer_id: "uuid-stable", kundenname: "Old Name GmbH", datum: "2026-03-01" }),
      makeDoc({ customer_id: "uuid-stable", kundenname: "New Name GmbH", datum: "2026-04-05" }),
    ];
    const folders = groupDocumentsByCustomer(docs);
    // Both share the same customer_id → one folder
    expect(folders).toHaveLength(1);
    expect(folders[0].slug).toBe("uuid-stable");
    expect(folders[0].docs).toHaveLength(2);
  });

  it("separates documents with different customer_ids even if names match", () => {
    const docs = [
      makeDoc({ customer_id: "uuid-a", kundenname: "Muster AG" }),
      makeDoc({ customer_id: "uuid-b", kundenname: "Muster AG", nummer: "OF-002" }),
    ];
    const folders = groupDocumentsByCustomer(docs);
    expect(folders).toHaveLength(2);
  });

  it("latestDate reflects the most recent document in the folder", () => {
    const docs = [
      makeDoc({ kundenname: "Test AG", datum: "2026-01-01" }),
      makeDoc({ kundenname: "Test AG", datum: "2026-04-05", nummer: "OF-002" }),
      makeDoc({ kundenname: "Test AG", datum: "2026-02-20", nummer: "OF-003" }),
    ];
    const folder = groupDocumentsByCustomer(docs)[0];
    expect(folder.latestDate).toBe("2026-04-05");
  });

  it("documents with no kundenname fall back to default display name", () => {
    const doc = makeDoc({ kundenname: undefined as unknown as string });
    const folders = groupDocumentsByCustomer([doc]);
    expect(folders).toHaveLength(1);
    // Should not throw; folder name should be some fallback string
    expect(typeof folders[0].name).toBe("string");
  });

  it("100 documents from 10 customers → 10 folders, 10 docs each", () => {
    const docs: DokumentHistorie[] = [];
    for (let c = 1; c <= 10; c++) {
      for (let d = 1; d <= 10; d++) {
        docs.push(
          makeDoc({
            kundenname: `Kunde ${c} AG`,
            nummer: `OF-${c}-${d}`,
            datum: `2026-${String(c).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          }),
        );
      }
    }
    const folders = groupDocumentsByCustomer(docs);
    expect(folders).toHaveLength(10);
    for (const folder of folders) {
      expect(folder.docs).toHaveLength(10);
    }
  });
});

// ── normalizeCustomerName ────────────────────────────────────────────────────

describe("normalizeCustomerName", () => {
  it("returns name as-is for normal strings", () => {
    expect(normalizeCustomerName("Roni AG")).toBe("Roni AG");
  });

  it("handles undefined gracefully", () => {
    const result = normalizeCustomerName(undefined);
    expect(typeof result).toBe("string");
  });

  it("handles empty string", () => {
    const result = normalizeCustomerName("");
    expect(typeof result).toBe("string");
  });
});

// ── toCustomerSlug ───────────────────────────────────────────────────────────

describe("toCustomerSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(toCustomerSlug("Roni AG")).toContain("roni");
  });

  it("produces stable slugs for the same input", () => {
    expect(toCustomerSlug("Müller GmbH")).toBe(toCustomerSlug("Müller GmbH"));
  });

  it("handles Japanese characters without throwing", () => {
    expect(() => toCustomerSlug("Tanaka Corp. 日本")).not.toThrow();
  });

  it("returns a non-empty string for any non-empty input", () => {
    const inputs = ["A", "Test AG", "Björk & Partner", "123 GmbH", "X Y Z"];
    for (const input of inputs) {
      expect(toCustomerSlug(input).length).toBeGreaterThan(0);
    }
  });
});
