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
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
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
import { buildEndpoints } from "./endpoints.js";

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

  console.time("[build] readConfig");
  const config = (await readConfig(projectDir, debug)) as SsgConfig;
  console.timeEnd("[build] readConfig");

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
    console.time("[build] pre-plugins");
    for (const plugin of config.plugins || []) {
      if (
        plugin.phase === "pre" &&
        (plugin.mode === mode || plugin.mode === "both")
      ) {
        console.time(`[build] pre-plugin:${plugin.name}`);
        if (debug) {
          console.log(`Running pre-plugin: ${plugin.name}`);
        }
        await (plugin.fn as PluginFnPrePost)(projectDir, config);
        console.timeEnd(`[build] pre-plugin:${plugin.name}`);
      }
    }
    console.timeEnd("[build] pre-plugins");
  }

  // ── Prepare temp folder ────────────────────────────────────────────
  console.time("[build] prepare-temp");
  if (isFullBuild || !tempExists) {
    // Full rebuild: nuke & recreate temp
    if (tempExists) {
      console.time("[build] prepare-temp:rmSync");
      rmSync(config.tmp, { recursive: true });
      console.timeEnd("[build] prepare-temp:rmSync");
    }

    console.time("[build] prepare-temp:cp");
    await cp(projectDir, config.tmp, {
      recursive: true,
      filter: (src: string) => {
        // Get the path relative to projectDir (strip projectDir + separator)
        const relative = src.startsWith(projectDir)
          ? src.slice(projectDir.length).replace(/^\//, "")
          : src;
        // Skip directories/files that don't belong in the temp build folder
        const firstSegment = relative.split("/")[0];
        if (
          firstSegment === "node_modules" ||
          firstSegment === config.output ||
          firstSegment === ".endpoints" ||
          firstSegment === ".ssg-temp" ||
          firstSegment === ".git" ||
          firstSegment === "assets"
        ) {
          return false;
        }
        return true;
      },
    });
    console.timeEnd("[build] prepare-temp:cp");

    // Symlink node_modules into temp so esbuild can resolve packages
    const srcNodeModules = join(projectDir, "node_modules");
    const tmpNodeModules = join(config.tmp, "node_modules");
    if (existsSync(srcNodeModules) && !existsSync(tmpNodeModules)) {
      symlinkSync(srcNodeModules, tmpNodeModules, "dir");
    }
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
  console.timeEnd("[build] prepare-temp");

  // Copy hydration component and runtime into temp components
  // (always needed; fast because they're single files)
  console.time("[build] copy-hydration");
  await cp(
    resolve(join(__dirname, "components", "index.mjs")),
    join(tmpComponentsDir, "hydrate.tsx"),
  );
  await cp(
    resolve(join(__dirname, "runtime.mjs")),
    join(tmpComponentsDir, "runtime.ts"),
  );
  console.timeEnd("[build] copy-hydration");

  // ── esbuild: compile pages ─────────────────────────────────────────
  let pageBuildResult: esbuild.BuildResult | null = null;
  if (changeKind !== "asset") {
    console.time("[build] esbuild-pages");
    // For a single-page change, only compile that one MDX file.
    // For component/full, compile all pages (components may be inlined).
    const pageEntryPoints =
      changeKind === "page"
        ? [join(config.tmp, changedRelative)]
        : [join(tmpPagesDir, "**/*.mdx")];

    pageBuildResult = await esbuild.build({
      entryPoints: pageEntryPoints,
      format: "esm",
      bundle: true,
      sourcemap: true,
      jsxDev: true,
      target: ["esnext"],
      outdir: tmpPagesDir,
      metafile: true,
      plugins: [
        mdx({
          jsxImportSource: "defuss",
          development: true,
          remarkPlugins: config.remarkPlugins,
          rehypePlugins: config.rehypePlugins,
        }),
      ],
    });
    console.timeEnd("[build] esbuild-pages");
  }

  // ── esbuild: compile components ────────────────────────────────────
  if (isFullBuild || changeKind === "component") {
    console.time("[build] esbuild-components");
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
      allowOverwrite: true,
    });
    console.timeEnd("[build] esbuild-components");
  }

  // ── Render pages to HTML ───────────────────────────────────────────
  if (changeKind !== "asset") {
    console.time("[build] render-pages");
    // Determine which JS output files to render
    let outputFiles: string[];

    if (changeKind === "page") {
      // Only the changed page's compiled JS
      const jsFile = join(config.tmp, changedRelative.replace(/\.mdx$/, ".js"));
      outputFiles = existsSync(jsFile) ? [jsFile] : [];
    } else if (changeKind === "component" && pageBuildResult?.metafile) {
      // Only render pages that actually import the changed component
      const changedBaseName = changedRelative.replace(/\.[^.]+$/, ""); // e.g. "components/button"
      outputFiles = [];

      for (const [outputPath, meta] of Object.entries(pageBuildResult.metafile.outputs)) {
        // Skip sourcemap outputs
        if (outputPath.endsWith(".map")) continue;

        const inputPaths = Object.keys(meta.inputs);
        const dependsOnChanged = inputPaths.some((input) => {
          const inputNorm = input.replace(/\.[^.]+$/, ""); // strip extension
          return inputNorm.endsWith(changedBaseName);
        });

        if (dependsOnChanged) {
          // esbuild metafile output paths are relative to CWD; resolve them
          const resolved = resolve(outputPath);
          if (resolved.endsWith(".js") && existsSync(resolved)) {
            outputFiles.push(resolved);
          }
        }
      }

      if (debug) {
        console.log(`Component change: ${outputFiles.length} page(s) affected out of ${Object.keys(pageBuildResult.metafile.outputs).filter(p => !p.endsWith(".map")).length} total`);
      }

      // Fallback: if metafile analysis found nothing, render all pages
      if (outputFiles.length === 0) {
        outputFiles = await glob.async(join(tmpPagesDir, "**/*.js"));
      }
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

      const pageLabel = relativeOutputHtmlFilePath;

      if (debug) {
        console.log("Processing output file (JS):", outputFile);
        console.log("Relative output HTML path:", relativeOutputHtmlFilePath);
      }

      // dynamically import the page module (bypass import cache via data URL)
      console.time(`[build] page:${pageLabel} import`);
      const code = await readFile(outputFile, "utf-8");
      const encoded = Buffer.from(code).toString("base64");
      const dataUrl = `data:text/javascript;base64,${encoded}`;
      const exports = await import(dataUrl);
      console.timeEnd(`[build] page:${pageLabel} import`);

      if (debug) {
        console.log("exports", exports);
      }

      console.time(`[build] page:${pageLabel} vdom`);
      let vdom = exports.default(exports) as VNode;
      console.timeEnd(`[build] page:${pageLabel} vdom`);

      // run any "page-vdom" plugins
      for (const plugin of config.plugins || []) {
        if (
          plugin.phase === "page-vdom" &&
          (plugin.mode === mode || plugin.mode === "both")
        ) {
          console.time(`[build] page:${pageLabel} plugin:${plugin.name}`);
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
          console.timeEnd(`[build] page:${pageLabel} plugin:${plugin.name}`);
        }
      }

      console.time(`[build] page:${pageLabel} renderSync`);
      const browserGlobals = getBrowserGlobals();
      const document = getDocument(false, browserGlobals);
      browserGlobals.document = document;

      let el = renderSync(vdom, document.documentElement, {
        browserGlobals,
      }) as HTMLElement;
      console.timeEnd(`[build] page:${pageLabel} renderSync`);

      // run any "page-dom" plugins
      for (const plugin of config.plugins || []) {
        if (
          plugin.phase === "page-dom" &&
          (plugin.mode === mode || plugin.mode === "both")
        ) {
          console.time(`[build] page:${pageLabel} dom-plugin:${plugin.name}`);
          if (debug) {
            console.log(`Running page-dom plugin: ${plugin.name}`);
          }
          el = await (plugin.fn as PluginFnPageDom)(
            el,
            relativeOutputHtmlFilePath,
            projectDir,
            config,
          );
          console.timeEnd(`[build] page:${pageLabel} dom-plugin:${plugin.name}`);
        }
      }

      console.time(`[build] page:${pageLabel} renderToString`);
      let html = renderToString(el);
      console.timeEnd(`[build] page:${pageLabel} renderToString`);

      // run any "page-html" plugins
      for (const plugin of config.plugins || []) {
        if (
          plugin.phase === "page-html" &&
          (plugin.mode === mode || plugin.mode === "both")
        ) {
          console.time(`[build] page:${pageLabel} html-plugin:${plugin.name}`);
          if (debug) {
            console.log(`Running page-html plugin: ${plugin.name}`);
          }
          html = await (plugin.fn as PluginFnPageHtml)(
            html,
            relativeOutputHtmlFilePath,
            projectDir,
            config,
          );
          console.timeEnd(`[build] page:${pageLabel} html-plugin:${plugin.name}`);
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

      console.time(`[build] page:${pageLabel} writeFile`);
      await writeFile(finalOutputFile, html);
      console.timeEnd(`[build] page:${pageLabel} writeFile`);
    }
    console.timeEnd("[build] render-pages");
  }

  // ── Build endpoints (.ts/.js files in pages) ───────────────────────
  if (isFullBuild || changeKind === "page") {
    console.time("[build] build-endpoints");
    await buildEndpoints(projectDir, config, debug);
    console.timeEnd("[build] build-endpoints");
  }

  // ── Copy outputs ───────────────────────────────────────────────────
  console.time("[build] copy-outputs");
  if (isFullBuild || changeKind === "component") {
    await cp(tmpComponentsDir, outputComponentsDir, { recursive: true });
  }

  if (isFullBuild || changeKind === "asset") {
    await cp(inputAssetsDir, outputAssetsDir, { recursive: true });
  }
  console.timeEnd("[build] copy-outputs");

  // ── Post plugins ───────────────────────────────────────────────────
  // Run post plugins on full build, or when components change (may affect styles).
  // Skip for single-page edits to save time.
  if (isFullBuild || changeKind === "component") {
    console.time("[build] post-plugins");
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
    console.timeEnd("[build] post-plugins");
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
