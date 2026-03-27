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
   *
   * When omitted and `protocol` is `"https"`, defaults to `443`; for `"http"` defaults to `0`.
   */
  port?: number;
  /**
   * Protocol used to construct the RPC endpoint URL.
   *
   * @default `"http"`
   */
  protocol?: "http" | "https";
  /**
   * Host/IP the RPC server should bind to.
   *
   * - `"localhost"` (default) — only reachable from the local machine.
   * - `"0.0.0.0"` — listen on all network interfaces (useful for Docker / LAN access).
   * - Any valid IPv4/IPv6 address.
   */
  host?: string;
  /**
   * URL path prefix prepended to every RPC route (`/rpc`, `/rpc/schema`, `/health`).
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
   * Full RPC endpoint URL the **client** should use to reach the RPC server.
   *
   * When set, this value is emitted as `rpcEndpoint` in the `virtual:defuss-rpc`
   * module and used by the client for all RPC calls.
   *
   * When omitted, the endpoint is automatically constructed from
   * `protocol`, `host`, `port`, and `basePath`.
   *
   * @example `"https://api.example.com/rpc"`
   */
  endpoint?: string;

  /**
   * @deprecated Use `endpoint` instead. Will be removed in a future version.
   */
  productionUrl?: string;
}

/**
 * Constructs the full RPC endpoint URL from individual option parts.
 *
 * If `endpoint` is set explicitly, it is returned as-is.
 * Otherwise, the URL is built from `protocol`, `host`, `port`, and `basePath`.
 */
export function buildEndpoint(options: Pick<RpcPluginOptions, "endpoint" | "productionUrl" | "protocol" | "host" | "port" | "basePath">, resolvedPort?: number): string {
  // Explicit endpoint takes priority, then deprecated productionUrl
  if (options.endpoint) return options.endpoint;
  if (options.productionUrl) return options.productionUrl;

  const protocol = options.protocol ?? "http";
  const host = options.host ?? "localhost";
  const port = resolvedPort ?? options.port ?? 0;
  const basePath = options.basePath ?? "";

  // Omit port from URL when it matches the protocol default
  const isDefaultPort = (protocol === "http" && port === 80) || (protocol === "https" && port === 443);
  const portSuffix = isDefaultPort ? "" : `:${port}`;

  return `${protocol}://${host}${portSuffix}${basePath}`;
}

export let rpcConfig: RpcPluginOptions | null = null;
export let rpcEndpoint = "";
export let rpcServer: ExpressRpcServer | null = null;

export function setRpcConfig(config: RpcPluginOptions): void {
  rpcConfig = config;
}

export function getRpcConfig(): RpcPluginOptions | null {
  return rpcConfig;
}

export function setRpcEndpoint(url: string): void {
  rpcEndpoint = url;
}

export function getRpcEndpoint(): string {
  return rpcEndpoint;
}

/** @deprecated Use `getRpcEndpoint()` instead. */
export const getRpcBaseUrl = getRpcEndpoint;
/** @deprecated Use `setRpcEndpoint()` instead. */
export const setRpcBaseUrl = setRpcEndpoint;

export function setRpcServer(server: ExpressRpcServer): void {
  rpcServer = server;
}

export function getRpcServer(): ExpressRpcServer | null {
  return rpcServer;
}
