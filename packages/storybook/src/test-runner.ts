import { resolve, join } from "node:path";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { scanStories } from "./scanner.js";
import type { ResolvedStorybookConfig, StoryManifestEntry } from "./types.js";

/**
 * Run automated render tests for all discovered stories using Vitest + Playwright.
 *
 * For each story:
 * 1. Import the story module
 * 2. Render each named story export into the DOM
 * 3. Assert no uncaught errors
 * 4. Assert non-empty render
 */
export async function runStorybookTests(config: ResolvedStorybookConfig) {
  const entries = await scanStories(config);

  if (entries.length === 0) {
    console.log("No stories found. Nothing to test.");
    return;
  }

  console.log(`Found ${entries.length} story files. Generating tests...\n`);

  // Create a temporary test directory
  const tmpDir = join(config.projectDir, ".storybook-tests");
  if (existsSync(tmpDir)) {
    await rm(tmpDir, { recursive: true });
  }
  await mkdir(tmpDir, { recursive: true });

  // Generate test files
  const testFile = generateTestFile(entries);
  const testFilePath = join(tmpDir, "stories.test.tsx");
  await writeFile(testFilePath, testFile, "utf-8");

  // Generate vitest config
  const vitestConfig = generateVitestConfig(config, tmpDir);
  const configPath = join(tmpDir, "vitest.config.ts");
  await writeFile(configPath, vitestConfig, "utf-8");

  // Run vitest
  const { execSync } = await import("node:child_process");
  try {
    execSync(`bunx vitest run --config "${configPath}"`, {
      cwd: config.projectDir,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "test" },
    });
    console.log("\n✅ All story tests passed!");
  } catch (err) {
    console.error("\n❌ Some story tests failed.");
    process.exit(1);
  } finally {
    // Cleanup temp files
    try {
      await rm(tmpDir, { recursive: true });
    } catch {}
  }
}

function generateTestFile(entries: StoryManifestEntry[]): string {
  const imports = entries
    .filter((e) => e.type === "tsx") // Only test TSX stories, not MDX docs
    .map((entry, i) => {
      const varName = `storyModule${i}`;
      return `import * as ${varName} from "${entry.filePath}";`;
    })
    .join("\n");

  const tests = entries
    .filter((e) => e.type === "tsx")
    .map((entry, i) => {
      const varName = `storyModule${i}`;
      return `
  describe("${entry.title}", () => {
    const mod = ${varName};
    const storyExports = Object.entries(mod).filter(
      ([name, value]) => typeof value === "function" && name !== "default" && name !== "meta" && !name.startsWith("_")
    );

    for (const [name, storyFn] of storyExports) {
      it(\`renders \${name} without errors\`, () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        try {
          const result = (storyFn as Function)();
          render(result, container);
          expect(container.children.length).toBeGreaterThan(0);
        } finally {
          document.body.removeChild(container);
        }
      });
    }
  });`;
    })
    .join("\n");

  return `import { describe, it, expect } from "vitest";
import { render } from "defuss";

${imports}

${tests}
`;
}

function generateVitestConfig(
  config: ResolvedStorybookConfig,
  tmpDir: string,
): string {
  return `import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import defuss from "defuss-vite";
import path from "node:path";

export default defineConfig({
  plugins: [defuss()],
  resolve: {
    alias: {
      "defuss": path.resolve("${config.projectDir}", "node_modules/defuss/src/index.ts"),
      "defuss/jsx-runtime": path.resolve("${config.projectDir}", "node_modules/defuss/src/render/index.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "defuss",
  },
  test: {
    include: ["${tmpDir}/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "${config.browser}" }],
      headless: true,
    },
    testTimeout: 30000,
  },
});
`;
}
