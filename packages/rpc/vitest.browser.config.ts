import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    name: "rpc-browser",
    include: ["src/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    globalSetup: ["src/upload.browser.setup.ts"],
    testTimeout: 60000,
    hookTimeout: 15000,
  },
});
