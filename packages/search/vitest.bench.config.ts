import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

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
      provider: playwright(),
      instances: [
        { browser: "chromium" }
      ],
      headless: true,
    },
    testTimeout: 60_000 * 10, // 10 minutes timeout for longer benchmarks
  },
});
