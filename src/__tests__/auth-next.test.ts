import { describe, expect, it } from "vitest";
import { parseAuthNext } from "@/lib/auth-next";

describe("parseAuthNext", () => {
  it("allows only the founder return paths", () => {
    expect(parseAuthNext("/gruenderplatz")).toBe("/gruenderplatz");
    expect(parseAuthNext("/einrichtung")).toBe("/einrichtung");
    expect(parseAuthNext(encodeURIComponent("/einrichtung"))).toBe("/einrichtung");
    expect(parseAuthNext("https://evil.example")).toBeNull();
    expect(parseAuthNext("/dashboard")).toBeNull();
    expect(parseAuthNext("//gruenderplatz")).toBeNull();
    expect(parseAuthNext(null)).toBeNull();
  });
});
