import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * DOM benchmark configuration for __benchmarks__ folder.
 * Runs in happy-dom environment (simulates browser DOM).
 *
 * Used by both bench:browser and bench:ssr scripts.
 * Run with: bun run bench:browser  or  bun run bench:ssr
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    __BENCH_ENV__: JSON.stringify("happy-dom"),
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@/render",
  },
  test: {
    environment: "happy-dom",
    testTimeout: 120000,
    include: ["src/__benchmarks__/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/store/**",
    ],
    globals: true,
  },
});
