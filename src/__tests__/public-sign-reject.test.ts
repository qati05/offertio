import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      // SELECT chain: .select().eq().maybeSingle()
      select: (cols: string) => {
        if (cols === "id") {
          // UPDATE path: .update().eq().eq().select("id").maybeSingle()
          return { maybeSingle: maybeSingleUpdateMock };
        }
        return {
          eq: () => ({ maybeSingle: maybeSingleReadMock }),
        };
      },
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({ maybeSingle: maybeSingleUpdateMock }),
          }),
        }),
      }),
    }),
  }),
}));

function makeRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept-language": "de",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue({ ok: true });
  // Must set feature flag before each test since route reads at request time.
  process.env.NEXT_PUBLIC_ENABLE_SIGNING = "true";
});

const TOKEN = "11111111-1111-4111-8111-111111111111";
const SIGNATURE = "M 10 10 L 20 20 L 30 15";

describe("/api/public/sign — TOCTOU hardening", () => {
  it("returns alreadySigned when the status-guarded UPDATE matches zero rows", async () => {
    // Initial read sees a signable doc, but a concurrent request already flipped
    // it to "angenommen" before our UPDATE — the WHERE status="gesendet"
    // predicate filters the row out.
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: "doc-1",
        typ: "offerte",
        status: "gesendet",
        nummer: "OF-2026-001",
        kundenname: "Test",
        user_id: "u1",
      },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("@/app/api/public/sign/route");
    const res = await POST(
      makeRequest("/api/public/sign", { token: TOKEN, signature: SIGNATURE }) as never,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, alreadySigned: true });
  });

  it("returns ok with nummer when the atomic UPDATE succeeds", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: "doc-1",
        typ: "offerte",
        status: "gesendet",
        nummer: "OF-2026-001",
        kundenname: "Test Kunde",
        user_id: "u1",
      },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({ data: { id: "doc-1" }, error: null });

    const { POST } = await import("@/app/api/public/sign/route");
    const res = await POST(
      makeRequest("/api/public/sign", { token: TOKEN, signature: SIGNATURE }) as never,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, nummer: "OF-2026-001" });
  });

  it("rejects an invalid signature path grammar", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: "doc-1",
        typ: "offerte",
        status: "gesendet",
        nummer: "OF-2026-001",
        kundenname: "Test",
        user_id: "u1",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/public/sign/route");
    const res = await POST(
      makeRequest("/api/public/sign", {
        token: TOKEN,
        signature: "<script>alert(1)</script>",
      }) as never,
    );

    expect(res.status).toBe(400);
    expect(maybeSingleUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 422 for non-offerte documents (cannot sign an invoice)", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: "doc-1",
        typ: "rechnung",
        status: "gesendet",
        nummer: "RE-2026-001",
        kundenname: "Test",
        user_id: "u1",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/public/sign/route");
    const res = await POST(
      makeRequest("/api/public/sign", { token: TOKEN, signature: SIGNATURE }) as never,
    );
    expect(res.status).toBe(422);
  });
});

describe("/api/public/reject — TOCTOU hardening", () => {
  it("returns alreadyRejected when the status-guarded UPDATE matches zero rows", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: "doc-1",
        typ: "offerte",
        status: "gesendet",
        nummer: "OF-2026-002",
        user_id: "u1",
      },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("@/app/api/public/reject/route");
    const res = await POST(
      makeRequest("/api/public/reject", { token: TOKEN, reason: "zu teuer" }) as never,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, alreadyRejected: true });
  });

  it("returns ok when the atomic UPDATE succeeds", async () => {
    maybeSingleReadMock.mockResolvedValue({
      data: {
        id: "doc-1",
        typ: "offerte",
        status: "gesendet",
        nummer: "OF-2026-002",
        user_id: "u1",
      },
      error: null,
    });
    maybeSingleUpdateMock.mockResolvedValue({ data: { id: "doc-1" }, error: null });

    const { POST } = await import("@/app/api/public/reject/route");
    const res = await POST(
      makeRequest("/api/public/reject", { token: TOKEN, reason: "zu teuer" }) as never,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, nummer: "OF-2026-002" });
  });
});
