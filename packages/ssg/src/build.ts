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
import { existsSync, mkdirSync, rmSync } from "node:fs";
import type {
  BuildOptions,
  PluginFnPageDom,
  PluginFnPageHtml,
  PluginFnPageVdom,
  PluginFnPrePost,
  SsgConfig,
  Status,
} from "./types.js";
import { readConfig } from "./config.js";
import { validateProjectDir } from "./validation.js";

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
  changedFile,
}: BuildOptions): Promise<Status> => {
  const projectDirStatus = validateProjectDir(projectDir);
  if (projectDirStatus.code !== "OK") return projectDirStatus;

  // TODO: implement detailed error handing and status tracking (see setup.ts)

  const startTime = performance.now();

  const config = (await readConfig(projectDir, debug)) as SsgConfig;

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
  }

  // ── Determine what to rebuild ──────────────────────────────────────
  // For incremental builds (serve mode with changedFile), figure out if
  // it's a page, component, or asset change so we can skip unneeded work.
  type ChangeKind = "page" | "component" | "asset" | "config" | "full";
  let changeKind: ChangeKind = "full";
  let changedRelative = ""; // path relative to projectDir

  if (changedFile) {
    // Normalise to a path relative to the project directory
    changedRelative = changedFile.startsWith(projectDir)
      ? changedFile.slice(projectDir.length).replace(/^\//, "")
      : changedFile;

    if (changedRelative.startsWith(config.pages + sep) || changedRelative.startsWith(config.pages + "/")) {
      changeKind = "page";
    } else if (changedRelative.startsWith(config.components + sep) || changedRelative.startsWith(config.components + "/")) {
      changeKind = "component";
    } else if (changedRelative.startsWith(config.assets + sep) || changedRelative.startsWith(config.assets + "/")) {
      changeKind = "asset";
    } else if (changedRelative === "config.ts" || changedRelative === "config.js") {
      changeKind = "config"; // treat as full rebuild
    }

    if (debug) {
      console.log(`Incremental build — changeKind: ${changeKind}, file: ${changedRelative}`);
    }
  }

  const isFullBuild = changeKind === "full" || changeKind === "config";
  const tempExists = existsSync(config.tmp);

  // ── Pre plugins (full build only) ─────────────────────────────────
  if (isFullBuild) {
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
  }

  // ── Prepare temp folder ────────────────────────────────────────────
  if (isFullBuild || !tempExists) {
    // Full rebuild: nuke & recreate temp
    if (tempExists) {
      rmSync(config.tmp, { recursive: true });
    }

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
  } else {
    // Incremental: only copy the changed file into temp
    const srcFile = join(projectDir, changedRelative);
    const destFile = join(config.tmp, changedRelative);

    // Ensure parent dir exists
    const destDir = dirname(destFile);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    if (existsSync(srcFile)) {
      await cp(srcFile, destFile);
    }
  }

  // Copy hydration component and runtime into temp components
  // (always needed; fast because they're single files)
  await cp(
    resolve(join(__dirname, "components", "index.mjs")),
    join(tmpComponentsDir, "hydrate.tsx"),
  );
  await cp(
    resolve(join(__dirname, "runtime.mjs")),
    join(tmpComponentsDir, "runtime.ts"),
  );

  // ── esbuild: compile pages ─────────────────────────────────────────
  if (changeKind !== "asset") {
    // For a single-page change, only compile that one MDX file.
    // For component/full, compile all pages (components may be inlined).
    const pageEntryPoints =
      changeKind === "page"
        ? [join(config.tmp, changedRelative)]
        : [join(tmpPagesDir, "**/*.mdx")];

    await esbuild.build({
      entryPoints: pageEntryPoints,
      format: "esm",
      bundle: true,
      sourcemap: true,
      jsxDev: true,
      target: ["esnext"],
      outdir: tmpPagesDir,
      plugins: [
        mdx({
          jsxImportSource: "defuss",
          development: true,
          remarkPlugins: config.remarkPlugins,
          rehypePlugins: config.rehypePlugins,
        }),
      ],
    });
  }

  // ── esbuild: compile components ────────────────────────────────────
  if (isFullBuild || changeKind === "component") {
    await esbuild.build({
      entryPoints: [
        join(tmpComponentsDir, "**/*.tsx"),
        join(tmpComponentsDir, "**/*.ts"),
      ],
      format: "esm",
      bundle: true,
      splitting: true,
      target: ["esnext"],
      outdir: tmpComponentsDir,
    });
  }

  // ── Render pages to HTML ───────────────────────────────────────────
  if (changeKind !== "asset") {
    // Determine which JS output files to render
    let outputFiles: string[];

    if (changeKind === "page") {
      // Only the changed page's compiled JS
      const jsFile = join(config.tmp, changedRelative.replace(/\.mdx$/, ".js"));
      outputFiles = existsSync(jsFile) ? [jsFile] : [];
    } else {
      outputFiles = await glob.async(join(tmpPagesDir, "**/*.js"));
    }

    if (!existsSync(outputProjectDir)) {
      mkdirSync(outputProjectDir, { recursive: true });
    }

    for (const outputFile of outputFiles) {
      const outputHtmlFilePath = outputFile.replace(".js", ".html");
      const relativeOutputHtmlFilePath = outputHtmlFilePath.replace(
        `${tmpPagesDir}${sep}`,
        "",
      );

      if (debug) {
        console.log("Processing output file (JS):", outputFile);
        console.log("Relative output HTML path:", relativeOutputHtmlFilePath);
      }

      // dynamically import the page module (bypass import cache via data URL)
      const code = await readFile(outputFile, "utf-8");
      const encoded = Buffer.from(code).toString("base64");
      const dataUrl = `data:text/javascript;base64,${encoded}`;
      const exports = await import(dataUrl);

      if (debug) {
        console.log("exports", exports);
      }

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
            exports,
          );
        }
      }

      const browserGlobals = getBrowserGlobals();
      const document = getDocument(false, browserGlobals);
      browserGlobals.document = document;

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

      const finalOutputFile = join(
        projectDir,
        config.output,
        relativeOutputHtmlFilePath,
      );

      const finalOutputDir = dirname(finalOutputFile);
      if (!existsSync(finalOutputDir)) {
        mkdirSync(finalOutputDir, { recursive: true });
      }

      await writeFile(finalOutputFile, html);
    }
  }

  // ── Copy outputs ───────────────────────────────────────────────────
  if (isFullBuild || changeKind === "component") {
    await cp(tmpComponentsDir, outputComponentsDir, { recursive: true });
  }

  if (isFullBuild || changeKind === "asset") {
    await cp(inputAssetsDir, outputAssetsDir, { recursive: true });
  }

  // ── Post plugins ───────────────────────────────────────────────────
  // Run post plugins on full build, or when components change (may affect styles).
  // Skip for single-page edits to save time.
  if (isFullBuild || changeKind === "component") {
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
  }

  // remove the temporary folder after a production build (not in serve mode)
  if (mode === "build" && !debug) {
    rmSync(config.tmp, { recursive: true });
  }

  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000;
  const label = isFullBuild ? "Full build" : `Incremental build (${changeKind}: ${changedRelative})`;
  console.log(`${label} completed in ${totalTime.toFixed(2)} seconds.`);

  return { code: "OK", message: "Build completed successfully" };
};
