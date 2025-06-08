import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    environment: "happy-dom",
    testTimeout: 290000, // 290 seconds per test
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "./src/test-utils.ts"],
    clearMocks: true,
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      exclude: ["src/test-utils.ts", "src/express-server.ts", "src/types.d.ts"],
      ignoreEmptyLines: true,
    },
  },
});
