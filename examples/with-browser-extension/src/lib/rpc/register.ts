import { DSON } from "defuss-dson";
import type { RpcCallMessage, RpcResponse, RpcSchema } from "./types";

/** Registry of all RPC endpoints in this context */
const registry = new Map<string, Record<string, (...args: any[]) => any>>();

/** Get auto-generated schema for all registered RPCs */
function getSchemas(): RpcSchema[] {
  const schemas: RpcSchema[] = [];
  for (const [name, api] of registry) {
    schemas.push({
      name,
      methods: Object.keys(api).filter((k) => typeof api[k] === "function"),
    });
  }
  return schemas;
}

/** Handle an incoming RPC message, return the response */
async function handleRpcMessage(
  message: RpcCallMessage,
): Promise<RpcResponse> {
  if (message.action === "__rpc_schema") {
    return { success: true, schema: getSchemas() };
  }

  const api = registry.get(message.className);
  if (!api) {
    return { success: false, error: `Unknown RPC class: ${message.className}` };
  }

  const method = api[message.methodName];
  if (typeof method !== "function") {
    return {
      success: false,
      error: `Unknown method: ${message.className}.${message.methodName}`,
    };
  }

  try {
    const args = message.args ? (DSON.parse(message.args) as unknown[]) : [];
    const result = await method(...args);
    return { success: true, result: DSON.stringify(result) };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

let listenerInstalled = false;

/** Install the shared chrome.runtime.onMessage listener (once per context) */
function ensureListener() {
  if (listenerInstalled) return;
  listenerInstalled = true;

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action !== "__rpc" && request.action !== "__rpc_schema") {
      return false; // not for us
    }

    handleRpcMessage(request as RpcCallMessage).then(sendResponse);
    return true; // async response
  });
}

/**
 * Register an RPC endpoint in this context.
 * The api object's own enumerable function properties become callable methods.
 *
 * @example
 * ```ts
 * const WorkerRpc = { dbGet: (key: string) => dbGetValue(key) };
 * registerRpc("WorkerRpc", WorkerRpc);
 * ```
 */
export function registerRpc(
  name: string,
  api: Record<string, (...args: any[]) => any>,
) {
  registry.set(name, api);
  ensureListener();
}
