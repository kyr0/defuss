import type { AstroIntegration } from "astro";
import { defussRpc as defussRpcVitePlugin } from "./vite-plugin.js";
import { setRpcConfig, type RpcPluginOptions } from "./rpc-state.js";

/**
 * Astro integration that wraps the defuss-rpc Vite plugin and injects
 * middleware to populate `Astro.locals.rpcEndpoint`.
 *
 * @example
 * ```ts
 * // astro.config.ts
 * import { defineConfig } from "astro/config";
 * import defuss from "defuss-astro";
 * import { defussRpc } from "defuss-rpc/astro.js";
 * import { MyApi } from "./src/api/my-api.ts";
 *
 * export default defineConfig({
 *   integrations: [
 *     defuss(),
 *     defussRpc({ api: { MyApi } }),
 *   ],
 * });
 * ```
 *
 * Then in your `env.d.ts`:
 * ```ts
 * declare namespace App {
 *   interface Locals {
 *     rpcEndpoint: string;
 *   }
 * }
 * ```
 *
 * Access in any `.astro` page or API route:
 * ```ts
 * const endpoint = Astro.locals.rpcEndpoint;
 * ```
 */
export function defussRpc(options: RpcPluginOptions): AstroIntegration {
  return {
    name: "defuss-rpc",
    hooks: {
      "astro:config:setup": ({ updateConfig, addMiddleware }) => {
        // Save config so middleware can lazy-start in production
        setRpcConfig(options);

        // Add the Vite plugin (handles dev server startup + virtual module)
        updateConfig({
          vite: {
            plugins: [defussRpcVitePlugin(options) as any],
          },
        });

        // Inject middleware that populates Astro.locals.rpcEndpoint
        addMiddleware({
          order: "pre",
          entrypoint: "defuss-rpc/astro-middleware.js",
        });
      },
    },
  };
}

/** @deprecated Use `defussRpc` instead. */
export const defussRpcIntegration = defussRpc;

export type { RpcPluginOptions };
