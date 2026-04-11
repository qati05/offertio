import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const deleteUserMock = vi.fn();
const removeMock = vi.fn();
const uploadMock = vi.fn();
const rateLimitMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
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
