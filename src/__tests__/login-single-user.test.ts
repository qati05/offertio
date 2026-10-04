import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// The login screen of a single-user installation signs in; it never creates an
// account. Source scan, like agb-einbeziehung.test.ts: the page is a client
// component that talks straight to Supabase, so what it is able to call is
// exactly what its source says.
const LOGIN = readFileSync("src/app/(auth)/login/page.tsx", "utf8");

describe("login page of a single-user installation", () => {
  it("never calls sign-up", () => {
    expect(LOGIN).not.toMatch(/auth\.signUp\(/);
  });

  it("offers no OAuth provider, which would also create accounts on first use", () => {
    expect(LOGIN).not.toMatch(/signInWithOAuth/);
  });

  it("does not let the magic link create a new user", () => {
    // signInWithOtp creates the user when the address is unknown, unless told not to.
    expect(LOGIN).toMatch(/signInWithOtp\([\s\S]*?shouldCreateUser:\s*false/);
  });

  it("shows the refusal when the middleware sent a stranger back", () => {
    expect(LOGIN).toMatch(/not_owner/);
    expect(LOGIN).toMatch(/nicht freigeschaltet/);
  });

  it("does not present a registration tab or a create-account button", () => {
    expect(LOGIN).not.toMatch(/Konto erstellen/);
    expect(LOGIN).not.toMatch(/Registrieren/);
  });
});
