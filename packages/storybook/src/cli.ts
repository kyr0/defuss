#!/usr/bin/env node

import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { loadConfig } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const usage = `
defuss-storybook — A lightweight storybook for defuss components

Usage:
  defuss-storybook dev  <folder>   Start dev server with HMR
  defuss-storybook build <folder>  Build static storybook
  defuss-storybook run  <folder>   Run render tests (Playwright)

Options:
  --port <number>    Override dev server port (default: 6006)
  --help, -h         Show this help message

Examples:
  bunx defuss-storybook dev .
  bunx defuss-storybook build .
  bunx defuss-storybook run .
`.trim();

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(usage);
    process.exit(0);
  }

  const positional = args.filter((a) => !a.startsWith("--"));
  const command = positional[0];
  const folder = positional[1] || ".";

  if (!["dev", "build", "run"].includes(command)) {
    console.error(`Unknown command: ${command}\n`);
    console.error(usage);
    process.exit(1);
  }

  const projectDir = resolve(folder);
  if (!existsSync(projectDir)) {
    console.error(`Directory not found: ${projectDir}`);
    process.exit(1);
  }

  const config = await loadConfig(projectDir);

  // Override port from CLI arg
  const portArgIdx = args.indexOf("--port");
  if (portArgIdx !== -1 && args[portArgIdx + 1]) {
    config.port = Number.parseInt(args[portArgIdx + 1], 10);
  }

  switch (command) {
    case "dev":
      await startDev(config);
      break;
    case "build":
      await buildStorybook(config);
      break;
    case "run":
      await runTests(config);
      break;
  }
}

async function startDev(config: Awaited<ReturnType<typeof loadConfig>>) {
  const { createServer } = await import("vite");
  const { storybookVitePlugin } = await import("./vite-plugin.js");

  const appDir = getAppDir();

  const server = await createServer({
    root: appDir,
    plugins: storybookVitePlugin(config),
    server: {
      port: config.port,
      open: true,
    },
    resolve: {
      alias: {
        // Allow story files to import from the user's project
        "@project": config.projectDir,
      },
    },
    css: {
      transformer: "lightningcss",
    },
    optimizeDeps: {
      include: ["defuss"],
      exclude: ["defuss-storybook"],
    },
  });

  await server.listen();

  console.log();
  console.log(`  🧩 defuss Storybook`);
  console.log(`  ➜ Local: http://localhost:${config.port}/`);
  console.log(`  ➜ Project: ${config.projectDir}`);
  console.log();

  server.printUrls();
}

async function buildStorybook(config: Awaited<ReturnType<typeof loadConfig>>) {
  const { build } = await import("vite");
  const { storybookVitePlugin } = await import("./vite-plugin.js");

  const appDir = getAppDir();
  const outDir = resolve(config.projectDir, config.outDir);

  console.log(`Building storybook to ${outDir}...`);

  await build({
    root: appDir,
    plugins: storybookVitePlugin(config),
    build: {
      outDir,
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        "@project": config.projectDir,
      },
    },
    css: {
      transformer: "lightningcss",
    },
  });

  console.log(`\n✅ Storybook built to ${outDir}`);
}

async function runTests(config: Awaited<ReturnType<typeof loadConfig>>) {
  const { runStorybookTests } = await import("./test-runner.js");
  await runStorybookTests(config);
}

/**
 * Resolve the app directory containing index.html and shell UI files.
 * Looks in multiple locations based on whether running from dist or src.
 */
function getAppDir(): string {
  // When running from dist/cli.mjs → ../app/
  const fromDist = resolve(__dirname, "..", "app");
  if (existsSync(join(fromDist, "index.html"))) return fromDist;

  // When running from src/cli.ts → ./app/ (sibling directory in src)
  const fromSrc = resolve(__dirname, "..", "app");
  if (existsSync(join(fromSrc, "index.html"))) return fromSrc;

  // Fallback: app is in the package root
  const fromPkgRoot = resolve(__dirname, "app");
  if (existsSync(join(fromPkgRoot, "index.html"))) return fromPkgRoot;

  console.error(
    "Could not locate the storybook app directory. Ensure the package is installed correctly.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
