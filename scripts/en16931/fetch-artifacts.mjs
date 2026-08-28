#!/usr/bin/env node
/**
 * Downloads the artefacts needed to validate generated ZUGFeRD XML against the
 * official EN 16931 rules, into a gitignored cache directory.
 *
 *   1. The CEF validation stylesheet — the compiled form of the official
 *      Schematron from ConnectingEurope/eInvoicing-EN16931. This is the same
 *      artefact the EU reference validators use, not a reimplementation.
 *   2. Saxon-HE 10.9, an XSLT 2.0 processor.
 *
 * Why Saxon 10 and not the current 12.x: Saxon 12 requires the separate
 * xmlresolver library on the classpath and aborts with NoClassDefFoundError
 * without it — and it exits in a way that is easy to mistake for "validation
 * passed with no findings". Saxon 10.9 has no such dependency.
 *
 * Both files are pinned by SHA-256. The upstream repository publishes no
 * stable release tag reachable from here, so the checksum is what makes a run
 * reproducible: if upstream changes the rules, this fails loudly and the new
 * digest has to be reviewed and adopted deliberately, rather than silently
 * changing what "valid" means between two runs.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CACHE_DIR = path.resolve(process.cwd(), ".en16931-cache");

const ARTEFACTS = [
  {
    file: "EN16931-CII-validation.xslt",
    url: "https://raw.githubusercontent.com/ConnectingEurope/eInvoicing-EN16931/master/cii/xslt/EN16931-CII-validation.xslt",
    sha256: "0b234dea2bbfee739b7761e607a992c17fab88773014ef56355b6158cfb1cc53",
  },
  {
    file: "saxon-he-10.9.jar",
    url: "https://repo1.maven.org/maven2/net/sf/saxon/Saxon-HE/10.9/Saxon-HE-10.9.jar",
    sha256: "491d8edf4ec811d15c2b2417b007218b9b938f15e4dfbad004025beb4e70e960",
  },
];

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function ensure(artefact) {
  const target = path.join(CACHE_DIR, artefact.file);

  if (existsSync(target)) {
    const actual = digest(await readFile(target));
    if (actual === artefact.sha256) {
      console.log(`  cached   ${artefact.file}`);
      return;
    }
    console.log(`  stale    ${artefact.file} — re-downloading`);
  }

  console.log(`  fetching ${artefact.file}`);
  const response = await fetch(artefact.url);
  if (!response.ok) {
    throw new Error(`${artefact.url} -> HTTP ${response.status}`);
  }
  const body = Buffer.from(await response.arrayBuffer());

  const actual = digest(body);
  if (actual !== artefact.sha256) {
    throw new Error(
      `Checksum mismatch for ${artefact.file}\n` +
        `  expected ${artefact.sha256}\n` +
        `  actual   ${actual}\n` +
        `Upstream changed. Review the diff, then update the pinned digest in\n` +
        `scripts/en16931/fetch-artifacts.mjs deliberately — do not just paste\n` +
        `the new value: it decides which invoices count as valid.`,
    );
  }

  await writeFile(target, body);
  console.log(`  ok       ${artefact.file} (${body.length} bytes)`);
}

await mkdir(CACHE_DIR, { recursive: true });
console.log(`EN 16931 artefacts -> ${CACHE_DIR}`);
for (const artefact of ARTEFACTS) {
  await ensure(artefact);
}
console.log("Done.");
