import { defineConfig } from "vitest/config";
import path from "node:path";
import { playwright } from "@vitest/browser-playwright";

const defussRoot = path.resolve(__dirname, "..");

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(defussRoot, "src"),
            "defuss": path.resolve(defussRoot, "src/index.ts"),
            "defuss/jsx-runtime": path.resolve(defussRoot, "src/render/index.ts"),
            // Add the absolute path pattern that esbuild generates
            [defussRoot + "/jsx-dev-runtime"]: path.resolve(defussRoot, "src/render/dev/index.ts"),
            [defussRoot + "/jsx-runtime"]: path.resolve(defussRoot, "src/render/index.ts"),
        },
    },
    esbuild: {
        jsx: "automatic",
        jsxImportSource: defussRoot,
    },
    test: {
        name: "kitchensink",
        root: __dirname,
        include: ["./*.test.{ts,tsx}"],
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: "chromium" }
            ],
            headless: true,
        },
        testTimeout: 30000,
        hookTimeout: 10000,
    },
});
