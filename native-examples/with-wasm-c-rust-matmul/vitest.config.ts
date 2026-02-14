import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    // important, for SharedArrayBuffer to be available (!!)
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
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
