import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [wasm()],
  test: {
    testTimeout: 60000,
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.browser.test.ts", "**/node_modules/**", "**/dist/**"],
    clearMocks: true,
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.browser.test.ts",
        "src/**/*.bench.ts",
        "src/wasm-pkg.d.ts",
      ],
    },
  },
});
