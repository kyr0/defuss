import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "defuss-openai": path.resolve(__dirname, "src/index.ts"),
    },
  },
  test: {
    include: ["test/e2e.browser.test.ts"],
    testTimeout: 120_000,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
  },
});
