import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Browser-based test configuration using Playwright with Chrome headless.
 * Run with: pnpm test:browser
 * 
 * Excludes SSR-specific tests that require happy-dom's virtual DOM.
 */
export default defineConfig({
    plugins: [],
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: "chromium" }
            ],
            headless: true,
        },
        testTimeout: 60000,
        include: ["**/*.test.{ts,tsx}"],
        exclude: [
            "**/kitchensink/**",
            "**/node_modules/**",
            "**/dist/**",
            // SSR-specific tests that don't work in real browser
            "**/server.test.tsx",
            "**/dom-ssr.test.tsx",
            // DOMContentLoaded tests that don't work (already fired in browser)
            "**/ready.test.ts",
            // jQuery compat uses node:fs and happy-dom APIs
            "**/jquery-compat/**",
        ],
        clearMocks: true,
        globals: true,
    },
});
