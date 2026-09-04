/**
 * @vitest-environment jsdom
 *
 * The suite defaults to `node`; this file needs a DOM.
 * React Testing Library renders components.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UpgradeScreen from "@/components/UpgradeScreen";
import { getCheckoutUrl } from "@/lib/payment";

vi.mock("@/lib/analytics", () => ({ trackUpgradeClick: vi.fn() }));

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
// URLSearchParams percent-encodes the brackets of checkout[custom][user_id].
const USER_ID_PARAM = "checkout%5Bcustom%5D%5Buser_id%5D";

const ENV_KEYS = ["NEXT_PUBLIC_LS_PRO_MONTHLY", "NEXT_PUBLIC_LS_PRO_YEARLY"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    process.env[key] = `https://checkout.example.com/buy/${key}`;
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

/**
 * The Lemon Squeezy webhook only grants a plan when it can read a valid UUID
 * from meta.custom_data.user_id — it deliberately refuses to fall back to the
 * customer's email address. That means every checkout link the app hands out
 * MUST carry checkout[custom][user_id], or the customer pays and stays on the
 * free plan with no way for the webhook to know who they are.
 */
describe("payment · checkout URL carries the user id", () => {
  it("includes the user id when one is supplied", () => {
    const url = getCheckoutUrl("pro_yearly", "kunde@example.com", USER_ID);
    expect(url).toContain(USER_ID_PARAM);
    expect(url).toContain(USER_ID);
  });

  it("still includes the email alongside the user id", () => {
    const url = getCheckoutUrl("pro_yearly", "kunde@example.com", USER_ID);
    expect(url).toContain("kunde%40example.com");
  });
});

describe("UpgradeScreen · the paywall's checkout link is claimable", () => {
  function upgradeLink(): HTMLAnchorElement {
    return screen.getByRole("link", { name: /Auf Pro wechseln/i }) as HTMLAnchorElement;
  }

  it("sends the user id on the yearly (default) plan", () => {
    render(<UpgradeScreen email="kunde@example.com" land="CH" userId={USER_ID} />);
    const href = upgradeLink().getAttribute("href") ?? "";
    expect(href).toContain(USER_ID_PARAM);
    expect(href).toContain(USER_ID);
  });

  it("sends the user id on the monthly plan too", () => {
    render(<UpgradeScreen email="kunde@example.com" land="DE" userId={USER_ID} />);
    fireEvent.click(screen.getByRole("button", { name: /Monatlich/i }));
    const href = upgradeLink().getAttribute("href") ?? "";
    expect(href).toContain(USER_ID_PARAM);
    expect(href).toContain(USER_ID);
  });

  it("still renders a usable link when no user id is known", () => {
    // Signed-out / profile-not-loaded edge case must not crash or emit
    // a literal "undefined" into the checkout URL.
    render(<UpgradeScreen email="kunde@example.com" land="CH" />);
    const href = upgradeLink().getAttribute("href") ?? "";
    expect(href).toContain("checkout.example.com");
    expect(href).not.toContain("undefined");
  });
});
