import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  test: {
    testTimeout: 120_000,
    include: ["bench/**/*.bench.ts"],
    exclude: ["bench/**/*.browser.bench.ts", "**/node_modules/**", "**/dist/**"],
    benchmark: {
      include: ["bench/**/*.bench.ts"],
      exclude: ["bench/**/*.browser.bench.ts"],
    },
  },
});
