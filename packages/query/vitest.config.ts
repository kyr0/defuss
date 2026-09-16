import { defineConfig, type Plugin } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
// Resolve the workspace/installed morph peer without relying on its exports
// map exposing ./dist/*: require.resolve lands on dist/index.cjs.
const morphDist = dirname(require.resolve("defuss-morph"));

// The vitest browser server only serves the project root; expose the real
// morph engine bundle (the workspace peer, not a mock or vendored snapshot)
// under a fixed prefix so tests can load it with plain script tags.
const serveMorph: Plugin = {
  name: "defuss-query-serve-morph",
  configureServer(server) {
    server.middlewares.use("/__morph__", (req, res) => {
      const name = decodeURIComponent(req.url ?? "").replace(/^\/+/, "");
      const file = resolve(morphDist, name);
      if (!file.startsWith(morphDist)) {
        res.statusCode = 403;
        res.end();
        return;
      }
      try {
        res.setHeader("Content-Type", "text/javascript");
        res.end(readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
  },
};

export default defineConfig({
  plugins: [serveMorph],
  test: {
    clearMocks: true,
    globals: true,
    // root-level coverage: merged across the node and browser projects.
    // The browser suite runs once against the source modules (/src/all.ts
    // through the instrumented dev server) so hits attribute to src/*.ts;
    // the shipped bundles are tested via blob scripts (uninstrumented).
    coverage: {
      provider: "v8",
      // json-summary is the machine-readable source for scripts/readme-sync.ts
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.*", "src/types.ts", "src/global.ts"],
    },
    projects: [
      {
        // DOM-free API/import semantics, plain node
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "**/*.browser.test.ts",
            "tests/types.test.ts",
          ],
          clearMocks: true,
          globals: true,
        },
      },
      {
        // authoritative test bed: full DOM suite in real Chromium
        test: {
          name: "browser",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            headless: true,
          },
          testTimeout: 60000,
          include: ["tests/**/*.browser.test.ts"],
          exclude: ["**/node_modules/**"],
          clearMocks: true,
          globals: true,
        },
      },
    ],
  },
});
