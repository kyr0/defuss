import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.bench.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: "playwright",
      screenshotFailures: false,
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: "chromium" }],
    },
    testTimeout: 60_000 * 10, // 10 minutes timeout for longer benchmarks
  },
});
