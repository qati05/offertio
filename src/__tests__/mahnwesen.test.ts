import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const rateLimitMock = vi.fn();
const maybeSingleReadMock = vi.fn();
const maybeSingleUpdateMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: rateLimitMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Shared mock that both mark-paid and mahnung routes hit. Both do:
//   1. supabase.from("dokumente").select(...).eq("id", id).eq("user_id", uid).maybeSingle()
//   2. supabase.from("dokumente").update(...).eq("id", id).eq("user_id", uid).select(...).maybeSingle()
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: maybeSingleReadMock }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: maybeSingleUpdateMock }),
          }),
        }),
      }),
    }),
  })),
}));

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

function makeReq(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue({ ok: true });
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("/api/dokument/mark-paid", () => {
  it("returns 400 on invalid UUID", async () => {
    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(makeReq("/api/dokument/mark-paid", { id: "not-a-uuid" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(makeReq("/api/dokument/mark-paid", { id: VALID_UUID }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 404 when document doesn't exist", async () => {
    maybeSingleReadMock.mockResolvedValue({ data: null, error: null });
    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(makeReq("/api/dokument/mark-paid", { id: VALID_UUID }) as never);
    expect(res.status).toBe(404);
  });

  it("returns 422 when document is an offerte (offerten can't be paid)", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: { id: VALID_UUID, typ: "offerte", status: "gesendet", payment_received_at: null },
      error: null,
    });
    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(makeReq("/api/dokument/mark-paid", { id: VALID_UUID }) as never);
    expect(res.status).toBe(422);
  });

  it("returns alreadyPaid without overwriting when already bezahlt", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        typ: "rechnung",
        status: "bezahlt",
        payment_received_at: "2026-01-15T10:00:00Z",
      },
      error: null,
    });
    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(makeReq("/api/dokument/mark-paid", { id: VALID_UUID }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      alreadyPaid: true,
      payment_received_at: "2026-01-15T10:00:00Z",
    });
    // Critical: no UPDATE issued when already paid — preserves audit trail.
    expect(maybeSingleUpdateMock).not.toHaveBeenCalled();
  });

  it("marks a sent Rechnung as paid and clears Mahnstufe", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: { id: VALID_UUID, typ: "rechnung", status: "gesendet", payment_received_at: null },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        status: "bezahlt",
        payment_received_at: "2026-04-21T12:00:00Z",
        mahnstufe: 0,
      },
      error: null,
    });

    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(makeReq("/api/dokument/mark-paid", { id: VALID_UUID }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.document.status).toBe("bezahlt");
    expect(body.document.mahnstufe).toBe(0);
  });

  it("rejects malformed paid_at", async () => {
    const { PATCH } = await import("@/app/api/dokument/mark-paid/route");
    const res = await PATCH(
      makeReq("/api/dokument/mark-paid", { id: VALID_UUID, paid_at: "not-a-date" }) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/dokument/mahnung", () => {
  it("returns 400 on invalid UUID", async () => {
    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(makeReq("/api/dokument/mahnung", { id: "not-a-uuid" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when stage is out of range", async () => {
    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(
      makeReq("/api/dokument/mahnung", { id: VALID_UUID, stage: 99 }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 422 when Rechnung is already paid", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        typ: "rechnung",
        status: "bezahlt",
        mahnstufe: 0,
        payment_received_at: "2026-03-01T10:00:00Z",
      },
      error: null,
    });
    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(makeReq("/api/dokument/mahnung", { id: VALID_UUID }) as never);
    expect(res.status).toBe(422);
  });

  it("returns 422 when target stage <= current (no regression)", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        typ: "rechnung",
        status: "ueberfaellig",
        mahnstufe: 2,
        payment_received_at: null,
      },
      error: null,
    });
    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(
      makeReq("/api/dokument/mahnung", { id: VALID_UUID, stage: 1 }) as never,
    );
    expect(res.status).toBe(422);
    expect(maybeSingleUpdateMock).not.toHaveBeenCalled();
  });

  it("defaults to current+1 and caps at 3", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        typ: "rechnung",
        status: "ueberfaellig",
        mahnstufe: 2,
        payment_received_at: null,
      },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({
      data: { id: VALID_UUID, mahnstufe: 3, last_mahnung_at: "2026-04-21T12:00:00Z", status: "ueberfaellig" },
      error: null,
    });

    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(makeReq("/api/dokument/mahnung", { id: VALID_UUID }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.stage).toBe(3);
  });

  it("flips status from gesendet to ueberfaellig when escalating", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        typ: "rechnung",
        status: "gesendet",
        mahnstufe: 0,
        payment_received_at: null,
      },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({
      data: { id: VALID_UUID, mahnstufe: 1, last_mahnung_at: "2026-04-21T12:00:00Z", status: "ueberfaellig" },
      error: null,
    });

    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(makeReq("/api/dokument/mahnung", { id: VALID_UUID }) as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.document.status).toBe("ueberfaellig");
    expect(body.stage).toBe(1);
  });

  it("rejects Mahnung on an Offerte", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: VALID_UUID,
        typ: "offerte",
        status: "gesendet",
        mahnstufe: 0,
        payment_received_at: null,
      },
      error: null,
    });
    const { POST } = await import("@/app/api/dokument/mahnung/route");
    const res = await POST(makeReq("/api/dokument/mahnung", { id: VALID_UUID }) as never);
    expect(res.status).toBe(422);
  });
});
