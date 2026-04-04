import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "defuss-vad": path.resolve(__dirname, "src/index.ts"),
    },
  },
  test: {
    include: ["test/e2e.browser.test.ts"],
    testTimeout: 120_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage/browser",
    },
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
  },
});
