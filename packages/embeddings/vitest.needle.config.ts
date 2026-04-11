import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/needle-haystack.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    clearMocks: true,
    globals: true,
    testTimeout: 120_000,
  },
});