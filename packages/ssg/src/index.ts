import mdx, { type Options } from "@mdx-js/esbuild";
import esbuild from "esbuild";
import glob from "fast-glob";
import remarkFrontmatter from "remark-frontmatter";
//import rehypeMdxTitle from "rehype-mdx-title";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import {
  renderToString,
  renderSync,
  getBrowserGlobals,
  getDocument,
  type VNode,
} from "defuss/server";

import { resolve, join, dirname, sep } from "node:path";
import { cp, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, rm, rmdirSync } from "node:fs";
import chokidar from "chokidar";

import express from "express";
import serveStatic from "serve-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// you may import these as defaults in your config file (and extend them)
// like this: import { remarkPlugins as defaultRemarkPlugins } from "defuss-ssg";
export const remarkPlugins: Options["remarkPlugins"] = [
  // Parse both YAML and TOML (or omit options to default to YAML)
  [remarkFrontmatter, ["yaml", "toml"]],
  // Export each key as an ESM binding: export const title = "…"
  [remarkMdxFrontmatter, { name: "meta" }],
  // Convert $…$ and $$…$$ into math nodes for KaTeX
  remarkMath,
];

// you may import these as defaults in your config file (and extend them)
// like this: import { rehypePlugins as defaultRehypePlugins } from "defuss-ssg";
export const rehypePlugins: Options["rehypePlugins"] = [
  //rehypeMdxTitle,
  rehypeKatex,
];

export type PluginFnPageHtml = (
  html: string,
  relativeOutputHtmlFilePath: string,
  config: SsgConfig,
) => Promise<string> | string;

export type PluginFnPageVdom = (
  vdom: VNode,
  relativeOutputHtmlFilePath: string,
  config: SsgConfig,
) => Promise<VNode> | VNode;

export type PluginFnPageDom = (
  dom: HTMLElement,
  relativeOutputHtmlFilePath: string,
  config: SsgConfig,
) => Promise<HTMLElement> | HTMLElement;

export type PluginFnPrePost = (config: SsgConfig) => Promise<string> | void;

export type PluginFn =
  | PluginFnPageHtml
  | PluginFnPageVdom
  | PluginFnPageDom
  | PluginFnPrePost;

/**
 * Plugin interface for extending the SSG build process
 */
export interface SsgPlugin {
  /**
   * The name of the plugin
   */
  name: string;

  /**
   * When to run the plugin: "pre" before the build starts, "post" after the build completes
   * "page-vdom" after the VDOM for each page is created, before rendering to DOM
   * "page-dom" after the DOM for each page is created, before serializing to HTML
   * "page-html" after the HTML for each page is created, before writing to disk
   */
  phase: "pre" | "page-vdom" | "page-dom" | "page-html" | "post";

  /**
   * The plugin function to execute
   * @param config The current SsgConfig object
   */
  fn: PluginFn;
}

export interface SsgConfig {
  /**
   * Input directory containing page files (e.g., MDX files)
   * Defaults to "pages"
   */
  pages: string;

  /**
   * Output directory for generated static site files
   * Defaults to "dist"
   */
  output: string;

  /**
   * Directory containing reusable components (e.g., defuss components)
   * Defaults to "components"
   */
  components: string;

  /**
   * Directory containing static assets (e.g., images, fonts)
   * Defaults to "assets"
   */
  assets: string;

  /**
   * Temporary working directory for build process
   * Defaults to ".ssg-temp"
   */
  tmp: string;

  /**
   * Optional list of plugins to extend the build process
   */
  plugins: Array<SsgPlugin>;

  /**
   * Remark plugins to use for MDX processing
   * You can import the default set from "defuss-ssg" and extend it
   * like this: import { remarkPlugins as defaultRemarkPlugins } from "defuss-ssg"
   */
  remarkPlugins: Options["remarkPlugins"];

  /**
   * Rehype plugins to use for MDX processing
   * You can import the default set from "defuss-ssg" and extend it
   * like this: import { rehypePlugins as defaultRehypePlugins } from "defuss-ssg"
   */
  rehypePlugins: Options["rehypePlugins"];
}

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
  plugins: [],
  remarkPlugins,
  rehypePlugins,
};

export interface BuildOptions {
  /**
   * Enable debug logging during the build process
   * Defaults to false
   */
  debug?: boolean;

  /**
   * The root directory of the project to build
   * No default - this must be provided
   */
  projectDir: string;
}

/**
 * A single, complete build process for a static site project.
 * @param projectDir The root directory of the project to build
 */
export const build = async ({ projectDir, debug = false }: BuildOptions) => {
  const startTime = performance.now();

  const config = (await readConfig(projectDir, debug)) as SsgConfig;

  if (debug) {
    console.log("PRE config", config);
  }

  if (debug) {
    console.log("Using config:", config);
  }

  // construct relative paths
  const inputPagesDir = join(projectDir, config.pages);
  const inputComponentsDir = join(projectDir, config.components);
  const inputAssetsDir = join(projectDir, config.assets);

  const tmpPagesDir = join(config.tmp, config.pages);
  const tmpComponentsDir = join(config.tmp, config.components);

  const outputProjectDir = join(projectDir, config.output);
  const outputPagesDir = join(projectDir, config.output, config.pages);
  const outputComponentsDir = join(
    projectDir,
    config.output,
    config.components,
  );
  const outputAssetsDir = join(projectDir, config.output, config.assets);

  if (debug) {
    console.log("Input pages dir:", inputPagesDir);
    console.log("Input components dir:", inputComponentsDir);
    console.log("Input assets dir:", inputAssetsDir);
    console.log("Temp pages dir:", tmpPagesDir);
    console.log("Temp components dir:", tmpComponentsDir);
    console.log("Output pages dir:", outputPagesDir);
    console.log("Output components dir:", outputComponentsDir);
    console.log("Output assets dir:", outputAssetsDir);
  }

  // validate that the input directories exist
  if (!existsSync(inputPagesDir)) {
    throw new Error(`Input pages directory does not exist: ${inputPagesDir}`);
  } else if (debug) {
    console.log(`Input pages directory exists: ${inputPagesDir}`);
  }

  if (!existsSync(inputComponentsDir)) {
    console.warn(
      `There is no components directory: ${inputComponentsDir}. You may not be able to use any custom components.`,
    );
  }

  if (!existsSync(inputAssetsDir)) {
    console.warn(
      `There is no assets directory: ${inputAssetsDir}. You may not be able to serve any custom assets.`,
    );
  }

  // run any "pre" plugins
  for (const plugin of config.plugins || []) {
    if (plugin.phase === "pre") {
      if (debug) {
        console.log(`Running pre-plugin: ${plugin.name}`);
      }
      await (plugin.fn as PluginFnPrePost)(config);
    }
  }

  // rm -rf the temporary folder if it exists
  if (existsSync(config.tmp)) {
    if (debug) {
      console.log(`Removing existing temp folder: ${config.tmp}`);
    }
    rmdirSync(config.tmp, { recursive: true });
  }

  // copying all files into a .ssg-temp folder, so that we can create/patch files on-the-fly
  // and compile them together with other files for smart chunking (e.g. code splitting of components sharing the defuss lib).
  // We copy the entire pages, components, and config files.
  await cp(projectDir, config.tmp, {
    recursive: true,
    filter: (src: string) => {
      const relative = src.replace(join(projectDir, ""), "");
      if (
        relative.startsWith(join("assets", "")) ||
        relative.startsWith(join("node_modules", ""))
      ) {
        return false;
      }
      return true;
    },
  });

  // writing the hydration component and the hydration script into the
  // temporary components folder, so that it can be used by MDX files
  // and compiles with esbuild's tree shaking and code splitting.
  await cp(
    // because of this the packaging of defuss-ssg must be done with "files" including the "components" folder
    // in a built situation, __dirname is the dist folder of defuss-ssg
    resolve(join(__dirname, "..", "src", "components", "hydrate.tsx")),
    join(tmpComponentsDir, "hydrate.tsx"),
  );

  // this code is injected in the vdom that makes up each HTML file as a script for hydration,
  // only if the vdom contains at least one Hydrate component (and therefore interactive CSR is required).
  await cp(
    // because of this the packaging of defuss-ssg must be done with "files" including the "runtime" file
    // in a built situation, __dirname is the dist folder of defuss-ssg
    resolve(join(__dirname, "..", "src", "runtime.ts")),
    join(tmpComponentsDir, "runtime.ts"),
  );

  // compile all MDX files from content into .js files into the temp output folder
  await esbuild.build({
    entryPoints: [join(tmpPagesDir, "**/*.mdx")],
    format: "esm",
    bundle: true,
    sourcemap: true,
    target: ["esnext"],
    outdir: tmpPagesDir,
    plugins: [
      mdx({
        // using the defuss jsxImportSource so that the output code contains JSX runtime calls
        // and can be rendered to HTML here on the server (in Node.js).
        jsxImportSource: "defuss",

        // We also use any remark/rehype plugins specified in the config file.
        remarkPlugins: config.remarkPlugins,
        rehypePlugins: config.rehypePlugins,
      }),
    ],
  });

  // now, compile all components into .js files into the temp components folder
  await esbuild.build({
    entryPoints: [
      join(tmpComponentsDir, "**/*.tsx"),
      join(tmpComponentsDir, "**/*.ts"),
    ],
    format: "esm",
    bundle: true,

    // making sure we can do code splitting for shared dependencies (e.g. defuss lib)
    splitting: true,

    target: ["esnext"],
    outdir: tmpComponentsDir,
  });

  // after transpilation of TSX -> ESM JSX, let's evaluate the JSX files
  // using Node.js, take the resulting VDOM tree, render it into a DOM sub-tree,
  // and serialize this to HTML.
  const outputFiles = await glob.async(join(tmpPagesDir, "**/*.js"));

  if (!existsSync(outputProjectDir)) {
    mkdirSync(outputProjectDir, { recursive: true });
  }

  for (const outputFile of outputFiles) {
    // in-place replacing the .js file extension with .html
    const outputHtmlFilePath = outputFile.replace(".js", ".html");

    // determine the relative path inside the pages folder
    const relativeOutputHtmlFilePath = outputHtmlFilePath.replace(
      `${tmpPagesDir}${sep}`,
      "",
    );

    if (debug) {
      console.log("Processing output file (JS):", outputFile);
      console.log("Output HTML file path:", outputHtmlFilePath);
      console.log("Relative output HTML path:", relativeOutputHtmlFilePath);
    }

    // dynamically import the page module (evaluation of the ESM JSX code,
    // yielding ESM exports (we read manually to prevent import cache - relevant for serve mode))
    const code = await readFile(outputFile, "utf-8");
    const encoded = Buffer.from(code).toString("base64");
    const dataUrl = `data:text/javascript;base64,${encoded}`;

    // Dynamically import the module using the data URL
    const exports = await import(dataUrl);

    if (debug) {
      console.log("exports", exports);
    }

    // running the default export function with props = exports
    // will yield the VDOM tree for the page (JSX -> VDOM evaluation)
    let vdom = exports.default(exports) as VNode;

    // run any "page-vdom" plugins
    for (const plugin of config.plugins || []) {
      if (plugin.phase === "page-vdom") {
        if (debug) {
          console.log(`Running page-vdom plugin: ${plugin.name}`);
        }
        vdom = await (plugin.fn as PluginFnPageVdom)(
          vdom,
          relativeOutputHtmlFilePath,
          config,
        );
      }
    }

    // setting up a in-memory DOM environment (using defuss/server, backed by happy-dom)
    const browserGlobals = getBrowserGlobals();
    const document = getDocument(false, browserGlobals);
    browserGlobals.document = document;

    // rendering the VDOM tree into a virtual DOM sub-tree
    let el = renderSync(vdom, document.documentElement, {
      browserGlobals,
    }) as HTMLElement;

    // run any "page-dom" plugins
    for (const plugin of config.plugins || []) {
      if (plugin.phase === "page-dom") {
        if (debug) {
          console.log(`Running page-dom plugin: ${plugin.name}`);
        }
        el = await (plugin.fn as PluginFnPageDom)(
          el,
          relativeOutputHtmlFilePath,
          config,
        );
      }
    }

    // serializing the DOM sub-tree into HTML
    let html = renderToString(el);

    // run any "page-html" plugins
    for (const plugin of config.plugins || []) {
      if (plugin.phase === "page-html") {
        if (debug) {
          console.log(`Running page-html plugin: ${plugin.name}`);
        }
        html = await (plugin.fn as PluginFnPageHtml)(
          html,
          relativeOutputHtmlFilePath,
          config,
        );
      }
    }

    if (debug) {
      console.log("Writing HTML file", outputHtmlFilePath);
    }

    if (debug) {
      console.log("Relative HTML path:", relativeOutputHtmlFilePath);
    }

    const finalOutputFile = join(
      projectDir,
      config.output,
      relativeOutputHtmlFilePath,
    );

    if (debug) {
      console.log("Full HTML output path:", finalOutputFile);
    }

    // mkdir -p the output folder
    const finalOutputDir = dirname(finalOutputFile);
    if (!existsSync(finalOutputDir)) {
      mkdirSync(finalOutputDir, { recursive: true });
    }

    // writing the HTML file into the project output folder
    await writeFile(finalOutputFile, html);
  }

  // copy the components and assets folder into the output folder
  await cp(tmpComponentsDir, outputComponentsDir, { recursive: true });
  await cp(inputAssetsDir, outputAssetsDir, { recursive: true });

  // run any "post" plugins
  for (const plugin of config.plugins || []) {
    if (plugin.phase === "post") {
      if (debug) {
        console.log(`Running post-plugin: ${plugin.name}`);
      }
      await (plugin.fn as PluginFnPrePost)(config);
    }
  }

  // remove the temporary folder only after a successful build
  if (!debug) {
    rmdirSync(config.tmp, { recursive: true });
  }

  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000; // Convert to seconds
  console.log(`Build completed in ${totalTime.toFixed(2)} seconds.`);
};

/**
 * A simple static file server to serve the generated static site from the output folder.
 * Also watches the input, components and assets folders for changes and rebuilds the site on-the-fly.
 * @param projectDir The root directory of the project to build
 */
export const serve = async ({ projectDir, debug = false }: BuildOptions) => {
  // TODO: Implement serve mode
  const config = (await readConfig(projectDir, debug)) as SsgConfig;

  // TODO: reuse code for path construction
  const outputDir = join(projectDir, config.output);
  const pagesDir = join(projectDir, config.pages);
  const componentsDir = join(projectDir, config.components);
  const assetsDir = join(projectDir, config.assets);

  // initial build
  await build({ projectDir, debug });

  // Set up Express server
  const app = express();
  const port = 3000;

  app.use(serveStatic(outputDir));
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  // Lock to prevent concurrent builds, but schedule the last one
  let isBuilding = false;
  let pendingBuild = false;

  const triggerBuild = async () => {
    if (isBuilding) {
      pendingBuild = true;
      if (debug) {
        console.log("Build scheduled after current one completes");
      }
      return;
    }
    isBuilding = true;
    try {
      await build({ projectDir, debug });
    } finally {
      isBuilding = false;
      if (pendingBuild) {
        pendingBuild = false;
        if (debug) {
          console.log("Running pending build");
        }
        await triggerBuild(); // Recurse to handle the pending build
      }
    }
  };

  // Set up file watcher
  const watcher = chokidar.watch([pagesDir, componentsDir, assetsDir], {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Ignore initial add events
  });

  watcher.on("change", async (path) => {
    if (debug) {
      console.log(`File changed: ${path}`);
    }
    await triggerBuild();
  });

  watcher.on("add", async (path) => {
    if (debug) {
      console.log(`File added: ${path}`);
    }
    await triggerBuild();
  });

  watcher.on("unlink", async (path) => {
    if (debug) {
      console.log(`File removed: ${path}`);
    }
    await triggerBuild();
  });
};
