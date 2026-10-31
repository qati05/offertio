import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderDocumentEmail, resolveFromAddress } from "@/lib/email";

describe("Resend document mail", () => {
  it("defaults the sender to offerte@getoffertio.ch", () => {
    expect(resolveFromAddress("")).toMatchObject({
      ok: true,
      email: "offerte@getoffertio.ch",
      from: "Offertio <offerte@getoffertio.ch>",
    });
    expect(resolveFromAddress("Offertio <offerte@getoffertio.ch>").ok).toBe(true);
  });

  it("refuses a sender outside getoffertio.ch", () => {
    expect(resolveFromAddress("billing@example.com")).toMatchObject({ ok: false, reason: "wrong-domain" });
  });

  it("renders quote and invoice templates without a German sharp s", () => {
    const offerte = renderDocumentEmail({
      kind: "offerte",
      nummer: "OF-2026-001",
      kundeName: "Hans Muster",
      firmenname: "Muster AG",
      viewUrl: "https://getoffertio.ch/view/550e8400-e29b-41d4-a716-446655440000",
    });
    expect(offerte.subject).toBe("Offerte OF-2026-001 — Muster AG");
    expect(offerte.text).toContain("unsere Offerte OF-2026-001");
    expect(offerte.text).toContain("Freundliche Grüsse");
    expect(offerte.html).toContain("https://getoffertio.ch/view/550e8400-e29b-41d4-a716-446655440000");
    expect(offerte.text).not.toContain("ß");
    expect(offerte.html).not.toContain("ß");

    const rechnung = renderDocumentEmail({ kind: "rechnung", nummer: "RE-1", kundeName: "Anna" });
    expect(rechnung.subject.startsWith("Rechnung RE-1")).toBe(true);
    expect(rechnung.text).toContain("unsere Rechnung RE-1");
  });
});

const getUserMock = vi.fn();
const dokumentLookup = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true, remaining: 10, retryAfterSeconds: 0 })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { firmenname: "Muster AG" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: dokumentLookup,
            }),
          }),
        }),
      };
    },
  })),
}));

describe("POST /api/send-offerte", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    getUserMock.mockReset();
    dokumentLookup.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    process.env.RESEND_FROM_EMAIL = "offerte@getoffertio.ch";
    delete process.env.RESEND_API_KEY;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
    vi.unstubAllGlobals();
  });

  function post(body: unknown) {
    return new NextRequest("https://getoffertio.ch/api/send-offerte", {
      method: "POST",
      headers: { origin: "https://getoffertio.ch", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const shareToken = "550e8400-e29b-41d4-a716-446655440000";

  it("stays disabled without an API key", async () => {
    const { POST } = await import("@/app/api/send-offerte/route");
    const response = await POST(post({
      to: "kunde@firma.ch",
      kind: "offerte",
      nummer: "OF-1",
      shareToken,
    }));
    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses an arbitrary recipient", async () => {
    process.env.RESEND_API_KEY = "re_test";
    dokumentLookup.mockResolvedValue({
      data: { id: "doc-1", typ: "rechnung", nummer: "RE-2026-001", kunde_email: "kunde@firma.ch" },
      error: null,
    });
    const { POST } = await import("@/app/api/send-offerte/route");
    const response = await POST(post({
      to: "other@evil.example",
      kind: "rechnung",
      nummer: "RE-2026-001",
      shareToken,
      firmenname: "Gefälschte Firma",
    }));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends through Resend from offerte@getoffertio.ch with an idempotency key", async () => {
    process.env.RESEND_API_KEY = "re_test";
    dokumentLookup.mockResolvedValue({
      data: { id: "doc-1", typ: "rechnung", nummer: "RE-2026-001", kunde_email: "kunde@firma.ch" },
      error: null,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 })));
    const { POST } = await import("@/app/api/send-offerte/route");
    const response = await POST(post({
      to: "kunde@firma.ch",
      kind: "rechnung",
      nummer: "IGNORED",
      kundeName: "Anna",
      shareToken,
      firmenname: "Gefälschte Firma",
    }));
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test",
      "Idempotency-Key": expect.stringContaining("user-1/rechnung/RE-2026-001"),
    });
    const payload = JSON.parse(String(init.body));
    expect(payload.from).toBe("Offertio <offerte@getoffertio.ch>");
    expect(payload.to).toEqual(["kunde@firma.ch"]);
    expect(payload.subject).toContain("Rechnung RE-2026-001");
    expect(payload.subject).toContain("Muster AG");
    expect(payload.subject).not.toContain("Gefälschte");
    expect(payload.text).toContain("Freundliche Grüsse");
  });
});
