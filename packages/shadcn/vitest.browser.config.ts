import { defineConfig } from "vitest/config";
import path from "node:path";
import { playwright } from "@vitest/browser-playwright";

const defussRoot = path.resolve(__dirname, "../defuss");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(defussRoot, "src"),
      defuss: path.resolve(defussRoot, "src/index.ts"),
      "defuss/jsx-runtime": path.resolve(defussRoot, "src/render/index.ts"),
      "defuss/jsx-dev-runtime": path.resolve(
        defussRoot,
        "src/render/dev/index.ts",
      ),
      [defussRoot + "/jsx-dev-runtime"]: path.resolve(
        defussRoot,
        "src/render/dev/index.ts",
      ),
      [defussRoot + "/jsx-runtime"]: path.resolve(
        defussRoot,
        "src/render/index.ts",
      ),
      "defuss-dataview": path.resolve(__dirname, "../dataview/src/index.ts"),
      "defuss-shadcn": path.resolve(__dirname, "src/index.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: defussRoot,
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    testTimeout: 30000,
    hookTimeout: 10000,
    include: ["src/**/*.browser.test.{ts,tsx}"],
    clearMocks: true,
    globals: true,
  },
});
