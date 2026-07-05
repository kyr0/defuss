import { defineConfig } from "vitest/config";

/**
 * Benchmark configuration for unit-level performance tests (*.bench.ts).
 * Run with: bun run bench
 *
 * For DOM-based performance tests (e.g., 1k rows), use:
 *   bun run bench:browser
 */
export default defineConfig({
    test: {
        include: ["**/*.bench.ts"],
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/__benchmarks__/**",
        ],
        environment: "node",
    },
});
