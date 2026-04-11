import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/needle-haystack.live.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    clearMocks: true,
    globals: true,
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
});