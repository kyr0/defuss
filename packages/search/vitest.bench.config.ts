import { defineConfig } from "vitest/config";

export default defineConfig({
  publicDir: "public",
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
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
