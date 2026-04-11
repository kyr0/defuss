import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.browser.test.ts"],
    exclude: ["src/**/*.live.browser.test.ts"],
    clearMocks: true,
    globals: true,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true
    }
  }
});
