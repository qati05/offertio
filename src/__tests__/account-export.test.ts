import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  buildAccountZip,
  buildCustomersCsv,
  isOwnedPdfPath,
  pdfArchiveName,
} from "@/lib/account-export";

describe("account export archive", () => {
  it("puts quotes, invoices and customers in CSV files inside the ZIP", () => {
    const zip = buildAccountZip({
      currency: "CHF",
      documents: [
        {
          typ: "offerte",
          nummer: "OF-2026-001",
          kundenname: "Muster AG",
          objekt: "Garten",
          betrag: 120,
          datum: "2026-03-01",
          status: "gesendet",
        },
        {
          typ: "rechnung",
          nummer: "RE-2026-004",
          kundenname: "Muster AG",
          betrag: 250.5,
          datum: "2026-03-02",
          status: "gesendet",
          source_document_nummer: "OF-2026-001",
        },
      ],
      customers: [
        {
          display_name: "Muster AG",
          email: "info@muster.ch",
          adresse: "Bahnhofstrasse 1",
          plz: "8001",
          ort: "Zürich",
          uid_mwst: "CHE-123.456.789",
        },
      ],
      pdfs: [
        { name: "pdfs/offerte-OF-2026-001.pdf", bytes: new TextEncoder().encode("%PDF-offerte") },
        { name: "pdfs/rechnung-RE-2026-004.pdf", bytes: new TextEncoder().encode("%PDF-rechnung") },
      ],
      missing: [],
    });

    const text = zip.toString("utf8");
    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(text).toContain("dokumente.csv");
    expect(text).toContain("kunden.csv");
    expect(text).toContain("offerte,OF-2026-001");
    expect(text).toContain("rechnung,RE-2026-004,OF-2026-001");
    expect(text).toContain("Muster AG,info@muster.ch,Bahnhofstrasse 1");
    expect(text).toContain("%PDF-offerte");
    expect(text).toContain("%PDF-rechnung");
    expect(text).not.toContain("../");
  });

  it("neutralises spreadsheet formulas in customer names", () => {
    const csv = buildCustomersCsv([{ display_name: "=cmd|' /C calc'!A0", email: "a@b.ch" }]);
    expect(csv.split("\n")[1].startsWith("\"'")).toBe(true);
  });

  it("only accepts PDF paths inside the owner's folder", () => {
    expect(isOwnedPdfPath("user-1", "user-1/RE-1.pdf")).toBe(true);
    expect(isOwnedPdfPath("user-1", "user-2/RE-1.pdf")).toBe(false);
    expect(isOwnedPdfPath("user-1", "user-1/../user-2/RE-1.pdf")).toBe(false);
    expect(isOwnedPdfPath("user-1", "/user-1/RE-1.pdf")).toBe(false);
    const used = new Set<string>();
    expect(pdfArchiveName("rechnung", "RE 1", used)).toBe("pdfs/rechnung-RE_1.pdf");
  });
});

const getUserMock = vi.fn();
const downloadMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true, remaining: 4, retryAfterSeconds: 0 })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    storage: { from: () => ({ download: downloadMock }) },
    from: (table: string) => ({
      select: () => ({
        eq: (_column: string, value: string) => ({
          maybeSingle: async () => ({ data: { land: "CH", email: "owner@example.com" }, error: null }),
          order: () => ({
            limit: async () => {
              if (value !== "user-1") return { data: [], error: null };
              if (table === "dokumente") {
                return {
                  data: [
                    {
                      typ: "offerte",
                      nummer: "OF-1",
                      kundenname: "Ich",
                      betrag: 10,
                      datum: "2026-01-01",
                      status: "gesendet",
                      pdf_url: "user-1/OF-1.pdf",
                    },
                    {
                      typ: "rechnung",
                      nummer: "RE-9",
                      kundenname: "Fremd",
                      betrag: 99,
                      datum: "2026-01-02",
                      status: "gesendet",
                      pdf_url: "user-2/secret.pdf",
                    },
                  ],
                  error: null,
                };
              }
              if (table === "customers") {
                return { data: [{ display_name: "Ich", email: "ich@example.ch" }], error: null };
              }
              return { data: [], error: null };
            },
          }),
        }),
      }),
    }),
  })),
}));

describe("GET /api/account/export?format=zip", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    downloadMock.mockReset();
  });

  it("refuses anonymous downloads", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET(new NextRequest("https://getoffertio.ch/api/account/export?format=zip"));
    expect(response.status).toBe(401);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("downloads only the signed-in user's PDFs", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    downloadMock.mockImplementation(async (path: string) => {
      expect(path).toBe("user-1/OF-1.pdf");
      return { data: new Blob([new TextEncoder().encode("%PDF-owner")]), error: null };
    });
    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET(new NextRequest("https://getoffertio.ch/api/account/export?format=zip"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/zip");
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.toString("utf8");
    expect(text).toContain("%PDF-owner");
    expect(text).toContain("offerte,OF-1");
    expect(text).toContain("rechnung,RE-9");
    expect(text).toContain("Ich,ich@example.ch");
    expect(text).toContain("fehlende-dateien.txt");
    expect(text).toContain("rechnung:RE-9");
    expect(downloadMock).toHaveBeenCalledTimes(1);
  });
});
