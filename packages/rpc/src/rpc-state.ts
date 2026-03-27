import type { ExpressRpcServer } from "./express-server.js";
import type { ApiNamespace } from "./types.d.js";

export interface RpcPluginOptions {
  /** Map of namespace name → class constructor or plain-object module to expose over RPC. */
  api: ApiNamespace;
  /**
   * Port the RPC server should listen on.
   *
   * - `0` (default) — let the OS assign a random available port.
   * - Any positive integer — bind to that specific port.
   */
  port?: number;
  /**
   * Host/IP the RPC server should bind to.
   *
   * - `"localhost"` (default) — only reachable from the local machine.
   * - `"0.0.0.0"` — listen on all network interfaces (useful for Docker / LAN access).
   * - Any valid IPv4/IPv6 address.
   */
  host?: string;
  /**
   * URL prefix prepended to every RPC endpoint (`/rpc`, `/rpc/schema`, `/health`).
   *
   * @example `"/api/v1"` → endpoints become `/api/v1/rpc`, `/api/v1/health`, etc.
   * @default `""`
   */
  basePath?: string;
  /**
   * Maximum request body size accepted by the JSON/text body parser.
   *
   * This limit applies to **all** RPC call payloads (including binary data
   * encoded via DSON).  If a request exceeds this size the server responds
   * with a 413 "Payload Too Large" error.
   *
   * For large file transfers, use the dedicated upload/download API instead:
   * ```ts
   * // client
   * import { upload } from "defuss-rpc/client";
   * // server
   * import { addUploadHandler } from "defuss-rpc/server";
   * ```
   *
   * Uses Express `limit` syntax (e.g. `"1mb"`, `"10mb"`, `"1gb"`).
   * @default `"1mb"`
   */
  jsonSizeLimit?: string;
  /**
   * Value for the `Access-Control-Allow-Origin` response header.
   *
   * - Pass a single origin string: `"https://app.example.com"`
   * - Pass an array to allow multiple origins (joined with commas).
   * @default `"*"`
   */
  corsOrigin?: string | string[];
  /**
   * Glob patterns for API source files to watch during development.
   *
   * When a matching file changes, the RPC namespace is re-registered and the
   * client receives a full HMR reload.
   * @default `["src\/**\/*.ts"]`
   */
  watch?: string | string[];
  /**
   * Hardcoded RPC base URL emitted into the virtual module during production builds.
   *
   * When set, the `virtual:defuss-rpc` module exports this value as `rpcBaseUrl`
   * instead of relying on `import.meta.env.VITE_DEFUSS_RPC_URL`.
   */
  productionUrl?: string;
}

export let rpcConfig: RpcPluginOptions | null = null;
export let rpcBaseUrl = "";
export let rpcServer: ExpressRpcServer | null = null;

export function setRpcConfig(config: RpcPluginOptions): void {
  rpcConfig = config;
}

export function getRpcConfig(): RpcPluginOptions | null {
  return rpcConfig;
}

export function setRpcBaseUrl(url: string): void {
  rpcBaseUrl = url;
}

export function getRpcBaseUrl(): string {
  return rpcBaseUrl;
}

export function setRpcServer(server: ExpressRpcServer): void {
  rpcServer = server;
}

export function getRpcServer(): ExpressRpcServer | null {
  return rpcServer;
}
