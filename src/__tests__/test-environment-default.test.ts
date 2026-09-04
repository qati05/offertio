import { describe, it, expect } from "vitest";

// The suite runs in `node` by default; a file that needs a DOM opts in with a
// per-file environment docblock.
//
// Why it is worth pinning: building a jsdom per test file was the single
// largest cost in the suite. Measured before the change, across 76 files:
//
//   Duration 31.29s (… tests 6.76s, environment 60.95s)
//
// Sixty-one seconds of CPU spent constructing DOMs against under seven
// actually running assertions. Only 7 of 78 files need a DOM at all.
//
// Note the comment style: this file uses line comments on purpose. Vitest
// reads the first *block* comment of a file looking for the environment
// pragma, so spelling that pragma out in prose inside a `/** … */` header
// silently reconfigures the very file that is trying to assert the default.
// That happened while writing this test.
//
// This file carries no pragma, so it asserts the default rather than an
// opt-in. If someone sets `environment: "jsdom"` globally again, this goes red
// instead of the suite quietly getting slow again.
describe("test environment defaults", () => {
  it("runs in node, so no DOM globals leak into pure logic tests", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });

  it("still provides the storage shims that setup.ts installs on globalThis", () => {
    // setup.ts defines these on globalThis rather than on window, so they
    // survive the switch. Code that guards on `typeof window` now takes its
    // server branch here — the branch that was never exercised before.
    expect(typeof localStorage.getItem).toBe("function");
    expect(typeof sessionStorage.getItem).toBe("function");
  });
});
