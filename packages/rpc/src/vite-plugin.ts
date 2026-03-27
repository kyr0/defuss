import type { PluginOption, ViteDevServer } from "vite";
import { createFilter } from "vite";
import { createRpcServer, clearRpcServer } from "./server.js";
import { ExpressRpcServer } from "./express-server.js";
import {
  setRpcEndpoint,
  setRpcServer,
  getRpcEndpoint,
  setRpcConfig,
  type RpcPluginOptions,
} from "./rpc-state.js";

const VIRTUAL_MODULE_ID = "virtual:defuss-rpc";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

/**
 * Vite plugin that starts an `ExpressRpcServer` alongside Vite's dev server,
 * exposes the RPC base URL to client code via a virtual module, and watches
 * API source files for hot-reload of the RPC namespace.
 *
 * @example
 * ```ts
 * import { defineConfig } from "vite";
 * import defuss from "defuss-vite";
 * import { defussRpc } from "defuss-rpc/vite-plugin.js";
 * import { MyApi } from "./src/api/my-api.ts";
 *
 * export default defineConfig({
 *   plugins: [
 *     defuss(),
 *     defussRpc({ api: { MyApi } }),
 *   ],
 * });
 * ```
 *
 * Client code:
 * ```ts
 * import { rpcEndpoint } from "virtual:defuss-rpc";
 * import { getRpcClient } from "defuss-rpc/client.js";
 *
 * const client = getRpcClient({ baseUrl: rpcEndpoint });
 * ```
 */
export function defussRpc(options: RpcPluginOptions): PluginOption {
  const watchPatterns = options.watch
    ? Array.isArray(options.watch)
      ? options.watch
      : [options.watch]
    : ["src/**/*.ts"];

  const watchFilter = createFilter(watchPatterns);
  let isBuild = false;

  // Store config for potential production use (Astro middleware lazy-start)
  setRpcConfig(options);

  const plugin: PluginOption = {
    name: "vite:defuss-rpc",
    enforce: "pre",

    config(_config, { command }) {
      isBuild = command === "build";
    },

    async configureServer(viteServer: ViteDevServer) {
      // Register the RPC namespace
      createRpcServer(options.api);

      // Start the Express RPC server
      const server = new ExpressRpcServer({
        port: options.port,
        protocol: options.protocol,
        host: options.host,
        basePath: options.basePath,
        jsonSizeLimit: options.jsonSizeLimit,
        corsOrigin: options.corsOrigin,
      });

      const { url } = await server.start();

      // If an explicit endpoint was provided, use it; otherwise derive from the running server
      const endpoint = options.endpoint ?? options.productionUrl ?? url;
      setRpcEndpoint(endpoint);
      setRpcServer(server);

      // Stop the RPC server when Vite shuts down
      viteServer.httpServer?.on("close", () => {
        server.stop();
      });

      // Watch API source files for changes
      viteServer.watcher.add(watchPatterns);

      viteServer.watcher.on("change", (file) => {
        if (watchFilter(file)) {
          console.log(
            `[defuss-rpc] API file changed: ${file}, re-registering namespace...`,
          );
          // Clear and re-register the RPC namespace
          // The Express server keeps running — it delegates to rpcRoute which reads from the live registry
          clearRpcServer();
          createRpcServer(options.api);
        }
      });
    },

    handleHotUpdate({ file, server }) {
      if (watchFilter(file)) {
        // Invalidate the virtual module so the client gets fresh data
        invalidateVirtualModule(server);
        // Full reload so the client re-fetches the schema
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      return null;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        // Auto-register the endpoint so getRpcClient() works without options
        const autoRegister = [
          `import { _setDefaultEndpoint } from "defuss-rpc/client.js";`,
          `_setDefaultEndpoint(rpcEndpoint);`,
        ];

        if (isBuild) {
          // Build mode: use explicit endpoint, deprecated productionUrl, or env variable fallback
          const explicitEndpoint = options.endpoint ?? options.productionUrl;
          if (explicitEndpoint) {
            return [
              `export const rpcEndpoint = ${JSON.stringify(explicitEndpoint)};`,
              `/** @deprecated Use rpcEndpoint instead. */`,
              `export const rpcBaseUrl = rpcEndpoint;`,
              ...autoRegister,
            ].join("\n");
          }
          // Fall back to an env variable that can be set at runtime
          return [
            `export const rpcEndpoint = import.meta.env.VITE_DEFUSS_RPC_URL || "";`,
            `/** @deprecated Use rpcEndpoint instead. */`,
            `export const rpcBaseUrl = rpcEndpoint;`,
            ...autoRegister,
          ].join("\n");
        }
        // Dev mode: use the actual running server URL
        const url = getRpcEndpoint();
        return [
          `export const rpcEndpoint = ${JSON.stringify(url)};`,
          `/** @deprecated Use rpcEndpoint instead. */`,
          `export const rpcBaseUrl = rpcEndpoint;`,
          ...autoRegister,
        ].join("\n");
      }
      return null;
    },
  };

  return plugin;
}

function invalidateVirtualModule(server: ViteDevServer) {
  const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
  if (mod) {
    server.moduleGraph.invalidateModule(mod);
  }
}

export type { RpcPluginOptions };
