import type { BuildOptions, SsgConfig, Status } from "./types.js";

import chokidar from "chokidar";
import express from "ultimate-express";
import { readConfig } from "./config.js";
import { build } from "./build.js";
import { registerEndpoints } from "./endpoints.js";
import { join, sep } from "node:path";
import { createRequire } from "node:module";
import { filePathToRoute } from "./path.js";

const require = createRequire(import.meta.url);
const { WebSocketServer } = require("ultimate-ws");

/**
 * Check if a port is available for use by attempting to connect to it
 * @param port The port number to check
 * @returns Promise that resolves to true if port is available, false if something is listening
 */
const isPortAvailable = async (port: number): Promise<boolean> => {
  try {
    // Try to fetch from the port - if successful, something is listening
    await fetch(`http://localhost:${port}`, {
      method: "GET",
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    // If we get any response, the port is in use
    return false;
  } catch (error) {
    // If fetch fails (connection refused, timeout, etc.), port is available
    return true;
  }
};

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
  const app = express({ threads: 0 });
  const port = 3000;

  // Check if port is available
  const portAvailable = await isPortAvailable(port);
  if (!portAvailable) {
    console.error(`Port ${port} is already in use. Exiting.`);
    return {
      code: "PORT_IN_USE",
      message: `Port ${port} is already in use. Please stop the process using this port or choose a different port.`,
    };
  }

  // Register dynamic endpoint routes (compiled .mjs in .endpoints/) before
  // static middleware so they take priority over pre-rendered files.
  console.time("[serve] register-endpoints");
  await registerEndpoints(app, projectDir, config, debug);
  console.timeEnd("[serve] register-endpoints");

  // Disable browser caching in dev mode so live-reload always gets fresh files
  app.use((_req: any, res: any, next: any) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });

  app.use(express.static(outputDir));

  const server = app.listen(port, (listenedPort: number) => {
    console.log(
      `Server running at http://localhost:${listenedPort} for directory: ${outputDir}`,
    );
  });

  // create the /livereload endpoint via ws://
  const liveReloadServer = new WebSocketServer({
    server,
    path: "/livereload",
  });

  // Lock to prevent concurrent builds, but schedule the last one
  let isBuilding = false;
  let pendingBuild: string | null = null;

  const triggerBuild = async (filePath: string) => {
    if (isBuilding) {
      pendingBuild = filePath;
      if (debug) {
        console.log("Build scheduled after current one completes");
      }
      return;
    }
    isBuilding = true;
    try {
      console.time("[serve] rebuild");
      await build({ projectDir, debug, mode: "serve", changedFile: filePath });
      console.timeEnd("[serve] rebuild");

      // Notify all connected clients to reload.
      // Only send a specific path for page changes; component/asset/config
      // changes can affect any page, so omit the path to reload all clients.
      const pagesDir = join(projectDir, config.pages);
      const isPageFile = filePath.startsWith(pagesDir + "/") || filePath.startsWith(pagesDir + sep);
      const reloadPath = isPageFile
        ? filePathToRoute(filePath, config, projectDir)
        : undefined;

      liveReloadServer.clients.forEach((client) => {
        if (client.readyState === 1 /* OPEN */) {
          client.send(
            JSON.stringify({
              command: "reload",
              ...(reloadPath ? { path: reloadPath } : {}),
            }),
          );
        }
      });
    } catch (error) {
      console.error("Build failed. Waiting for code change to fix that...");
    } finally {
      isBuilding = false;
      if (pendingBuild) {
        const pending = pendingBuild;
        pendingBuild = null;
        if (debug) {
          console.log("Running pending build");
        }
        await triggerBuild(pending);
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
    await triggerBuild(path);
  });

  watcher.on("add", async (path) => {
    if (debug) {
      console.log(`File added: ${path}`);
    }
    await triggerBuild(path);
  });

  watcher.on("unlink", async (path) => {
    if (debug) {
      console.log(`File removed: ${path}`);
    }
    await triggerBuild(path);
  });

  return { code: "OK", message: "Server is running" };
};
