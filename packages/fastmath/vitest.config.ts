import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/*.bench.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: "playwright",
      screenshotFailures: false,
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: "chromium" }],
    },
  },
});
