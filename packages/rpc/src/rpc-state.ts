import type { ExpressRpcServer } from "./express-server.js";
import type { ApiNamespace } from "./types.d.js";

export interface RpcPluginOptions {
  api: ApiNamespace;
  port?: number;
  basePath?: string;
  jsonSizeLimit?: string;
  corsOrigin?: string | string[];
  watch?: string | string[];
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
