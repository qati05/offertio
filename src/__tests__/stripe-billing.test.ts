import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import {
  LIFETIME_PRICE_RAPPEN,
  createLifetimeCheckoutSession,
  decideStripeEvent,
  getFounderSeatLimit,
  isStripeCheckoutConfigured,
  isTwintUnavailableError,
  verifyStripeSignature,
  type CheckoutSessionClient,
  type StripeCheckoutSessionPayload,
  type StripeEventPayload,
} from "@/lib/stripe-billing";

const SECRET = "whsec_test_secret";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function sign(body: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)): string {
  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function paidEvent(overrides: Partial<StripeCheckoutSessionPayload> = {}): StripeEventPayload {
  return {
    id: "evt_lifetime_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        mode: "payment",
        payment_status: "paid",
        amount_total: LIFETIME_PRICE_RAPPEN,
        currency: "chf",
        client_reference_id: USER_ID,
        customer: "cus_123",
        metadata: { user_id: USER_ID, product: "lifetime" },
        ...overrides,
      },
    },
  };
}

describe("Stripe signature", () => {
  const now = 1_700_000_000;

  it("accepts a valid signature", () => {
    const body = JSON.stringify({ id: "evt_1" });
    expect(verifyStripeSignature(body, sign(body, SECRET, now), SECRET, now)).toBe(true);
  });

  it("rejects a different secret", () => {
    const body = "{}";
    expect(verifyStripeSignature(body, sign(body, "other", now), SECRET, now)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ id: "evt_1" });
    const header = sign(body, SECRET, now);
    expect(verifyStripeSignature(JSON.stringify({ id: "evt_2" }), header, SECRET, now)).toBe(false);
  });

  it("rejects an expired timestamp", () => {
    const body = "{}";
    const header = sign(body, SECRET, now - 1000);
    expect(verifyStripeSignature(body, header, SECRET, now)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyStripeSignature("{}", null, SECRET, now)).toBe(false);
    expect(verifyStripeSignature("{}", "", SECRET, now)).toBe(false);
  });

  it("accepts when one of several v1 signatures matches", () => {
    const body = "{}";
    const header = `t=${now},v1=${"ab".repeat(32)},v1=${sign(body, SECRET, now).split("v1=")[1]}`;
    expect(verifyStripeSignature(body, header, SECRET, now)).toBe(true);
  });
});

describe("decideStripeEvent", () => {
  it("grants lifetime on a paid checkout.session.completed", () => {
    const decision = decideStripeEvent(paidEvent());
    expect(decision).toMatchObject({
      action: "grant",
      userId: USER_ID,
      sessionId: "cs_test_1",
      customerId: "cus_123",
      eventId: "evt_lifetime_1",
    });
  });

  it("ignores an unpaid completed session so a later async success can grant", () => {
    expect(decideStripeEvent(paidEvent({ payment_status: "unpaid" }))).toMatchObject({
      action: "ignore",
      reason: "unpaid",
    });
  });

  it("grants on async_payment_succeeded without requiring payment_status", () => {
    const event = paidEvent({ payment_status: "unpaid" });
    event.type = "checkout.session.async_payment_succeeded";
    expect(decideStripeEvent(event).action).toBe("grant");
  });

  it("ignores a wrong amount so a different product cannot unlock lifetime", () => {
    expect(decideStripeEvent(paidEvent({ amount_total: 100 })).action).toBe("ignore");
  });

  it("ignores a missing or invalid user id", () => {
    const event = paidEvent({
      metadata: { product: "lifetime" },
      client_reference_id: "not-a-uuid",
    });
    expect(decideStripeEvent(event)).toMatchObject({ action: "ignore", reason: "invalid-user" });
  });

  it("releases the seat when checkout expires", () => {
    expect(
      decideStripeEvent({
        id: "evt_exp",
        type: "checkout.session.expired",
        data: { object: { id: "cs_exp" } },
      }),
    ).toEqual({ action: "release", eventId: "evt_exp", sessionId: "cs_exp" });
  });

  it("ignores unrelated event types", () => {
    expect(decideStripeEvent({ id: "evt_x", type: "invoice.paid" })).toMatchObject({
      action: "ignore",
      reason: "unhandled-type",
    });
  });
});

describe("founder seat limit", () => {
  it("defaults to 20", () => {
    expect(getFounderSeatLimit(undefined)).toBe(20);
    expect(getFounderSeatLimit("")).toBe(20);
    expect(getFounderSeatLimit("nope")).toBe(20);
  });

  it("accepts a positive integer and treats 0 as no cap", () => {
    expect(getFounderSeatLimit("8")).toBe(8);
    expect(getFounderSeatLimit("0")).toBeNull();
  });
});

describe("checkout configuration", () => {
  it("stays disabled until Stripe and Supabase secrets are present", () => {
    expect(
      isStripeCheckoutConfigured({
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "whsec_x",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isStripeCheckoutConfigured({
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_WEBHOOK_SECRET: "whsec_x",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});

describe("TWINT fallback", () => {
  it("detects a TWINT activation error", () => {
    expect(
      isTwintUnavailableError({
        message: 'The payment method type "twint" is invalid. Please ensure it is activated.',
        code: "payment_method_unactivated",
        param: "payment_method_types",
      }),
    ).toBe(true);
    expect(isTwintUnavailableError(new Error("Invalid API key"))).toBe(false);
  });

  it("retries with card only when TWINT is not enabled", async () => {
    const calls: string[][] = [];
    const client: CheckoutSessionClient = {
      create: vi.fn(async (params) => {
        const methods = (params.payment_method_types ?? params.allowed_payment_method_types) as string[];
        calls.push(methods);
        if (methods.includes("twint")) {
          throw new Error('The payment method type provided: twint is invalid');
        }
        return { id: "cs_card", url: "https://checkout.stripe.com/c/pay/cs_card" };
      }),
    };

    const session = await createLifetimeCheckoutSession(client, {
      userId: USER_ID,
      email: "owner@example.com",
      successUrl: "https://getoffertio.ch/einstellungen/abonnement?checkout=erfolg",
      cancelUrl: "https://getoffertio.ch/einstellungen/abonnement?checkout=abgebrochen",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(session).toMatchObject({ id: "cs_card", twintOffered: false });
    expect(calls[0]).toEqual(["card", "twint"]);
    expect(calls[1]).toEqual(["card"]);
    const firstParams = (client.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      mode: string;
      line_items: Array<{ price_data: { currency: string; unit_amount: number } }>;
    };
    expect(firstParams.mode).toBe("payment");
    expect(firstParams.line_items[0].price_data.currency).toBe("chf");
    expect(firstParams.line_items[0].price_data.unit_amount).toBe(24900);
  });

  it("keeps TWINT when Stripe accepts it", async () => {
    const client: CheckoutSessionClient = {
      create: async () => ({ id: "cs_twint", url: "https://checkout.stripe.com/c/pay/cs_twint" }),
    };
    const session = await createLifetimeCheckoutSession(client, {
      userId: USER_ID,
      successUrl: "https://getoffertio.ch/ok",
      cancelUrl: "https://getoffertio.ch/cancel",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(session.twintOffered).toBe(true);
  });
});

const rpc = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ rpc }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true, remaining: 10, retryAfterSeconds: 0 })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("POST /api/webhooks/stripe", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    rpc.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_FOUNDER_SEAT_LIMIT = "20";
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  async function post(body: string, signature: string | null) {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const headers = new Headers({ "content-type": "application/json" });
    if (signature) headers.set("stripe-signature", signature);
    const request = new NextRequest("https://getoffertio.ch/api/webhooks/stripe", {
      method: "POST",
      body,
      headers,
    });
    return POST(request);
  }

  it("refuses to run without a webhook secret", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const response = await post("{}", "t=1,v1=" + "ab".repeat(32));
    expect(response.status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before touching the database", async () => {
    const body = JSON.stringify(paidEvent());
    const response = await post(body, sign(body, "wrong-secret"));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("grants lifetime exactly once for a verified paid session", async () => {
    rpc.mockResolvedValue({ data: { ok: true, reason: "granted" }, error: null });
    const body = JSON.stringify(paidEvent());
    const response = await post(body, sign(body));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("grant_lifetime_seat");
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_event_id: "evt_lifetime_1",
      p_user_id: USER_ID,
      p_session_id: "cs_test_1",
      p_customer_id: "cus_123",
      p_seat_limit: 20,
    });
  });

  it("returns success for a duplicate delivery without a second grant attempt shape change", async () => {
    rpc.mockResolvedValue({ data: { ok: true, reason: "duplicate" }, error: null });
    const body = JSON.stringify(paidEvent());
    const response = await post(body, sign(body));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.result).toBe("duplicate");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("does not grant when the session is not paid", async () => {
    const body = JSON.stringify(paidEvent({ payment_status: "unpaid" }));
    const response = await post(body, sign(body));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ignored).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 500 when the grant fails so Stripe retries", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    const body = JSON.stringify(paidEvent());
    const response = await post(body, sign(body));
    expect(response.status).toBe(500);
  });
});
