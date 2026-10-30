import "server-only";
import Stripe from "stripe";
import {
  createLifetimeCheckoutSession,
  optionalStripePriceId,
  type LifetimeCheckoutInput,
} from "@/lib/stripe-billing";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY fehlt.");
  }
  if (!client) {
    client = new Stripe(key, {
      typescript: true,
      appInfo: { name: "Offertio", url: "https://getoffertio.ch" },
    });
  }
  return client;
}

export async function openLifetimeCheckout(
  input: Omit<LifetimeCheckoutInput, "priceId">,
): Promise<{ id: string; url: string; twintOffered: boolean }> {
  const stripe = getStripe();
  return createLifetimeCheckoutSession(
    {
      create: (params, options) =>
        stripe.checkout.sessions.create(
          params as Stripe.Checkout.SessionCreateParams,
          options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
        ),
    },
    { ...input, priceId: optionalStripePriceId() },
  );
}

/** Reuse an open Checkout Session so a second click does not charge twice. */
export async function reuseOpenCheckoutSession(
  sessionId: string,
): Promise<string | null> {
  const stripe = getStripe();
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open" && session.url) return session.url;
  } catch {
    return null;
  }
  return null;
}
