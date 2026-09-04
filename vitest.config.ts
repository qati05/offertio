import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    // `node`, not `jsdom`. Building a DOM per test file was the largest single
    // cost in the suite — measured at 60.95s of environment setup against
    // 6.76s of actual test execution across 76 files — and only 7 files need
    // one. Those opt in with a `@vitest-environment jsdom` docblock, an idiom
    // this repo already used the other way round on individual files.
    //
    // Measured after the change: 31.3s -> 12.5s wall clock, same assertions.
    environment: "node",
    exclude: ["e2e/**", ".claude/**", ".omx/**", "node_modules/**", ".next/**"],
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
