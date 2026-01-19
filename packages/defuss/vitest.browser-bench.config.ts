import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Browser-based benchmark configuration using Playwright with Chrome headless.
 * Run with: pnpm bench:browser
 *
 * NOTE: This separates benchmarks from standard tests to avoid pollution.
 */
export default defineConfig({
    esbuild: {
        target: "es2022",
    },
    resolve: {
        conditions: ["benchmark", "browser", "development", "default", "module"],
    },
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: "chromium" }
            ],
            headless: true,
            // Enable CDP support for performance metrics
            // We'll access the CDP session manually in the tests
        },
        benchmark: {
            include: ["**/*.browser-bench.{ts,tsx}"],
            exclude: ["**/node_modules/**", "**/dist/**"],
            // A bit more time for large DOM operations if needed

        },
        // We might need longer timeouts for big benchmark suites
        testTimeout: 20000,
        hookTimeout: 20000,
        teardownTimeout: 20000,
        include: ["**/*.browser-bench.{ts,tsx}"],
        exclude: ["**/kitchensink/**", "**/node_modules/**", "**/dist/**"],
        globals: true,
    },
});
