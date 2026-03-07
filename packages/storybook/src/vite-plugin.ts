import { createFilter, type PluginOption, type ViteDevServer } from "vite";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { accessSync, existsSync } from "node:fs";
import defuss from "defuss-vite";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import {
  scanStories,
  generateManifestModule,
  generateStoriesModule,
  generateSourcesModule,
} from "./scanner.js";
import { remarkPlugins, rehypePlugins } from "./mdx/plugins.js";
import type { ResolvedStorybookConfig, StoryManifestEntry } from "./types.js";

const VIRTUAL_MANIFEST = "virtual:storybook/manifest";
const VIRTUAL_STORIES = "virtual:storybook/stories";
const VIRTUAL_CONFIG = "virtual:storybook/config";
const VIRTUAL_SOURCES = "virtual:storybook/sources";
const VIRTUAL_PROJECT_CSS = "virtual:storybook/project-css";
const RESOLVED_MANIFEST = "\0" + VIRTUAL_MANIFEST;
const RESOLVED_STORIES = "\0" + VIRTUAL_STORIES;
const RESOLVED_CONFIG = "\0" + VIRTUAL_CONFIG;
const RESOLVED_SOURCES = "\0" + VIRTUAL_SOURCES;
const RESOLVED_PROJECT_CSS = "\0" + VIRTUAL_PROJECT_CSS;

/**
 * Main Vite plugin for defuss-storybook.
 * Composes defuss-vite, tailwind, and MDX plugins, and serves virtual modules
 * for the story manifest and dynamic imports.
 */
export function storybookVitePlugin(
  config: ResolvedStorybookConfig,
): PluginOption[] {
  let entries: StoryManifestEntry[] = [];

  const storyFilter = createFilter(
    config.stories.map((p) => join(config.projectDir, p)),
  );

  const storybookPlugin: PluginOption = {
    name: "vite:defuss-storybook",
    enforce: "pre",

    async buildStart() {
      entries = await scanStories(config);
    },

    configureServer(srv) {
      // Watch for story file additions/removals
      const watchPatterns = config.stories.map((p) =>
        join(config.projectDir, p),
      );
      srv.watcher.add(watchPatterns);

      srv.watcher.on("add", async (file) => {
        if (storyFilter(file)) {
          entries = await scanStories(config);
          invalidateVirtualModules(srv);
        }
      });

      srv.watcher.on("unlink", async (file) => {
        if (storyFilter(file)) {
          entries = await scanStories(config);
          invalidateVirtualModules(srv);
        }
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_MANIFEST) return RESOLVED_MANIFEST;
      if (id === VIRTUAL_STORIES) return RESOLVED_STORIES;
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG;
      if (id === VIRTUAL_SOURCES) return RESOLVED_SOURCES;
      if (id === VIRTUAL_PROJECT_CSS) return RESOLVED_PROJECT_CSS;
      return null;
    },

    load(id) {
      if (id === RESOLVED_MANIFEST) {
        return generateManifestModule(entries);
      }
      if (id === RESOLVED_STORIES) {
        return generateStoriesModule(entries);
      }
      if (id === RESOLVED_CONFIG) {
        return `export default ${JSON.stringify({
          title: config.title,
          projectDir: config.projectDir,
          themes: config.themes,
        })};`;
      }
      if (id === RESOLVED_SOURCES) {
        return generateSourcesModule(entries);
      }
      if (id === RESOLVED_PROJECT_CSS) {
        // Import the project's CSS files so components render styled
        if (config.css.length > 0) {
          return config.css
            .map((cssPath) => `import "${resolve(config.projectDir, cssPath)}";`)
            .join("\n");
        }
        // Auto-detect: look for common CSS entry files in the project
        const commonEntries = [
          "src/css/index.css",
          "src/styles/index.css",
          "src/index.css",
          "src/global.css",
          "src/app.css",
        ];
        for (const entry of commonEntries) {
          const fullPath = resolve(config.projectDir, entry);
          try {
            accessSync(fullPath);
            return `import "${fullPath}";`;
          } catch {}
        }
        return "// No project CSS found";
      }
      return null;
    },

    handleHotUpdate({ file, server: srv }) {
      if (storyFilter(file)) {
        // Invalidate virtual modules so they re-load with fresh data
        invalidateVirtualModules(srv);
        // Also send full reload for the story file itself
        srv.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };

  // Compose all necessary plugins
  return [
    storybookPlugin,
    defuss() as PluginOption,
    tailwindcss() as PluginOption,
    mdx({
      jsxImportSource: "defuss",
      remarkPlugins: remarkPlugins as any,
      rehypePlugins: rehypePlugins as any,
    }) as PluginOption,
  ];
}

function invalidateVirtualModules(server: ViteDevServer) {
  const manifestMod = server.moduleGraph.getModuleById(RESOLVED_MANIFEST);
  if (manifestMod) server.moduleGraph.invalidateModule(manifestMod);

  const storiesMod = server.moduleGraph.getModuleById(RESOLVED_STORIES);
  if (storiesMod) server.moduleGraph.invalidateModule(storiesMod);

  const sourcesMod = server.moduleGraph.getModuleById(RESOLVED_SOURCES);
  if (sourcesMod) server.moduleGraph.invalidateModule(sourcesMod);
}

/**
 * Get the path to the shell app directory.
 * In the built package, it's at `<pkg>/app/`.
 * In development, it's at `<pkg>/src/app/`.
 */
export function getAppDir(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // In dist: packages/storybook/dist/vite-plugin.mjs → ../app
  // In src:  packages/storybook/src/vite-plugin.ts  → ./app
  const appFromDist = resolve(thisDir, "..", "app");
  const appFromSrc = resolve(thisDir, "app");

  // Prefer the built app directory, fall back to src
  if (existsSync(join(appFromDist, "index.html"))) return appFromDist;

  return appFromSrc;
}
