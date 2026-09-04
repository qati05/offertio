import { describe, it, expect } from "vitest";
import ts from "typescript";
import path from "path";
import fs from "fs";

/**
 * The compiler settings are a safety net, so this test checks that the net is
 * actually there — by compiling code that must be rejected, not by reading the
 * JSON and trusting the key names.
 *
 * Asserting `tsconfig.json contains "noImplicitReturns": true` would pass even
 * if the option were misspelled, nested in the wrong block, or overridden
 * elsewhere. Running the real compiler with the project's real options is the
 * only thing that proves the rule is in force.
 *
 * `noUncheckedIndexedAccess` is deliberately NOT asserted here: it reports 146
 * errors in the current code base and every fix is a behaviour decision in
 * compliance code, so it is a proposal for Reshat, not a silent change.
 */

const projectRoot = path.resolve(__dirname, "../..");

function compilerOptions(): ts.CompilerOptions {
  const configPath = path.join(projectRoot, "tsconfig.json");
  const raw = ts.readConfigFile(configPath, (p) => fs.readFileSync(p, "utf8"));
  expect(raw.error, "tsconfig.json must parse").toBeUndefined();
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, projectRoot);
  return parsed.options;
}

/** Compiles a snippet in memory with the project's own options. */
function errorCodesFor(source: string): number[] {
  const options = { ...compilerOptions(), noEmit: true, incremental: false, skipLibCheck: true };
  const fileName = path.join(projectRoot, "__strictness_probe__.ts");

  const host = ts.createCompilerHost(options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, shouldCreate) =>
    name === fileName
      ? ts.createSourceFile(name, source, languageVersion, true)
      : originalGetSourceFile(name, languageVersion, onError, shouldCreate);
  host.fileExists = (name) => (name === fileName ? true : ts.sys.fileExists(name));
  host.readFile = (name) => (name === fileName ? source : ts.sys.readFile(name));

  const program = ts.createProgram([fileName], options, host);
  return program
    .getSemanticDiagnostics()
    .concat(program.getSyntacticDiagnostics())
    .map((d) => d.code);
}

describe("tsconfig strictness is actually enforced by the compiler", () => {
  it("rejects a function where only some paths return (noImplicitReturns)", () => {
    // The return type deliberately includes `undefined`. Without that, `strict`
    // alone already rejects this with TS2366 and the probe would pass whether
    // or not noImplicitReturns is on — it would prove nothing. With it, only
    // noImplicitReturns can produce an error here (TS7030).
    expect(
      errorCodesFor(`
        export function pick(flag: boolean): string | undefined {
          if (flag) { return "yes"; }
        }
      `),
    ).toContain(7030);
  });

  it("rejects a switch case that falls through (noFallthroughCasesInSwitch)", () => {
    // TS7029: Fallthrough case in switch.
    expect(
      errorCodesFor(`
        export function rate(land: string): number {
          switch (land) {
            case "CH":
              const x = 1;
            case "DE":
              return 19;
            default:
              return 0;
          }
        }
      `),
    ).toContain(7029);
  });

  it("rejects an unused local (noUnusedLocals)", () => {
    // TS6133: declared but its value is never read.
    expect(
      errorCodesFor(`
        export function total(): number {
          const unused = 42;
          return 1;
        }
      `),
    ).toContain(6133);
  });

  it("rejects an unused parameter (noUnusedParameters)", () => {
    expect(
      errorCodesFor(`
        export function total(used: number, unused: number): number {
          return used;
        }
      `),
    ).toContain(6133);
  });

  it("still accepts code that breaks none of these rules", () => {
    expect(
      errorCodesFor(`
        export function rate(land: string): number {
          switch (land) {
            case "CH":
              return 8;
            case "DE":
              return 19;
            default:
              return 0;
          }
        }
      `),
    ).toEqual([]);
  });
});
