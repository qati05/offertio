import crypto from "crypto";
import { isValidUUID } from "@/lib/security";
import { LIFETIME_PRICE_CHF, LIFETIME_PRODUCT_NAME } from "@/lib/payment";

/**
 * One-time Gründerplatz (lifetime) offer.
 * Amounts are in rappen: CHF 249.00 = 24900.
 */
export const LIFETIME_PRICE_RAPPEN = LIFETIME_PRICE_CHF * 100;
export const LIFETIME_CURRENCY = "chf";
export const DEFAULT_FOUNDER_SEAT_LIMIT = 20;
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
/** Hold a seat slightly longer than the Checkout Session (max 24h). */
export const FOUNDER_SEAT_HOLD_SECONDS = 26 * 60 * 60;

/**
 * `null` means the cap is turned off (`STRIPE_FOUNDER_SEAT_LIMIT=0`).
 * Missing or invalid values fall back to 20.
 */
export function getFounderSeatLimit(
  raw: string | undefined = process.env.STRIPE_FOUNDER_SEAT_LIMIT,
): number | null {
  if (raw == null || raw.trim() === "") return DEFAULT_FOUNDER_SEAT_LIMIT;
  const trimmed = raw.trim();
  if (trimmed === "0") return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_FOUNDER_SEAT_LIMIT;
  return parsed;
}

/** Value passed to SQL. `0` means no cap. */
export function seatLimitParam(limit: number | null): number {
  return limit == null ? 0 : limit;
}

export function isStripeCheckoutConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY?.trim() &&
      env.STRIPE_WEBHOOK_SECRET?.trim() &&
      env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function optionalStripePriceId(
  raw: string | undefined = process.env.STRIPE_LIFETIME_PRICE_ID,
): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value;
}

type StripeErrorShape = {
  message?: string;
  code?: string;
  param?: string;
  type?: string;
};

function readStripeError(err: unknown): StripeErrorShape {
  if (!err || typeof err !== "object") {
    return { message: typeof err === "string" ? err : "" };
  }
  const record = err as StripeErrorShape & { raw?: StripeErrorShape };
  return {
    message: record.message || record.raw?.message || "",
    code: record.code || record.raw?.code || "",
    param: record.param || record.raw?.param || "",
    type: record.type || "",
  };
}

/**
 * True when Stripe rejected the session because TWINT is not activated
 * on the account (or is not eligible for this currency). Card-only
 * checkout can then proceed.
 */
export function isTwintUnavailableError(err: unknown): boolean {
  const info = readStripeError(err);
  const blob = `${info.message} ${info.code} ${info.param}`.toLowerCase();
  return blob.includes("twint");
}

/** Newer Stripe APIs prefer `allowed_payment_method_types`. */
export function isPaymentMethodTypesUnsupported(err: unknown): boolean {
  const info = readStripeError(err);
  const blob = `${info.message} ${info.param}`.toLowerCase();
  if (!blob.includes("payment_method_types")) return false;
  return (
    blob.includes("unknown") ||
    blob.includes("unrecognized") ||
    blob.includes("not a valid") ||
    blob.includes("cannot be set") ||
    blob.includes("received unknown parameter")
  );
}

export type LifetimeCheckoutInput = {
  userId: string;
  email?: string | null;
  successUrl: string;
  cancelUrl: string;
  priceId?: string | null;
  /** Unix seconds. Checkout allows 30 minutes to 24 hours. */
  expiresAt: number;
};

export type CreatedCheckoutSession = {
  id: string;
  url: string | null;
};

export type CheckoutSessionClient = {
  create: (
    params: Record<string, unknown>,
    options?: { idempotencyKey?: string },
  ) => Promise<CreatedCheckoutSession>;
};

export function buildLifetimeLineItems(priceId: string | null): Record<string, unknown>[] {
  if (priceId) {
    return [{ price: priceId, quantity: 1 }];
  }
  return [
    {
      quantity: 1,
      price_data: {
        currency: LIFETIME_CURRENCY,
        unit_amount: LIFETIME_PRICE_RAPPEN,
        product_data: {
          name: LIFETIME_PRODUCT_NAME,
          description: "Einmaliger lebenslanger Zugang zu Offertio. Kein Abo.",
        },
      },
    },
  ];
}

export function buildLifetimeCheckoutParams(
  input: LifetimeCheckoutInput,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    mode: "payment",
    client_reference_id: input.userId,
    customer_creation: "always",
    metadata: {
      user_id: input.userId,
      product: "lifetime",
    },
    line_items: buildLifetimeLineItems(input.priceId ?? null),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    expires_at: input.expiresAt,
    locale: "de",
  };
  if (input.email) params.customer_email = input.email;
  return params;
}

async function createWithPaymentMethods(
  client: CheckoutSessionClient,
  base: Record<string, unknown>,
  methods: Array<"card" | "twint">,
  idempotencyKey: string,
): Promise<CreatedCheckoutSession> {
  try {
    return await client.create(
      { ...base, payment_method_types: methods },
      { idempotencyKey: `${idempotencyKey}-pmt-${methods.join("-")}` },
    );
  } catch (err) {
    if (!isPaymentMethodTypesUnsupported(err)) throw err;
    return client.create(
      { ...base, allowed_payment_method_types: methods },
      { idempotencyKey: `${idempotencyKey}-allowed-${methods.join("-")}` },
    );
  }
}

export async function createLifetimeCheckoutSession(
  client: CheckoutSessionClient,
  input: LifetimeCheckoutInput,
): Promise<{ id: string; url: string; twintOffered: boolean }> {
  const base = buildLifetimeCheckoutParams(input);
  const key = `lifetime-${input.userId}`;
  try {
    const session = await createWithPaymentMethods(client, base, ["card", "twint"], key);
    if (!session.url) throw new Error("Stripe Checkout lieferte keine URL.");
    return { id: session.id, url: session.url, twintOffered: true };
  } catch (err) {
    if (!isTwintUnavailableError(err)) throw err;
    const session = await createWithPaymentMethods(client, base, ["card"], `${key}-card`);
    if (!session.url) throw new Error("Stripe Checkout lieferte keine URL.");
    return { id: session.id, url: session.url, twintOffered: false };
  }
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = STRIPE_SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  if (!signatureHeader || !secret) return false;

  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const item = part.trim();
    const eq = item.indexOf("=");
    if (eq === -1) continue;
    const key = item.slice(0, eq);
    const value = item.slice(eq + 1);
    if (key === "t") {
      if (!/^\d+$/.test(value)) return false;
      timestamp = Number(value);
    } else if (key === "v1" && /^[0-9a-f]{64}$/i.test(value)) {
      signatures.push(value.toLowerCase());
    }
  }

  if (timestamp === null || signatures.length === 0) return false;
  if (toleranceSeconds > 0 && timestamp < nowSeconds - toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    const sigBuf = Buffer.from(signature, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

export type StripeCheckoutSessionPayload = {
  id?: string;
  payment_status?: string;
  mode?: string;
  client_reference_id?: string | null;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  currency?: string | null;
};

export type StripeEventPayload = {
  id?: string;
  type?: string;
  data?: { object?: StripeCheckoutSessionPayload };
};

export type StripeWebhookDecision =
  | { action: "ignore"; reason: string }
  | {
      action: "grant";
      eventId: string;
      eventType: string;
      userId: string;
      sessionId: string;
      customerId: string | null;
    }
  | { action: "release"; eventId: string; sessionId: string };

function customerIdOf(session: StripeCheckoutSessionPayload): string | null {
  const customer = session.customer;
  if (typeof customer === "string" && customer) return customer;
  if (customer && typeof customer === "object" && customer.id) return customer.id;
  return null;
}

function paidLifetimeSession(
  event: StripeEventPayload,
  requirePaid: boolean,
): StripeWebhookDecision {
  if (!event.id || !event.type) return { action: "ignore", reason: "malformed" };
  const session = event.data?.object;
  if (!session?.id) return { action: "ignore", reason: "missing-session" };
  if (session.mode && session.mode !== "payment") {
    return { action: "ignore", reason: "wrong-mode" };
  }
  if (requirePaid && session.payment_status !== "paid") {
    return { action: "ignore", reason: "unpaid" };
  }
  if (session.currency && session.currency.toLowerCase() !== LIFETIME_CURRENCY) {
    return { action: "ignore", reason: "unexpected-currency" };
  }
  if (session.amount_total != null && session.amount_total !== LIFETIME_PRICE_RAPPEN) {
    return { action: "ignore", reason: "unexpected-amount" };
  }
  const product = session.metadata?.product;
  if (product && product !== "lifetime") {
    return { action: "ignore", reason: "unexpected-product" };
  }
  const userId = session.metadata?.user_id || session.client_reference_id;
  if (!isValidUUID(userId)) return { action: "ignore", reason: "invalid-user" };
  return {
    action: "grant",
    eventId: event.id,
    eventType: event.type,
    userId,
    sessionId: session.id,
    customerId: customerIdOf(session),
  };
}

/**
 * Decide what a verified Stripe event should do.
 * `checkout.session.completed` grants only when `payment_status` is `paid`
 * (TWINT and cards that settle immediately). Delayed methods are granted on
 * `checkout.session.async_payment_succeeded`.
 */
export function decideStripeEvent(event: StripeEventPayload): StripeWebhookDecision {
  if (!event.id || !event.type) return { action: "ignore", reason: "malformed" };

  if (event.type === "checkout.session.expired") {
    const sessionId = event.data?.object?.id;
    if (!sessionId) return { action: "ignore", reason: "missing-session" };
    return { action: "release", eventId: event.id, sessionId };
  }

  if (event.type === "checkout.session.completed") {
    return paidLifetimeSession(event, true);
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    return paidLifetimeSession(event, false);
  }

  return { action: "ignore", reason: "unhandled-type" };
}
