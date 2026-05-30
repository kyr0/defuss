import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 60_000,
    include: ["test/**/*.test.ts"],
  },
});
