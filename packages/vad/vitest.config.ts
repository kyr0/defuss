import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "defuss-vad": path.resolve(__dirname, "src/index.ts"),
    },
  },
  test: {
    include: ["test/e2e.node.test.ts"],
    testTimeout: 120_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage/node",
    },
  },
});
