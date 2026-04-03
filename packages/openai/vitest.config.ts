import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "defuss-openai": path.resolve(__dirname, "src/index.ts"),
    },
  },
  test: {
    include: ["test/e2e.node.test.ts"],
    testTimeout: 120_000,
  },
});
