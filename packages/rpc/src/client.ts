import { DSON } from "defuss-dson";
import type { ClientHook, RpcApiClass, RpcApiSchema, RpcSchemaEntry } from "./types.d.js";

export * from "./types.d.js";

/**
 * Fetches the RPC API schema from the server.
 * @returns The RPC API schema from the server
 */
export async function getSchema() {
  const response = await fetch("/rpc/schema", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.statusText}`);
  }
  return response.json();
}

let schema: RpcApiSchema | null = null;

/**
 * Clears the cached schema, forcing a refetch on the next getRpcClient() call
 */
export function clearSchemaCache() {
  schema = null;
}

const hooks: ClientHook[] = [];

/**
 * Adds a hook function that gets called at a specific time BEFORE or AFTER each RPC method invocation.
 * Can reject calls by returning false (only for guards).
 *
 * @param hook - The hook to add
 */
export function addHook(hook: ClientHook) {
  hooks.push(hook);
}

let customHeaders: HeadersInit | null = null;

/**
 * Set custom headers to include in each RPC request
 * @param headers - Custom headers to include in each RPC request
 */
export function setHeaders(headers: HeadersInit) {
  customHeaders = headers;
}

/**
 * Create an async RPC caller function for a given namespace and method.
 */
function createRpcMethod(namespaceName: string, methodName: string) {
  return async (...args: unknown[]) => {
    const request: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(customHeaders || {}),
      },
      body: JSON.stringify({
        className: namespaceName,
        methodName,
        args,
      }),
    };

    // Call guards
    for (const guardHook of hooks.filter((h) => h.phase === "guard")) {
      const allowed = await guardHook.fn(
        namespaceName,
        methodName,
        args,
        request,
      );

      if (!allowed) {
        throw new Error(
          `RPC call to ${namespaceName}.${methodName} was blocked by a guard`,
        );
      }
    }

    const response = await fetch("/rpc", request);

    // Call response hooks
    for (const responseHook of hooks.filter(
      (h: ClientHook) => h.phase === "response",
    )) {
      await responseHook.fn(
        namespaceName,
        methodName,
        args,
        request,
        response,
      );
    }

    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.statusText}`);
    }
    const data = DSON.parse(await response.text());

    // Call result hooks
    for (const resultHook of hooks.filter(
      (h: ClientHook) => h.phase === "result",
    )) {
      await resultHook.fn(
        namespaceName,
        methodName,
        args,
        request,
        response,
        data,
      );
    }

    return data;
  };
}

/**
 * Get the RPC client proxy object.
 *
 * Supports both class-based and module-based (plain object) RPC namespaces.
 *
 * - Class-based: `const user = await new rpc.UserApi().getUser("1")`
 * - Module-based: `const sum = await rpc.mathUtils.add(1, 2)`
 *
 * @typeParam T - The type of the RPC API namespace
 * @returns A proxy object that implements the RPC API
 */
export async function getRpcClient<T extends Record<string, unknown>>() {
  if (schema === null) {
    schema = await getSchema();
  }
  const client = {} as Record<string, unknown>;

  for (const entry of schema!) {
    if (entry.kind === "module") {
      // Module-based: create a proxy object with methods
      const moduleName = entry.moduleName;
      const methodNames = Object.keys(entry.methods);

      const moduleProxy: Record<string, unknown> = {};
      for (const methodName of methodNames) {
        moduleProxy[methodName] = createRpcMethod(moduleName, methodName);
      }

      client[moduleName] = new Proxy(moduleProxy, {
        get: (target, prop) => {
          if (typeof prop === "string" && prop in target) {
            return target[prop];
          }
          // For unknown methods, dynamically create an RPC caller
          if (typeof prop === "string") {
            return createRpcMethod(moduleName, prop);
          }
          return undefined;
        },
      });
    } else {
      // Class-based: create a constructor proxy (existing behavior)
      const className = entry.className;
      // biome-ignore lint/complexity/useArrowFunction: constructors are not arrow functions
      const Constructor = function (..._args: unknown[]) {
        return {} as unknown;
      } as unknown as RpcApiClass;

      client[className] = new Proxy(Constructor, {
        construct: (_ctorTarget, _ctorArgs) => {
          return new Proxy(
            {},
            {
              get: (_target, methodName) => {
                if (typeof methodName !== "string") return undefined;
                return createRpcMethod(className, methodName);
              },
            },
          );
        },
      });
    }
  }
  return client as T;
}
