import { join } from "node:path";
import type { SsgConfig } from "./types.js";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import esbuild from "esbuild";
import { rehypePlugins, remarkPlugins } from "./mdx-plugins.js";
import { tailwindPlugin } from "./plugins/tailwind.js";
import { autoHydratePlugin } from "./plugins/auto-hydrate.js";

/**
 * Reads the SSG configuration from the project directory.
 * @param projectDir The path to the project directory.
 * @param debug Whether to enable debug logging.
 * @returns The SSG configuration.
 */
export const readConfig = async (
  projectDir: string,
  debug: boolean,
): Promise<SsgConfig> => {
  const configPath = join(projectDir, "config.ts");
  let config = {} as SsgConfig;

  if (existsSync(configPath)) {
    if (debug) {
      console.log(`Using config from ${configPath}`);
    }

    const result = await esbuild.build({
      entryPoints: [configPath],
      format: "esm",
      bundle: true,
      target: ["esnext"],
      write: false,
    });
    const code = result.outputFiles[0].text;

    // Write to a temp file instead of a data URL to avoid Bun's NameTooLong error
    const tmpFile = join(tmpdir(), `defuss-ssg-config-${Date.now()}.mjs`);
    await writeFile(tmpFile, code, "utf-8");
    try {
      const module = await import(tmpFile);
      config = module.default;
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }
  }

  // apply meaningful defaults
  config.pages = config.pages || configDefaults.pages;
  config.output = config.output || configDefaults.output;
  config.components = config.components || configDefaults.components;
  config.assets = config.assets || configDefaults.assets;
  config.plugins = config.plugins || configDefaults.plugins;
  config.tmp = config.tmp || configDefaults.tmp;
  config.remarkPlugins = config.remarkPlugins || configDefaults.remarkPlugins;
  config.rehypePlugins = config.rehypePlugins || configDefaults.rehypePlugins;
  config.rpc = config.rpc ?? configDefaults.rpc;

  return config;
};

export const configDefaults: SsgConfig = {
  pages: "pages",
  output: "dist",
  components: "components",
  assets: "assets",
  tmp: ".ssg-temp",
  plugins: [tailwindPlugin, autoHydratePlugin],
  remarkPlugins,
  rehypePlugins,
  rpc: true,
};
