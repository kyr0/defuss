import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Why: coverage previously lived in two disconnected configs (happy-dom node
 * run + Playwright browser run), so each report undercounted what the other
 * exercised (e.g. index.ts transition slots and all.ts only ever ran in the
 * browser project). Using `projects` makes vitest collect coverage at the
 * root and merge both runs into a single, honest table.
 */
export default defineConfig({
  test: {
    clearMocks: true,
    globals: true,
    // root-level coverage: merged across all projects below
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      // types.ts: type-only; all.ts: CDN shim whose code runs via dist/all.js
      // (bundle coverage can't be attributed back to it; behavior is covered
      // by global.browser.test.ts loading the real artifact)
      exclude: ["**/*.test.*", "src/types.ts", "src/all.ts"],
    },
    projects: [
      {
        // fast pre-check: plain node/happy-dom semantics, no browser artifacts
        test: {
          name: "node",
          environment: "happy-dom",
          testTimeout: 30000,
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/*.browser.test.*"],
          clearMocks: true,
          globals: true,
        },
      },
      {
        // authoritative test bed: full suite in real Chromium via Playwright
        test: {
          name: "browser",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            headless: true,
          },
          testTimeout: 60000,
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**"],
          clearMocks: true,
          globals: true,
        },
      },
    ],
  },
});
