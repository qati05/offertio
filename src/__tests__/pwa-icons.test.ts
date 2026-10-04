import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

// The owner installs this on a phone. Apple's own guide for adding a web page
// to the home screen specifies the icon as "an icon file in PNG format"
// (developer.apple.com, Safari Web Content Guide — an archived 2016 page, so
// what current iOS tolerates is unverified), and the layout used to point at an
// SVG. The files are opened and measured here; comparing file names would pass
// for a PNG that is the wrong size or not a PNG at all.

const PNG_SIGNATURE = "89504e470d0a1a0a";

function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 8).toString("hex"), `${path} is not a PNG`).toBe(PNG_SIGNATURE);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8")) as {
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
};
const layout = readFileSync("src/app/layout.tsx", "utf8");

describe("home-screen icons", () => {
  it("the manifest offers real PNG icons at 192 and 512", () => {
    for (const size of [192, 512]) {
      const icon = manifest.icons.find((i) => i.type === "image/png" && i.sizes === `${size}x${size}`);
      expect(icon, `no ${size}x${size} PNG in the manifest`).toBeDefined();
      const path = `public${icon!.src}`;
      expect(existsSync(path), `${path} is listed but missing`).toBe(true);
      expect(pngSize(path)).toEqual({ width: size, height: size });
    }
  });

  it("every icon the manifest lists exists", () => {
    for (const icon of manifest.icons) {
      expect(existsSync(`public${icon.src}`), `${icon.src} is listed but missing`).toBe(true);
    }
  });

  it("lists no icon twice", () => {
    const keys = manifest.icons.map((i) => `${i.src}|${i.sizes}|${i.purpose ?? "any"}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("the apple-touch-icon is a 180x180 PNG", () => {
    const m = layout.match(/rel="apple-touch-icon"[^>]*href="([^"]+)"/);
    expect(m, "no apple-touch-icon link in the layout").not.toBeNull();
    expect(m![1]).toMatch(/\.png$/);
    expect(pngSize(`public${m![1]}`)).toEqual({ width: 180, height: 180 });
  });
});
