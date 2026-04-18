import { describe, it, expect } from "vitest";
import { publicViewError } from "@/lib/public-view-i18n";

describe("publicViewError", () => {
  it("returns German by default", () => {
    expect(publicViewError("rate_limited")).toMatch(/Zu viele Anfragen/);
  });

  it("returns French when locale is fr", () => {
    expect(publicViewError("rate_limited", "fr")).toMatch(/Trop de requ/);
  });

  it("returns Italian when locale is it", () => {
    expect(publicViewError("rate_limited", "it")).toMatch(/Troppe richieste/);
  });

  it("covers every error key in every locale", () => {
    const keys = [
      "rate_limited",
      "invalid_body",
      "invalid_token",
      "invalid_signature",
      "invalid_reason",
      "not_found",
      "not_an_offer",
      "cannot_sign_now",
      "cannot_reject_now",
      "db_error",
      "save_failed",
    ] as const;

    for (const locale of ["de", "fr", "it"] as const) {
      for (const key of keys) {
        expect(publicViewError(key, locale)).toBeTruthy();
        expect(publicViewError(key, locale).length).toBeGreaterThan(3);
      }
    }
  });
});
