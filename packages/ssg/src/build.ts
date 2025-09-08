import mdx from "@mdx-js/esbuild";
import esbuild from "esbuild";
import glob from "fast-glob";

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
import { existsSync, mkdirSync, rmdirSync } from "node:fs";
import type {
  BuildOptions,
  PluginFnPageDom,
  PluginFnPageHtml,
  PluginFnPageVdom,
  PluginFnPrePost,
  SsgConfig,
} from "./types.js";
import { readConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * A single, complete build process for a static site project.
 * @param projectDir The root directory of the project to build
 */
export const build = async ({
  projectDir,
  debug = false,
  mode = "build",
}: BuildOptions) => {
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
    if (
      plugin.phase === "pre" &&
      (plugin.mode === mode || plugin.mode === "both")
    ) {
      if (debug) {
        console.log(`Running pre-plugin: ${plugin.name}`);
      }
      await (plugin.fn as PluginFnPrePost)(projectDir, config);
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
      if (
        plugin.phase === "page-vdom" &&
        (plugin.mode === mode || plugin.mode === "both")
      ) {
        if (debug) {
          console.log(`Running page-vdom plugin: ${plugin.name}`);
        }
        vdom = await (plugin.fn as PluginFnPageVdom)(
          vdom,
          relativeOutputHtmlFilePath,
          projectDir,
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
      if (
        plugin.phase === "page-dom" &&
        (plugin.mode === mode || plugin.mode === "both")
      ) {
        if (debug) {
          console.log(`Running page-dom plugin: ${plugin.name}`);
        }
        el = await (plugin.fn as PluginFnPageDom)(
          el,
          relativeOutputHtmlFilePath,
          projectDir,
          config,
        );
      }
    }

    // serializing the DOM sub-tree into HTML
    let html = renderToString(el);

    // run any "page-html" plugins
    for (const plugin of config.plugins || []) {
      if (
        plugin.phase === "page-html" &&
        (plugin.mode === mode || plugin.mode === "both")
      ) {
        if (debug) {
          console.log(`Running page-html plugin: ${plugin.name}`);
        }
        html = await (plugin.fn as PluginFnPageHtml)(
          html,
          relativeOutputHtmlFilePath,
          projectDir,
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
    if (
      plugin.phase === "post" &&
      (plugin.mode === mode || plugin.mode === "both")
    ) {
      if (debug) {
        console.log(`Running post-plugin: ${plugin.name}`);
      }
      await (plugin.fn as PluginFnPrePost)(projectDir, config);
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
