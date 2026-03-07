import type { BuildOptions, SsgConfig, Status } from "./types.js";

import os from "node:os";
import chokidar from "chokidar";
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { readConfig } from "./config.js";
import { build } from "./build.js";
import { registerEndpoints } from "./endpoints.js";
import { join, sep } from "node:path";
import { filePathToRoute } from "./path.js";
import { initializeRpc, discoverRpcFile, handleRpcRequest } from "./rpc.js";

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
  multicore = false,
}: BuildOptions): Promise<Status> => {
  const isWorker =
    !!process.env.__WORKER_PORT || !!process.env.__WORKER_REUSEPORT;
  const workerPort = process.env.__WORKER_PORT
    ? Number(process.env.__WORKER_PORT)
    : 0;

  // Workers receive config via env to avoid re-compiling config.ts with esbuild
  let config: SsgConfig;
  if (isWorker && process.env.__SSG_CONFIG) {
    config = JSON.parse(process.env.__SSG_CONFIG) as SsgConfig;
  } else {
    config = (await readConfig(projectDir, debug)) as SsgConfig;
  }

  // TODO: implement detailed error handing and status tracking (see setup.ts)

  // TODO: reuse code for path construction
  const outputDir = join(projectDir, config.output);
  const pagesDir = join(projectDir, config.pages);
  const componentsDir = join(projectDir, config.components);
  const assetsDir = join(projectDir, config.assets);

  // initial build (and setup) - only on primary / single-process
  if (!isWorker) {
    await build({ projectDir, debug, mode: "serve" });
  }

  const port = 3000;
  const baseWorkerPort = 3001;
  const isLinux = process.platform === "linux";

  // ── Multicore primary: spawn workers + optional TCP LB ──
  if (multicore && !isWorker) {
    const cpuCount =
      typeof (os as any).availableParallelism === "function"
        ? (os as any).availableParallelism()
        : os.cpus().length;

    const serializedConfig = JSON.stringify(config);
    const procs: ReturnType<typeof Bun.spawn>[] = [];
    let shuttingDown = false;
    const MAX_RESTARTS = 5;
    const RESTART_DELAY_MS = 2000;
    const restartCounts: number[] = new Array(cpuCount).fill(0);

    if (isLinux) {
      // ── Linux: all workers bind :3000 with reusePort (kernel LB) ──
      console.log(
        `[multicore] Primary ${process.pid} spawning ${cpuCount} workers on port ${port} (reusePort)`,
      );

      function spawnWorker(i: number) {
        const proc = Bun.spawn(process.argv, {
          env: {
            ...process.env,
            __WORKER_REUSEPORT: "1",
            __SSG_CONFIG: serializedConfig,
          },
          stdout: "inherit",
          stderr: "inherit",
        });
        procs[i] = proc;
        proc.exited.then((code) => {
          if (!shuttingDown) {
            restartCounts[i]++;
            if (restartCounts[i] > MAX_RESTARTS) {
              console.error(
                `[multicore] Worker ${proc.pid} exceeded ${MAX_RESTARTS} restarts, giving up`,
              );
              return;
            }
            console.log(
              `[multicore] Worker ${proc.pid} exited (${code}), restarting in ${RESTART_DELAY_MS}ms (${restartCounts[i]}/${MAX_RESTARTS})`,
            );
            setTimeout(() => spawnWorker(i), RESTART_DELAY_MS);
          }
        });
      }

      for (let i = 0; i < cpuCount; i++) spawnWorker(i);
    } else {
      // ── macOS/Windows: per-worker ports + HTTP+WS reverse proxy LB on :3000 ──
      const backends: { host: string; port: number }[] = [];
      for (let i = 0; i < cpuCount; i++)
        backends.push({ host: "127.0.0.1", port: baseWorkerPort + i });

      console.log(
        `[multicore] Primary ${process.pid} spawning ${cpuCount} workers on ports ${baseWorkerPort}..${baseWorkerPort + cpuCount - 1}`,
      );

      function spawnWorker(i: number) {
        const wp = baseWorkerPort + i;
        const proc = Bun.spawn(process.argv, {
          env: {
            ...process.env,
            __WORKER_PORT: String(wp),
            __SSG_CONFIG: serializedConfig,
          },
          stdout: "inherit",
          stderr: "inherit",
        });
        procs[i] = proc;
        proc.exited.then((code) => {
          if (!shuttingDown) {
            restartCounts[i]++;
            if (restartCounts[i] > MAX_RESTARTS) {
              console.error(
                `[multicore] Worker port ${wp} (pid ${proc.pid}) exceeded ${MAX_RESTARTS} restarts, giving up`,
              );
              return;
            }
            console.log(
              `[multicore] Worker port ${wp} (pid ${proc.pid}) exited (${code}), restarting in ${RESTART_DELAY_MS}ms (${restartCounts[i]}/${MAX_RESTARTS})`,
            );
            setTimeout(() => spawnWorker(i), RESTART_DELAY_MS);
          }
        });
      }

      for (let i = 0; i < cpuCount; i++) spawnWorker(i);

      // Wait until every worker is actually serving HTTP
      async function waitForHttp(
        host: string,
        wport: number,
        timeoutMs = 15_000,
      ) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          try {
            await fetch(`http://${host}:${wport}/`, {
              signal: AbortSignal.timeout(300),
            });
            return;
          } catch {}
          await new Promise((r) => setTimeout(r, 100));
        }
        throw new Error(`Worker ${host}:${wport} did not become ready in time`);
      }

      await Promise.all(backends.map((b) => waitForHttp(b.host, b.port)));

      // ── HTTP + WebSocket reverse proxy LB (uses Bun's stable HTTP stack) ──
      let rr = 0;
      function pick() {
        const b = backends[rr % backends.length];
        rr = (rr + 1) >>> 0;
        return b;
      }

      // Track livereload WS clients at the LB level so primary can send reload
      const lrClients = new Set<any>();

      type WsData = {
        backend: (typeof backends)[0];
        path: string;
        isLiveReload: boolean;
        upstream?: WebSocket;
        queue: (string | Uint8Array)[];
      };

      var lbServer = Bun.serve<WsData>({
        hostname: "0.0.0.0",
        port,
        idleTimeout: 60,

        fetch(req, bunServer) {
          const u = new URL(req.url);

          // WebSocket upgrade (for /livereload etc.)
          if (
            (req.headers.get("upgrade") ?? "").toLowerCase() === "websocket"
          ) {
            const backend = pick();
            const path = u.pathname + u.search;
            const isLiveReload = u.pathname === "/livereload";
            if (
              bunServer.upgrade(req, {
                data: { backend, path, isLiveReload, queue: [] },
              })
            )
              return;
            return new Response("WebSocket upgrade failed", { status: 400 });
          }

          // Normal HTTP reverse proxy
          const backend = pick();
          const upstreamUrl = `http://${backend.host}:${backend.port}${u.pathname}${u.search}`;

          // Avoid `new Request(url, req)` - it causes Bun panic under concurrency
          return fetch(upstreamUrl, {
            method: req.method,
            headers: req.headers,
            body: req.body,
            redirect: "manual",
            // @ts-expect-error Bun extension – pass through without buffering
            duplex: "half",
          });
        },

        websocket: {
          open(ws) {
            if (ws.data.isLiveReload) lrClients.add(ws);
            const { backend, path } = ws.data;
            const upstream = new WebSocket(
              `ws://${backend.host}:${backend.port}${path}`,
            );
            upstream.binaryType = "arraybuffer";
            ws.data.upstream = upstream;

            upstream.onopen = () => {
              for (const m of ws.data.queue) upstream.send(m as any);
              ws.data.queue.length = 0;
            };
            upstream.onmessage = (ev) => {
              const d = ev.data;
              if (typeof d === "string") ws.send(d);
              else ws.send(new Uint8Array(d as ArrayBuffer));
            };
            upstream.onclose = () => {
              try {
                ws.close();
              } catch {}
            };
            upstream.onerror = () => {
              try {
                ws.close();
              } catch {}
            };
          },
          message(ws, msg) {
            const u = ws.data.upstream;
            if (u && u.readyState === WebSocket.OPEN) {
              u.send(msg as any);
            } else {
              ws.data.queue.push(
                typeof msg === "string" ? msg : new Uint8Array(msg),
              );
            }
          },
          close(ws) {
            if (ws.data.isLiveReload) lrClients.delete(ws);
            try {
              ws.data.upstream?.close();
            } catch {}
          },
        },
      });

      console.log(
        `[multicore] HTTP LB ${process.pid} on http://localhost:${port} → ${backends.map((b) => `${b.host}:${b.port}`).join(", ")}`,
      );
    }

    // ── File watching + rebuild in multicore primary ──
    let mcIsBuilding = false;
    let mcPendingBuild: string | null = null;

    const mcTriggerBuild = async (filePath: string) => {
      if (mcIsBuilding) {
        mcPendingBuild = filePath;
        return;
      }
      mcIsBuilding = true;
      try {
        console.log(`[multicore] File changed: ${filePath}`);
        console.time("[multicore] rebuild");
        await build({
          projectDir,
          debug,
          mode: "serve",
          changedFile: filePath,
        });
        console.timeEnd("[multicore] rebuild");

        // Broadcast reload to all livereload WS clients connected through the LB
        if (!isLinux && typeof lrClients !== "undefined") {
          const msg = JSON.stringify({ command: "reload" });
          for (const ws of lrClients) {
            try {
              ws.send(msg);
            } catch {
              lrClients.delete(ws);
            }
          }
        }
        // For Linux (reusePort), we can't track LB WS clients - skip for now
      } catch (error) {
        console.error("[multicore] Rebuild failed:", error);
      } finally {
        mcIsBuilding = false;
        if (mcPendingBuild) {
          const pending = mcPendingBuild;
          mcPendingBuild = null;
          await mcTriggerBuild(pending);
        }
      }
    };

    const mcWatcher = chokidar.watch(projectDir, {
      ignored: (p: string) => {
        const segs = p.split(/[\/\\]/);
        return segs.some(
          (s) =>
            s === "node_modules" ||
            s === "dist" ||
            s === ".ssg-temp" ||
            s === "bun.lock" ||
            (s.startsWith(".") && s.length > 1),
        );
      },
      persistent: true,
      ignoreInitial: true,
    });
    mcWatcher.on("change", (p) => mcTriggerBuild(p));
    mcWatcher.on("add", (p) => mcTriggerBuild(p));
    mcWatcher.on("unlink", (p) => mcTriggerBuild(p));

    function killAllWorkers() {
      for (const proc of procs) {
        try {
          proc.kill(9);
        } catch {}
      }
    }

    const shutdown = () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[multicore] Primary ${process.pid} shutting down...`);
      if (!isLinux && typeof lbServer !== "undefined") {
        try {
          lbServer.stop(true);
        } catch {}
      }
      killAllWorkers();
      setTimeout(() => process.exit(0), 500);
    };
    process.on("exit", killAllWorkers);
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    return {
      code: "OK",
      message: `Multicore server running with ${cpuCount} workers`,
    };
  }

  // Determine listen port
  const useReusePort = !!process.env.__WORKER_REUSEPORT;
  const listenPort = isWorker ? (useReusePort ? port : workerPort) : port;

  // Check if port is available (only in single-process mode)
  if (!isWorker && !multicore) {
    const portAvailable = await isPortAvailable(listenPort);
    if (!portAvailable) {
      console.error(`Port ${listenPort} is already in use. Exiting.`);
      return {
        code: "PORT_IN_USE",
        message: `Port ${listenPort} is already in use. Please stop the process using this port or choose a different port.`,
      };
    }
  }

  // Set up Elysia app - collect connected WebSocket clients for live-reload
  const clients = new Set<any>();
  const app = new Elysia();

  // Register dynamic endpoint routes before static middleware
  console.time("[serve] register-endpoints");
  await registerEndpoints(app, projectDir, config, debug);
  console.timeEnd("[serve] register-endpoints");

  // ── RPC integration ────────────────────────────────────────────────
  let rpcActive = false;
  console.time("[serve] rpc-init");
  try {
    rpcActive = await initializeRpc(projectDir, config, debug);
    if (rpcActive) {
      app.post("/rpc", (ctx) => handleRpcRequest(ctx));
      app.post("/rpc/schema", (ctx) => handleRpcRequest(ctx));
      console.log("RPC routes mounted at /rpc and /rpc/schema");
    }
  } catch (error) {
    if (debug) {
      console.warn("[serve] RPC initialization failed:", error);
    }
  }
  console.timeEnd("[serve] rpc-init");

  // Disable browser caching in dev mode so live-reload always gets fresh files
  app.onBeforeHandle(({ set }) => {
    set.headers["Cache-Control"] =
      "no-store, no-cache, must-revalidate, proxy-revalidate";
    set.headers["Pragma"] = "no-cache";
    set.headers["Expires"] = "0";
  });

  // Live-reload WebSocket endpoint
  app.ws("/livereload", {
    open(ws) {
      clients.add(ws);
    },
    close(ws) {
      clients.delete(ws);
    },
  });

  // Serve static files from the output directory
  app.use(
    staticPlugin({
      assets: outputDir,
      prefix: "/",
      indexHTML: true,
    }),
  );

  // Periodically report heap memory usage
  const memInterval = setInterval(() => {
    const mem = process.memoryUsage();
    const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const rssMB = (mem.rss / 1024 / 1024).toFixed(1);
    const label = isWorker ? `[worker ${process.pid}]` : "[server]";
    //console.log(`${label} heap: ${heapMB} MB | rss: ${rssMB} MB`);
  }, 5000);
  // Don't keep the process alive just for the timer
  memInterval.unref();

  app.listen(
    { port: listenPort, idleTimeout: 60, reusePort: useReusePort },
    () => {
      const label = isWorker ? `[worker ${process.pid}]` : "Server";
      console.log(
        `${label} running at http://localhost:${listenPort} for directory: ${outputDir}`,
      );
    },
  );

  // Workers: exit cleanly on SIGTERM/SIGINT from primary
  if (isWorker) {
    const workerExit = () => process.exit(0);
    process.on("SIGTERM", workerExit);
    process.on("SIGINT", workerExit);
  }

  // File watching and live-reload only in single-process mode (not workers)
  if (!isWorker) {
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
        // Check if rpc.ts changed - re-initialize RPC instead of full rebuild
        const rpcFile = discoverRpcFile(projectDir);
        const isRpcFile = rpcFile && filePath === rpcFile;

        if (isRpcFile) {
          console.time("[serve] rpc-reload");
          try {
            const wasActive = rpcActive;
            rpcActive = await initializeRpc(projectDir, config, debug);
            // If RPC was not previously active but now is, we can't dynamically
            // add routes to a running Elysia instance - log a restart hint instead
            if (!wasActive && rpcActive) {
              console.log(
                "RPC is now active. Please restart the server to mount /rpc routes.",
              );
            }
          } catch (error) {
            console.error("RPC reload failed:", error);
          }
          console.timeEnd("[serve] rpc-reload");
        } else {
          console.time("[serve] rebuild");
          await build({
            projectDir,
            debug,
            mode: "serve",
            changedFile: filePath,
          });
          console.timeEnd("[serve] rebuild");
        }

        // Notify all connected clients to reload.
        const pagesDir = join(projectDir, config.pages);
        const isPageFile =
          filePath.startsWith(pagesDir + "/") ||
          filePath.startsWith(pagesDir + sep);
        const reloadPath = isPageFile
          ? filePathToRoute(filePath, config, projectDir)
          : undefined;

        const message = JSON.stringify({
          command: "reload",
          ...(reloadPath ? { path: reloadPath } : {}),
        });

        for (const ws of clients) {
          try {
            ws.send(message);
          } catch {
            clients.delete(ws);
          }
        }
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

    // Watch the entire project directory, excluding dist, node_modules, and dotfiles
    const watcher = chokidar.watch(projectDir, {
      ignored: (p: string) => {
        const segs = p.split(/[\/\\]/);
        return segs.some(
          (s) =>
            s === "node_modules" ||
            s === "dist" ||
            s === ".ssg-temp" ||
            s === "bun.lock" ||
            (s.startsWith(".") && s.length > 1),
        );
      },
      persistent: true,
      ignoreInitial: true,
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
  } // end if (!isWorker)

  return { code: "OK", message: "Server is running" };
};
