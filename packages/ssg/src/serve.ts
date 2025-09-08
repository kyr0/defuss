import type { BuildOptions, SsgConfig, Status } from "./types.js";

import chokidar from "chokidar";
import express from "express";
import serveStatic from "serve-static";
import { readConfig } from "./config.js";
import { build } from "./build.js";
import { join } from "node:path";

/**
 * A simple static file server to serve the generated static site from the output folder.
 * Also watches the input, components and assets folders for changes and rebuilds the site on-the-fly.
 * @param projectDir The root directory of the project to build
 */
export const serve = async ({
  projectDir,
  debug = false,
}: BuildOptions): Promise<Status> => {
  const config = (await readConfig(projectDir, debug)) as SsgConfig;

  // TODO: implement detailed error handing and status tracking (see setup.ts)

  // TODO: reuse code for path construction
  const outputDir = join(projectDir, config.output);
  const pagesDir = join(projectDir, config.pages);
  const componentsDir = join(projectDir, config.components);
  const assetsDir = join(projectDir, config.assets);

  // initial build (and setup)
  await build({ projectDir, debug, mode: "serve" });

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
      await build({ projectDir, debug, mode: "serve" });
    } catch (error) {
      console.error("Build failed. Waiting for code change to fix that...");
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

  return { code: "OK", message: "Server is running" };
};
