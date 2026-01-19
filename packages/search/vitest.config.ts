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
    exclude: ["**/*.bench.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" }
      ],
      headless: true,
    },
  },
});
