import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A document you cannot open again is not archived, it is filed away.
 *
 * The archive selects pdf_url on every row and never rendered it. The only
 * place it was ever used is the recipient's public page. So the cleaning
 * company that sends an invoice and is later asked for a copy has no way to
 * get at their own document — the row is there, the file is there, and nothing
 * connects them.
 *
 * The bucket is private, so the link has to be signed. The authenticated user
 * may read their own folder ("Users can view own pdfs", migration 013), which
 * means the browser can mint the URL itself without a route.
 */

const ARCHIVE = readFileSync("src/app/(app)/dokumente/page.tsx", "utf8");

describe("the archive can open a stored document", () => {
  it("mints a signed URL for the private bucket", () => {
    expect(ARCHIVE).toContain("createSignedUrl");
    expect(ARCHIVE).toMatch(/from\("pdfs"\)/);
  });

  it("offers the action only where a file exists", () => {
    expect(ARCHIVE).toMatch(/canOpenPdf/);
  });

  it("opens the tab synchronously so the popup blocker allows it", () => {
    // The signed URL arrives after an await. Opening the tab then is blocked in
    // Safari and Firefox — the same reason handleSend pre-opens its WhatsApp
    // tab while the click is still the current gesture.
    const handler = ARCHIVE.slice(
      ARCHIVE.indexOf("const handleOpenPdf"),
      ARCHIVE.indexOf("[source]", ARCHIVE.indexOf("const handleOpenPdf")),
    );
    expect(handler).toContain('window.open("about:blank"');
    const openAt = handler.indexOf('window.open("about:blank"');
    const awaitAt = handler.indexOf("await");
    expect(openAt).toBeGreaterThan(-1);
    expect(openAt).toBeLessThan(awaitAt);
  });

  it("says something when the file cannot be fetched", () => {
    const handler = ARCHIVE.slice(
      ARCHIVE.indexOf("const handleOpenPdf"),
      ARCHIVE.indexOf("[source]", ARCHIVE.indexOf("const handleOpenPdf")),
    );
    expect(handler).toMatch(/setToast\(/);
  });

  it("closes the blank tab when the link could not be made", () => {
    // Otherwise the user is left staring at about:blank with no explanation.
    const handler = ARCHIVE.slice(
      ARCHIVE.indexOf("const handleOpenPdf"),
      ARCHIVE.indexOf("[source]", ARCHIVE.indexOf("const handleOpenPdf")),
    );
    expect(handler).toMatch(/\.close\(\)/);
  });
});
