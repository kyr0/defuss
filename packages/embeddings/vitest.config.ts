import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [
      "src/**/needle-haystack.test.ts",
      "src/**/needle-haystack.live.test.ts",
      "src/**/*.browser.test.ts",
      "src/**/*.live.test.ts",
      "dist/**",
      "node_modules/**",
    ],
    clearMocks: true,
    globals: true,
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.ts", "src/**/*.browser.test.ts"]
    }
  }
});
