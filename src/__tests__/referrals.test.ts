import { describe, it, expect } from "vitest";
import {
  isValidReferralCode,
  buildReferralShareUrl,
  extractReferralCode,
  buildShareMessage,
} from "@/lib/referrals";

describe("isValidReferralCode", () => {
  it("accepts 8-char uppercase alphanumerics without ambiguous chars", () => {
    expect(isValidReferralCode("ABCD2345")).toBe(true);
    expect(isValidReferralCode("HJKMNPQR")).toBe(true);
  });

  it("rejects ambiguous characters (0, O, 1, I, L)", () => {
    expect(isValidReferralCode("ABCD0234")).toBe(false);
    expect(isValidReferralCode("ABCDO234")).toBe(false);
    expect(isValidReferralCode("ABCD1234")).toBe(false);
    expect(isValidReferralCode("ABCDI234")).toBe(false);
    expect(isValidReferralCode("ABCDL234")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidReferralCode("ABCD234")).toBe(false);  // 7
    expect(isValidReferralCode("ABCDE2345")).toBe(false); // 9
    expect(isValidReferralCode("")).toBe(false);
  });

  it("rejects lowercase or special chars", () => {
    expect(isValidReferralCode("abcd2345")).toBe(false);
    expect(isValidReferralCode("ABCD-234")).toBe(false);
    expect(isValidReferralCode("ABCD 234")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidReferralCode(null)).toBe(false);
    expect(isValidReferralCode(12345678)).toBe(false);
    expect(isValidReferralCode(undefined)).toBe(false);
  });
});

describe("buildReferralShareUrl", () => {
  it("appends ?ref=<code> to a clean URL", () => {
    expect(buildReferralShareUrl("https://offertio.ch", "ABCD2345")).toBe(
      "https://offertio.ch/?ref=ABCD2345",
    );
  });

  it("replaces existing ref param rather than duplicating", () => {
    expect(
      buildReferralShareUrl("https://offertio.ch/?ref=OLD23456", "ABCD2345"),
    ).toBe("https://offertio.ch/?ref=ABCD2345");
  });

  it("throws on invalid code", () => {
    expect(() => buildReferralShareUrl("https://offertio.ch", "bad")).toThrow();
  });
});

describe("extractReferralCode", () => {
  it("returns the code when present and valid", () => {
    expect(extractReferralCode("https://offertio.ch/?ref=ABCD2345")).toBe("ABCD2345");
  });

  it("returns null for invalid codes", () => {
    expect(extractReferralCode("https://offertio.ch/?ref=bad")).toBe(null);
    expect(extractReferralCode("https://offertio.ch/?ref=")).toBe(null);
  });

  it("returns null when no ref param", () => {
    expect(extractReferralCode("https://offertio.ch/")).toBe(null);
  });

  it("returns null for malformed URLs without throwing", () => {
    expect(extractReferralCode("not-a-url")).toBe(null);
  });
});

describe("buildShareMessage", () => {
  it("includes the share URL in every locale", () => {
    const url = "https://offertio.ch/?ref=ABCD2345";
    expect(buildShareMessage(url, "de")).toContain(url);
    expect(buildShareMessage(url, "fr")).toContain(url);
    expect(buildShareMessage(url, "it")).toContain(url);
  });

  it("defaults to German when no locale given", () => {
    const msg = buildShareMessage("https://offertio.ch/?ref=ABCD2345");
    expect(msg).toContain("Offerten");
  });
});
