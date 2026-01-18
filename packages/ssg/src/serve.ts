import type { BuildOptions, SsgConfig, Status } from "./types.js";

import chokidar from "chokidar";
import express from "express";
import serveStatic from "serve-static";
import { readConfig } from "./config.js";
import { build } from "./build.js";
import { join } from "node:path";
import * as WebSocket from "ws";
import { filePathToRoute } from "./path.js";

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
  const app = express();
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

  app.use(serveStatic(outputDir));

  const server = app.listen(port, (error) => {
    if (error) {
      console.error(`Error starting server: ${error.message}`);
      return;
    }
    console.log(
      `Server running at http://localhost:${port} for directory: ${outputDir}`,
    );
  });

  // create the /livereload endpoint via ws://
  const liveReloadServer = new WebSocket.WebSocketServer({
    server,
    path: "/livereload",
  });

  // Lock to prevent concurrent builds, but schedule the last one
  let isBuilding = false;
  let pendingBuild = false;

  const triggerBuild = async (filePath: string) => {
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

      // Notify all connected clients to reload
      liveReloadServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              command: "reload",
              path: filePathToRoute(filePath, config, projectDir),
            }),
          );
        }
      });
    } catch (error) {
      console.error("Build failed. Waiting for code change to fix that...");
    } finally {
      isBuilding = false;
      if (pendingBuild) {
        pendingBuild = false;
        if (debug) {
          console.log("Running pending build");
        }
        await triggerBuild(filePath); // Recurse to handle the pending build
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
