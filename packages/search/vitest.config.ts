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
    exclude: ["**/*.bench.ts"],
    browser: {
      enabled: true,
      headless: false,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
  },
});
