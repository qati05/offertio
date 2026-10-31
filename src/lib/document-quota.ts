import { FREE_LIMIT, hasActiveAccess } from "@/lib/payment";

type QuotaClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: number | null; error: { message?: string } | null }>;
};

export function currentMonat(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Atomically takes one free-plan slot.
 * Paid plans and an active trial return "skipped" and do not touch the counter.
 * "blocked" means the monthly cap is already reached (the counter is unchanged).
 */
export async function consumeFreeDocumentSlot(
  client: QuotaClient,
  userId: string,
  plan: string | null | undefined,
  trialEndsAt: string | null | undefined,
  now = new Date(),
): Promise<"skipped" | "consumed" | "blocked" | "error"> {
  if (hasActiveAccess(plan ?? undefined, trialEndsAt)) return "skipped";

  const { data, error } = await client.rpc("try_consume_dokument_slot", {
    p_user_id: userId,
    p_monat: currentMonat(now),
    p_limit: FREE_LIMIT,
  });
  if (error) return "error";
  if (typeof data !== "number") return "blocked";
  return "consumed";
}
