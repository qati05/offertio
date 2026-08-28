import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";
import type { NextRequest } from "next/server";

const SECRET = "test_webhook_secret";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

/** Every profile update the handler performed, in order. */
let updates: Record<string, unknown>[] = [];
let updateError: { message: string } | null = null;

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return { eq: async () => ({ error: updateError }) };
      },
    }),
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: async () => ({ ok: true, remaining: 99, retryAfterSeconds: 0 }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "@/app/api/webhooks/lemon-squeezy/route";

function post(payload: unknown, opts: { signature?: string } = {}) {
  const body = JSON.stringify(payload);
  const signature =
    opts.signature ??
    crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  const request = new Request("https://offertio.ch/api/webhooks/lemon-squeezy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": signature },
    body,
  });
  return POST(request as unknown as NextRequest);
}

/** A Lemon Squeezy subscription_created payload for a YEARLY plan. */
function subscriptionCreated() {
  return {
    meta: { event_name: "subscription_created", custom_data: { user_id: USER_ID } },
    data: {
      id: "sub_123",
      attributes: {
        customer_id: 9911,
        first_subscription_item: { interval: "year" },
        renews_at: "2027-03-01T00:00:00.000000Z",
      },
    },
  };
}

/**
 * A real Lemon Squeezy `order_created` payload for the SAME yearly purchase.
 *
 * Note the shape differences that matter: the variant name is nested under
 * `first_order_item`, there is no `first_subscription_item`, there is no
 * `renews_at`, and `data.id` is an ORDER id — not the subscription id.
 */
function orderCreated() {
  return {
    meta: { event_name: "order_created", custom_data: { user_id: USER_ID } },
    data: {
      id: "ord_777",
      attributes: {
        customer_id: 9911,
        first_order_item: { variant_name: "Offertio Pro Yearly" },
        total: 24000,
      },
    },
  };
}

beforeEach(() => {
  updates = [];
  updateError = null;
  process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = SECRET;
});

describe("webhook · signature and identity gate", () => {
  it("rejects a bad signature without touching the profile", async () => {
    const res = await post(subscriptionCreated(), { signature: "0".repeat(64) });
    expect(res.status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it("ignores a payload with no custom_data.user_id", async () => {
    const payload = subscriptionCreated();
    delete (payload.meta as { custom_data?: unknown }).custom_data;
    const res = await post(payload);
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it("grants the yearly plan from subscription_created", async () => {
    const res = await post(subscriptionCreated());
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      plan: "pro_yearly",
      ls_subscription_id: "sub_123",
      plan_expires_at: "2027-03-01T00:00:00.000Z",
    });
  });

  it("returns a non-2xx so Lemon Squeezy retries when the DB write fails", async () => {
    updateError = { message: "connection reset" };
    const res = await post(subscriptionCreated());
    expect(res.status).toBe(500);
  });
});

/**
 * Lemon Squeezy fires BOTH `order_created` and `subscription_created` for a
 * subscription purchase, with no guaranteed ordering. `order_created` carries
 * none of the fields the plan is derived from, so treating it as a plan-granting
 * event meant a late-arriving order downgraded a yearly customer to
 * "pro_monthly", cleared their expiry date, and overwrote the subscription id
 * with an order id (which breaks the customer portal link).
 */
describe("webhook · order_created must not rewrite subscription state", () => {
  it("does not write a profile update for order_created", async () => {
    const res = await post(orderCreated());
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });

  it("leaves a yearly subscription intact when the order arrives afterwards", async () => {
    await post(subscriptionCreated());
    await post(orderCreated());

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      plan: "pro_yearly",
      ls_subscription_id: "sub_123",
    });
    // The order id must never end up in the subscription column.
    for (const update of updates) {
      expect(update.ls_subscription_id).not.toBe("ord_777");
      expect(update.plan).not.toBe("pro_monthly");
    }
  });
});

describe("webhook · lifecycle events still work", () => {
  it("keeps the plan but records the cancellation", async () => {
    await post({
      meta: { event_name: "subscription_cancelled", custom_data: { user_id: USER_ID } },
      data: {
        id: "sub_123",
        attributes: { cancelled_at: "2026-06-01T10:00:00.000000Z", ends_at: "2027-03-01T00:00:00.000000Z" },
      },
    });
    expect(updates).toHaveLength(1);
    expect(updates[0].plan).toBeUndefined();
    expect(updates[0].plan_cancelled_at).toBe("2026-06-01T10:00:00.000000Z");
  });

  it("downgrades to free on expiry", async () => {
    await post({
      meta: { event_name: "subscription_expired", custom_data: { user_id: USER_ID } },
      data: { id: "sub_123", attributes: {} },
    });
    expect(updates[0]).toMatchObject({
      plan: "free",
      plan_expires_at: null,
      plan_cancelled_at: null,
    });
  });

  it("grants the monthly plan from a monthly subscription", async () => {
    await post({
      meta: { event_name: "subscription_created", custom_data: { user_id: USER_ID } },
      data: {
        id: "sub_456",
        attributes: {
          customer_id: 9911,
          first_subscription_item: { interval: "month" },
          renews_at: "2026-04-01T00:00:00.000000Z",
        },
      },
    });
    expect(updates[0]).toMatchObject({ plan: "pro_monthly", ls_subscription_id: "sub_456" });
  });

  it("ignores events it does not handle", async () => {
    const res = await post({
      meta: { event_name: "license_key_created", custom_data: { user_id: USER_ID } },
      data: { id: "lic_1", attributes: {} },
    });
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(0);
  });
});
