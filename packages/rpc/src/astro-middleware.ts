import { defineMiddleware } from "astro/middleware";
import {
  getRpcBaseUrl,
  getRpcConfig,
  getRpcServer,
  setRpcBaseUrl,
  setRpcServer,
} from "./rpc-state.js";
import { createRpcServer } from "./server.js";
import { ExpressRpcServer } from "./express-server.js";

declare global {
  namespace App {
    interface Locals {
      rpcEndpoint: string;
    }
  }
}

/**
 * Astro middleware that populates `context.locals.rpcEndpoint` with the
 * base URL of the running RPC server.
 *
 * - **Dev mode**: The Vite plugin has already started the server, so this
 *   just reads the URL from shared state.
 * - **Production**: On the first request, lazy-starts the `ExpressRpcServer`
 *   using the config saved during `astro:config:setup`, then caches the URL
 *   for all subsequent requests.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  let url = getRpcBaseUrl();

  // Production lazy-start: if no server is running yet, start one
  if (!url && !getRpcServer()) {
    const config = getRpcConfig();
    if (config) {
      // Register the RPC namespace
      createRpcServer(config.api);

      // Start the Express RPC server
      const server = new ExpressRpcServer({
        port: config.port,
        basePath: config.basePath,
        jsonSizeLimit: config.jsonSizeLimit,
        corsOrigin: config.corsOrigin,
      });

      const result = await server.start();
      url = result.url;
      setRpcBaseUrl(url);
      setRpcServer(server);
    }
  }

  context.locals.rpcEndpoint = url;
  return next();
});
