import { join } from "node:path";
import type { SsgConfig } from "./types.js";
import { existsSync } from "node:fs";
import esbuild from "esbuild";
import { rehypePlugins, remarkPlugins } from "./mdx-plugins.js";
import { tailwindPlugin } from "./plugins/tailwind.js";

export const readConfig = async (projectDir: string, debug: boolean) => {
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

    // Encode the code as a base64 data URL for dynamic import
    const encoded = Buffer.from(code).toString("base64");
    const dataUrl = `data:text/javascript;base64,${encoded}`;

    // Dynamically import the module
    const module = await import(dataUrl);
    config = module.default;
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

  return config;
};

export const configDefaults: SsgConfig = {
  pages: "pages",
  output: "dist",
  components: "components",
  assets: "assets",
  tmp: ".ssg-temp",
  plugins: [tailwindPlugin],
  remarkPlugins,
  rehypePlugins,
};
