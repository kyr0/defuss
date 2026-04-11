import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.live.test.ts"],
    exclude: ["src/**/needle-haystack.live.test.ts", "dist/**", "node_modules/**"],
    clearMocks: true,
    globals: true,
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
});