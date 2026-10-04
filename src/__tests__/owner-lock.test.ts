import { describe, it, expect, vi, beforeEach } from "vitest";

// The app is a single-user installation. Nothing but the owner may use it, and
// "the owner" is decided by one environment variable, not by who managed to
// create an account.
//
// Why a guard in the app at all, when Supabase can simply disable sign-ups:
// the browser talks to Supabase Auth and PostgREST directly with a public anon
// key, so the sign-up screen is only a convenience, never the lock. The
// dashboard switch is the real lock; this is the second line, and it is the one
// that can be tested.

const getUser = vi.fn();
const signOut = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser, signOut },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { onboarding_complete: true } }) }),
      }),
    }),
  }),
}));

import { NextRequest } from "next/server";
import { isOwner } from "@/lib/owner";
import { middleware } from "@/middleware";

const OWNER = "reshat@example.com";
const CONFIRMED = "2026-01-01T00:00:00Z";

describe("isOwner", () => {
  it("accepts the confirmed owner address", () => {
    expect(isOwner({ email: OWNER, email_confirmed_at: CONFIRMED }, OWNER)).toBe(true);
  });

  it("ignores case and surrounding whitespace on both sides", () => {
    expect(isOwner({ email: "Reshat@Example.COM", email_confirmed_at: CONFIRMED }, ` ${OWNER} `)).toBe(true);
  });

  it("refuses any other address", () => {
    expect(isOwner({ email: "stranger@example.com", email_confirmed_at: CONFIRMED }, OWNER)).toBe(false);
  });

  it("refuses the owner address while it is still unconfirmed", () => {
    // Someone who signs up with the owner's address before it is confirmed has
    // proved nothing about owning it.
    expect(isOwner({ email: OWNER, email_confirmed_at: null }, OWNER)).toBe(false);
    expect(isOwner({ email: OWNER }, OWNER)).toBe(false);
  });

  it("fails closed when no owner is configured", () => {
    // A missing variable must lock everyone out loudly, not open the app
    // silently to whoever shows up.
    expect(isOwner({ email: OWNER, email_confirmed_at: CONFIRMED }, undefined)).toBe(false);
    expect(isOwner({ email: OWNER, email_confirmed_at: CONFIRMED }, "")).toBe(false);
    expect(isOwner({ email: OWNER, email_confirmed_at: CONFIRMED }, "   ")).toBe(false);
  });

  it("refuses a user without an email address", () => {
    expect(isOwner({ email: undefined, email_confirmed_at: CONFIRMED }, OWNER)).toBe(false);
    expect(isOwner({ email: "", email_confirmed_at: CONFIRMED }, "")).toBe(false);
  });
});

describe("middleware owner lock", () => {
  beforeEach(() => {
    getUser.mockReset();
    signOut.mockReset().mockResolvedValue({ error: null });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
    process.env.OWNER_EMAIL = OWNER;
  });

  const request = (path = "/dashboard") => new NextRequest(`http://localhost${path}`);

  it("lets the confirmed owner through", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: OWNER, email_confirmed_at: CONFIRMED } } });
    const res = await middleware(request());
    expect(res.status).toBe(200);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out and redirects a logged-in stranger", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u2", email: "stranger@example.com", email_confirmed_at: CONFIRMED } },
    });
    const res = await middleware(request());
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(new URL(res.headers.get("location")!).searchParams.get("error")).toBe("not_owner");
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("applies to API routes too, not only pages", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u2", email: "stranger@example.com", email_confirmed_at: CONFIRMED } },
    });
    const res = await middleware(request("/api/dokument/save"));
    expect(res.status).toBe(307);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("locks everyone out when OWNER_EMAIL is not set", async () => {
    delete process.env.OWNER_EMAIL;
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: OWNER, email_confirmed_at: CONFIRMED } } });
    const res = await middleware(request());
    expect(res.status).toBe(307);
  });

  it("does not loop: the login page itself stays reachable without a session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await middleware(request("/login"));
    expect(res.status).toBe(200);
  });
});
