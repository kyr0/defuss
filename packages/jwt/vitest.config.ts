import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    testTimeout: 290000, // 290 seconds per test
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    clearMocks: true,
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      exclude: ["src/cli.ts", "src/types.ts"],
      reportsDirectory: "./coverage",
      all: true,
      ignoreEmptyLines: true,
    },
  },
});
