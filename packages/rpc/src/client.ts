import { DSON } from "defuss-dson";
import type { ClientHook, RpcApiClass, RpcApiSchema } from "./types.d.js";
export * from "./types.d.js";

/** Client-side endpoint paths — must stay in sync with server.ts `RPC_PATH`/`RPC_SCHEMA_PATH`. */
const RPC_PATH = "/rpc" as const;
const RPC_SCHEMA_PATH = "/rpc/schema" as const;

export interface RpcClientOptions {
  /** Base URL for the RPC server (e.g. "http://localhost:3210"). Defaults to current origin. */
  baseUrl?: string;
}

/**
 * Fetches the RPC API schema from the server.
 *
 * Uses `POST` because `rpcRoute` mounts with `.all()` (accepts any HTTP method), and some
 * hosting environments strip body content from `GET` requests.
 *
 * @param baseUrl - Optional base URL for the RPC server (e.g. `"http://localhost:3210"`).
 *                  Defaults to `""` (current origin).
 * @returns The parsed `RpcApiSchema` array from the server.
 */
export async function getSchema(baseUrl = "") {
  const response = await fetch(`${baseUrl}${RPC_SCHEMA_PATH}`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.statusText}`);
  }
  return response.json();
}

/** Cached schema — populated on the first `getSchema()` call. Invalidate with `clearSchemaCache()`. */
let schema: RpcApiSchema | null = null;

/**
 * Clears the cached schema, forcing a refetch on the next getRpcClient() call
 */
export function clearSchemaCache() {
  schema = null;
}

const hooks: ClientHook[] = [];

/**
 * Clears all registered client hooks. Useful for test isolation.
 */
export function clearHooks() {
  hooks.length = 0;
  customHeaders = null;
}

/**
 * Adds a hook function that gets called at a specific time BEFORE or AFTER each RPC method invocation.
 * Can reject calls by returning false (only for guards).
 *
 * @param hook - The hook to add
 */
export function addHook(hook: ClientHook) {
  hooks.push(hook);
}

/** Custom headers merged into every RPC fetch request. Set via `setHeaders()`, cleared via `clearHooks()`. */
let customHeaders: HeadersInit | null = null;

/**
 * Set custom headers to include in each RPC request
 * @param headers - Custom headers to include in each RPC request
 */
export function setHeaders(headers: HeadersInit) {
  customHeaders = headers;
}

/**
 * Factory that returns an async RPC caller function for a given namespace and method name.
 *
 * Each returned function, when called with positional arguments, executes the full client-side
 * hook pipeline before and after the network request:
 *
 * 1. **Guard hooks** (`"guard"` phase) — run before the fetch is dispatched.
 *    Any hook returning falsy throws an Error and aborts the call.
 * 2. **Fetch** — POST to `{baseUrl}/rpc` with JSON body `{ className, methodName, args }`.
 * 3. **Response hooks** (`"response"` phase) — run after the raw HTTP Response arrives,
 *    before the body is read. Useful for logging or early rejection based on status.
 * 4. **DSON deserialization** — response text is parsed with `DSON.parse`, which restores
 *    `Date`, `Map`, `Set`, `ArrayBuffer`, `BigInt`, and typed arrays that plain `JSON.parse` drops.
 * 5. **Result hooks** (`"result"` phase) — run after deserialization with the final `data` value.
 *
 * @param namespaceName - The registered namespace (class or module name).
 * @param methodName    - The method or function name on the namespace.
 * @param baseUrl       - Optional base URL prefix (default `""` = current origin).
 * @returns An async function `(...args) => Promise<unknown>` that dispatches the RPC call.
 */
function createRpcMethod(namespaceName: string, methodName: string, baseUrl = "") {
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

    const response = await fetch(`${baseUrl}${RPC_PATH}`, request);

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
      const body = await response.text();
      throw Object.assign(
        new Error(`RPC call failed: ${response.status} ${response.statusText}`),
        { status: response.status, body, namespace: namespaceName, method: methodName },
      );
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
 *
 * @remarks
 * The schema is cached globally after the first fetch. If you need to connect to a different
 * server URL in the same process, call `clearSchemaCache()` before calling `getRpcClient()` again.
 */
export async function getRpcClient<T extends Record<string, unknown>>(options?: RpcClientOptions) {
  const baseUrl = options?.baseUrl ?? "";
  if (schema === null) {
    schema = await getSchema(baseUrl);
  }
  const client = {} as Record<string, unknown>;

  for (const entry of schema!) {
    if (entry.kind === "module") {
      // Module-based: create a proxy object with methods
      const moduleName = entry.moduleName;
      const methodNames = Object.keys(entry.methods);

      const moduleProxy: Record<string, unknown> = {};
      for (const methodName of methodNames) {
        moduleProxy[methodName] = createRpcMethod(moduleName, methodName, baseUrl);
      }

      client[moduleName] = new Proxy(moduleProxy, {
        get: (target, prop) => {
          if (typeof prop === "string" && prop in target) {
            return target[prop];
          }
          // For unknown methods, dynamically create an RPC caller
          if (typeof prop === "string") {
            return createRpcMethod(moduleName, prop, baseUrl);
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
                return createRpcMethod(className, methodName, baseUrl);
              },
            },
          );
        },
      });
    }
  }
  return client as T;
}

/** Alias for {@link getRpcClient} */
export const createRpcClient = getRpcClient;
