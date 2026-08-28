import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const deleteUserMock = vi.fn();
const removeMock = vi.fn();
const uploadMock = vi.fn();
const rateLimitMock = vi.fn();
const serverProfileMock = vi.fn();
const exportProfileMock = vi.fn();
const exportDokumenteMock = vi.fn();
const exportCustomersMock = vi.fn();
const exportVorlagenMock = vi.fn();
const buildZugferdXmlMock = vi.fn();
const embedZugferdXmlMock = vi.fn();
const customerUpsertMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn((columns: string) => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => {
                return columns.includes("onboarding_complete")
                  ? exportProfileMock()
                  : serverProfileMock();
              }),
            })),
          })),
        };
      }

      const tableMocks: Record<string, ReturnType<typeof vi.fn>> = {
        dokumente: exportDokumenteMock,
        customers: exportCustomersMock,
        vorlagen: exportVorlagenMock,
      };

      const tableMock = tableMocks[table];
      if (!tableMock) {
        throw new Error(`Unexpected server table in test: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: tableMock,
            })),
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
              single: vi.fn(async () => customerUpsertMock()),
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
              like: vi.fn(() => ({
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

function crossOriginRequest(path: string, method = "POST") {
  return new Request(`https://offertio.test${path}`, {
    method,
    headers: {
      origin: "https://evil.test",
    },
  }) as never;
}

function sameOriginGet(path: string, withOrigin = true) {
  return new Request(`https://offertio.test${path}`, {
    method: "GET",
    headers: withOrigin ? { origin: "https://offertio.test" } : {},
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
  exportProfileMock.mockResolvedValue({ data: { email: "test@example.com" }, error: null });
  exportDokumenteMock.mockResolvedValue({ data: [], error: null });
  exportCustomersMock.mockResolvedValue({ data: [], error: null });
  exportVorlagenMock.mockResolvedValue({ data: [], error: null });
  customerUpsertMock.mockReturnValue({ data: { id: "customer-1" }, error: null });
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

describe("account export hardening", () => {
  it("allows authenticated GET exports without an Origin header", async () => {
    const { GET } = await import("@/app/api/account/export/route");

    const response = await GET(sameOriginGet("/api/account/export", false));

    expect(response.status).toBe(200);
    expect(getUserMock).toHaveBeenCalledOnce();
  });

  it("rejects cross-origin authenticated GET exports", async () => {
    const { GET } = await import("@/app/api/account/export/route");

    const response = await GET(crossOriginRequest("/api/account/export", "GET"));

    expect(response.status).toBe(403);
    expect(getUserMock).not.toHaveBeenCalled();
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

  it("fails with 500 when customer upsert errors instead of saving with null customer_id", async () => {
    // Regression: the route previously logged customerError and continued,
    // creating a dokument with customer_id=null (silent data-integrity loss).
    customerUpsertMock.mockReturnValue({ data: null, error: new Error("upsert failed") });

    const { POST } = await import("@/app/api/dokument/save/route");

    const response = await POST(
      sameOriginPost("/api/dokument/save", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        typ: "offerte",
        nummer: "OF-2026-002",
        kundenname: "Muster AG",
        betrag: 123.45,
        datum: "2026-04-11",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/Kunden/i);
    // PDF upload must not happen when customer upsert fails.
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects AT Rechnungen ≥ EUR 10.000 without recipient UID (§11 Abs. 1 Z 8 UStG)", async () => {
    serverProfileMock.mockResolvedValueOnce({
      data: { land: "AT", uid_mwst: "ATU12345678", kleinunternehmer: false },
      error: null,
    });

    const { POST } = await import("@/app/api/dokument/save/route");

    const response = await POST(
      sameOriginPost("/api/dokument/save", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        typ: "rechnung",
        nummer: "RE-2026-010",
        kundenname: "Alpenbau GmbH",
        kunde: { name: "Alpenbau GmbH" },
        betrag: 12_500,
        datum: "2026-04-11",
        leistungsdatum: "2026-04-11",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/UID/i);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("accepts AT Rechnungen below EUR 10.000 without recipient UID", async () => {
    serverProfileMock.mockResolvedValueOnce({
      data: { land: "AT", uid_mwst: "ATU12345678", kleinunternehmer: false },
      error: null,
    });

    const { POST } = await import("@/app/api/dokument/save/route");

    const response = await POST(
      sameOriginPost("/api/dokument/save", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        typ: "rechnung",
        nummer: "RE-2026-011",
        kundenname: "Kleinkunde",
        kunde: { name: "Kleinkunde" },
        betrag: 500,
        datum: "2026-04-11",
        leistungsdatum: "2026-04-11",
      }),
    );

    // Should pass the UID check and proceed to insert (which fails in the mock),
    // yielding 500 — NOT 400 from the UID guard.
    expect(response.status).not.toBe(400);
  });

  it("rejects AT Rechnungen when seller has no UID and is not Kleinunternehmer (§11 Abs. 1 Z 6 UStG)", async () => {
    serverProfileMock.mockResolvedValueOnce({
      data: { land: "AT", uid_mwst: null, kleinunternehmer: false },
      error: null,
    });

    const { POST } = await import("@/app/api/dokument/save/route");

    const response = await POST(
      sameOriginPost("/api/dokument/save", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        typ: "rechnung",
        nummer: "RE-2026-012",
        kundenname: "Kleinkunde",
        kunde: { name: "Kleinkunde" },
        betrag: 500,
        datum: "2026-04-11",
        leistungsdatum: "2026-04-11",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/eigene UID|§11/i);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("accepts AT Rechnungen when seller is Kleinunternehmer (no seller UID required)", async () => {
    serverProfileMock.mockResolvedValueOnce({
      data: { land: "AT", uid_mwst: null, kleinunternehmer: true },
      error: null,
    });

    const { POST } = await import("@/app/api/dokument/save/route");

    const response = await POST(
      sameOriginPost("/api/dokument/save", {
        pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
        typ: "rechnung",
        nummer: "RE-2026-013",
        kundenname: "Kleinkunde",
        kunde: { name: "Kleinkunde" },
        betrag: 500,
        datum: "2026-04-11",
        leistungsdatum: "2026-04-11",
      }),
    );

    expect(response.status).not.toBe(400);
  });
});

describe("logo upload hardening", () => {
  it("rejects cross-origin logo uploads before auth or file parsing", async () => {
    const { POST } = await import("@/app/api/profile/upload-logo/route");

    const response = await POST(crossOriginRequest("/api/profile/upload-logo"));

    expect(response.status).toBe(403);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
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

describe("document save · §13b reverse charge guard", () => {
  const base = {
    pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
    typ: "rechnung",
    nummer: "R-2026-013",
    kundenname: "General Bau AG",
    betrag: 4000,
    datum: "2026-03-01",
    // DE invoices require a Leistungsdatum; supplied so the reverse-charge
    // rules are what the assertions actually exercise.
    leistungsdatum: "2026-02-28",
    steuerfall: "reverse_charge_13b_4",
    kunde: { name: "General Bau AG", uid_mwst: "DE987654321" },
  };

  async function save(overrides: Record<string, unknown> = {}) {
    const { POST } = await import("@/app/api/dokument/save/route");
    const response = await POST(
      sameOriginPost("/api/dokument/save", { ...base, ...overrides }),
    );
    return { response, body: await response.json() };
  }

  it("rejects an unknown Steuerfall", async () => {
    const { response } = await save({ steuerfall: "reverse_charge_made_up" });
    expect(response.status).toBe(400);
  });

  it("rejects reverse charge on an Offerte", async () => {
    // An Angebot creates no tax liability, so it cannot shift one.
    const { response } = await save({ typ: "offerte" });
    expect(response.status).toBe(422);
  });

  it("rejects a missing recipient VAT id", async () => {
    // EN 16931 BR-AE-02 ff.: without both VAT ids the e-invoice is invalid,
    // so the document is refused rather than produced and rejected later.
    const { response, body } = await save({ kunde: { name: "General Bau AG" } });
    expect(response.status).toBe(422);
    expect(body.code).toBe("buyer_vat_id_required");
  });

  it("rejects an issuer without a USt-IdNr.", async () => {
    serverProfileMock.mockResolvedValue({
      data: { land: "DE", uid_mwst: "", kleinunternehmer: false },
      error: null,
    });
    const { response, body } = await save();
    expect(response.status).toBe(422);
    expect(body.code).toBe("seller_vat_id_required");
  });

  it("rejects a Kleinunternehmer issuer", async () => {
    serverProfileMock.mockResolvedValue({
      data: { land: "DE", uid_mwst: "DE123456789", kleinunternehmer: true },
      error: null,
    });
    const { response, body } = await save();
    expect(response.status).toBe(422);
    expect(body.code).toBe("kleinunternehmer_unsupported");
  });

  it("rejects reverse charge outside Germany", async () => {
    serverProfileMock.mockResolvedValue({
      data: { land: "CH", uid_mwst: "CHE-123.456.789", kleinunternehmer: false },
      error: null,
    });
    const { response, body } = await save();
    expect(response.status).toBe(422);
    expect(body.code).toBe("land_not_supported");
  });

  it("rejects a malformed USt-1-TG date", async () => {
    const { response } = await save({ ust1tgDatum: "28.02.2026" });
    expect(response.status).toBe(400);
  });

  it("rejects an over-long USt-1-TG reference", async () => {
    const { response } = await save({ ust1tgReferenz: "x".repeat(201) });
    expect(response.status).toBe(400);
  });
});

describe("document save · money precision", () => {
  const base = {
    pdfBase64: Buffer.from("%PDF-1.4\n").toString("base64"),
    typ: "offerte",
    nummer: "OF-2026-050",
    kundenname: "Muster AG",
    betrag: 100,
    datum: "2026-03-01",
  };

  async function save(positionen: unknown) {
    const { POST } = await import("@/app/api/dokument/save/route");
    const response = await POST(sameOriginPost("/api/dokument/save", { ...base, positionen }));
    return { response, body: await response.json() };
  }

  it("rejects a sub-cent unit price", async () => {
    // Would otherwise make the PDF total and the EN 16931 header total
    // disagree by a cent — the standard sums rounded line amounts, the PDF
    // sums raw products.
    const { response, body } = await save([
      { bezeichnung: "A", einheit: "Std.", menge: 2, preis: 0.005 },
    ]);
    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Nachkommastellen/);
  });

  it("rejects a sub-cent quantity", async () => {
    const { response } = await save([
      { bezeichnung: "A", einheit: "Std.", menge: 1.005, preis: 10 },
    ]);
    expect(response.status).toBe(400);
  });

  it("rejects a non-numeric price", async () => {
    const { response } = await save([
      { bezeichnung: "A", einheit: "Std.", menge: 1, preis: "12,50" },
    ]);
    expect(response.status).toBe(400);
  });

  it("accepts ordinary two-decimal money", async () => {
    // Reaches the storage layer rather than being rejected as malformed.
    const { response } = await save([
      { bezeichnung: "A", einheit: "Std.", menge: 2, preis: 120.55 },
    ]);
    expect(response.status).not.toBe(400);
  });
});
