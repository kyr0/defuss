import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    testTimeout: 60_000,
    include: ["src/**/*.browser.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    clearMocks: true,
    globals: true,
  },
});
