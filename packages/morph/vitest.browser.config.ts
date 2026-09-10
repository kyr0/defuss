import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Authoritative test bed: the full suite runs in real Chromium via Playwright.
 * (The happy-dom config remains as a fast pre-check; real browser semantics
 * are only guaranteed here.)
 *
 * Run with: bun run test:browser
 */
export default defineConfig({
  test: {
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
});
