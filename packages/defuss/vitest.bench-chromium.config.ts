import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

/**
 * Chromium-based DOM benchmark configuration using Playwright.
 * Runs benchmarks in a real browser engine for accurate DOM performance.
 *
 * Run with: bun run bench:chromium
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    __BENCH_ENV__: JSON.stringify("chromium"),
  },
  oxc: {
    jsx: {
      importSource: "@/render",
    },
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" },
      ],
      headless: true,
    },
    testTimeout: 120000,
    include: ["src/__benchmarks__/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/store/**",
      "**/dom-benchmark.ssr.test.tsx",
    ],
    globals: true,
  },
});
