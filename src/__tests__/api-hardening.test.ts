import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const deleteUserMock = vi.fn();
const removeMock = vi.fn();
const uploadMock = vi.fn();
const rateLimitMock = vi.fn();
const serverProfileMock = vi.fn();
const buildZugferdXmlMock = vi.fn();
const embedZugferdXmlMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: (table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected server table in test: ${table}`);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: serverProfileMock,
          })),
        })),
      };
    },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: rateLimitMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/zugferd-xml", () => ({
  buildZugferdXml: buildZugferdXmlMock,
}));

vi.mock("@/lib/zugferd-embedder", () => ({
  embedZugferdXml: embedZugferdXmlMock,
}));

function makeAdminMock() {
  let dokumentInsertCalls = 0;

  return {
    auth: {
      admin: {
        deleteUser: deleteUserMock,
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "customers") {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { id: "customer-1" },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === "dokumente") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          })),
          insert: vi.fn(() => {
            dokumentInsertCalls += 1;
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: null,
                  error: new Error(dokumentInsertCalls === 1 ? "primary insert failed" : "legacy insert failed"),
                })),
              })),
            };
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: null,
                    error: new Error("update failed"),
                  })),
                })),
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table in test: ${table}`);
    }),
  };
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => makeAdminMock()),
}));

function sameOriginPost(path: string, body: unknown) {
  return new Request(`https://offertio.test${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://offertio.test",
    },
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } } });
  deleteUserMock.mockResolvedValue({ error: null });
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
  rateLimitMock.mockResolvedValue({ ok: true });
  serverProfileMock.mockResolvedValue({
    data: {
      email: "owner@server.test",
      firmenname: "Server GmbH",
      vorname: "Server",
      nachname: "Owner",
      adresse: "Serverstrasse 1",
      plz: "10115",
      ort: "Berlin",
      telefon: "+49 30 123",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      uid_mwst: "DE123456789",
      steuernummer: "13/123/12345",
      fn_nr: "",
      logo_url: "",
      land: "DE",
      sprache: "de",
      beruf: "Beratung",
      zahlungsfrist: 14,
      plan: "free",
      kleinunternehmer: false,
      pdf_template: "classic",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    error: null,
  });
  buildZugferdXmlMock.mockReturnValue("<xml />");
  embedZugferdXmlMock.mockResolvedValue(Buffer.from("%PDF-hardened\n"));
});

describe("account delete hardening", () => {
  it("requires an explicit server-side confirmation phrase", async () => {
    const { POST } = await import("@/app/api/account/delete/route");

    const response = await POST(sameOriginPost("/api/account/delete", {}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Bestätigung|required|erforderlich/i);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("deletes the authenticated user after explicit confirmation", async () => {
    const { POST } = await import("@/app/api/account/delete/route");

    const response = await POST(
      sameOriginPost("/api/account/delete", { confirm: "DELETE_OFFERTIO_ACCOUNT" }),
    );

    expect(response.status).toBe(200);
    expect(deleteUserMock).toHaveBeenCalledWith("user-1");
  });
});

describe("document save hardening", () => {
  it("removes an uploaded PDF if both metadata write attempts fail", async () => {
    const { POST } = await import("@/app/api/dokument/save/route");

    const response = await POST(
      sameOriginPost("/api/dokument/save", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        typ: "offerte",
        nummer: "OF-2026-001",
        kundenname: "Muster AG",
        betrag: 123.45,
        datum: "2026-04-11",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ success: false, metadataStored: false });
    expect(uploadMock).toHaveBeenCalledOnce();
    expect(removeMock).toHaveBeenCalledOnce();
    expect(removeMock.mock.calls[0][0][0]).toMatch(/^user-1\/OF-2026-001_\d+\.pdf$/);
  });
});

describe("e-rechnung generation hardening", () => {
  const baseInvoiceData = {
    nummer: "RG-2026-001",
    datum: "2026-04-11",
    kunde: {
      name: "Kunde AG",
      firma: "Kunde AG",
      adresse: "Kundenstrasse 2",
      adresse2: "",
      plz: "8000",
      ort: "Zürich",
      email: "kunde@example.com",
      uid_mwst: "DE987654321",
    },
    positionen: [{ bezeichnung: "Service", einheit: "Std", menge: 1, preis: 100 }],
    mwstSatz: 19,
    notiz: "",
    profil: {
      id: "attacker-profile",
      email: "attacker@example.com",
      firmenname: "Client Spoof GmbH",
      vorname: "Client",
      nachname: "Spoof",
      adresse: "Spoofstrasse 9",
      plz: "99999",
      ort: "Spoofstadt",
      telefon: "",
      iban: "DE00111111111111111111",
      uid_mwst: "DE000000000",
      steuernummer: "spoof-tax",
      logo_url: "",
      land: "DE",
      sprache: "de",
      beruf: "Spoofing",
      zahlungsfrist: 99,
      plan: "free",
      created_at: "2026-01-01T00:00:00.000Z",
    },
  };

  it("uses the server-side profile instead of client-provided seller profile data", async () => {
    const { POST } = await import("@/app/api/e-rechnung/generate/route");

    const response = await POST(
      sameOriginPost("/api/e-rechnung/generate", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        invoiceData: baseInvoiceData,
        leistungsdatum: "2026-04-11",
      }),
    );

    expect(response.status).toBe(200);
    expect(buildZugferdXmlMock).toHaveBeenCalledOnce();
    const hardenedInvoiceData = buildZugferdXmlMock.mock.calls[0][0];
    expect(hardenedInvoiceData.profil).toMatchObject({
      id: "user-1",
      email: "test@example.com",
      firmenname: "Server GmbH",
      adresse: "Serverstrasse 1",
      steuernummer: "13/123/12345",
      uid_mwst: "DE123456789",
      zahlungsfrist: 14,
    });
    expect(hardenedInvoiceData.profil.firmenname).not.toBe("Client Spoof GmbH");
  });

  it("rejects ZUGFeRD generation when the authenticated server profile is not German", async () => {
    serverProfileMock.mockResolvedValueOnce({
      data: {
        land: "CH",
        firmenname: "Schweizer GmbH",
        zahlungsfrist: 30,
        plan: "free",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    const { POST } = await import("@/app/api/e-rechnung/generate/route");

    const response = await POST(
      sameOriginPost("/api/e-rechnung/generate", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        invoiceData: baseInvoiceData,
      }),
    );

    expect(response.status).toBe(400);
    expect(buildZugferdXmlMock).not.toHaveBeenCalled();
  });
});
