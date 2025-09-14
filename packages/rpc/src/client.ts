import { DSON } from "defuss-dson";
import type { ClientHook, RpcApiClass, RpcApiSchema } from "./types.d.js";

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
 * Adds an hook function that gets called at a specific time BEFORE or AFTER each RPC method invocation.
 * Can reject calls by returning false (only for guards).
 *
 * @param hook - The hook to add
 * @returns true to allow the call, false to reject it
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
 * Get the RPC client proxy object
 * @typeParam T - The type of the RPC API
 * @returns A proxy object that implements the RPC API
 */
export async function getRpcClient<T extends Record<string, RpcApiClass>>() {
  if (schema === null) {
    schema = await getSchema();
  }
  const client = {} as Record<string, RpcApiClass>;

  for (const apiClass of schema!) {
    const className = apiClass.className;
    // Create a constructor function that matches RpcApiClass type
    // biome-ignore lint/complexity/useArrowFunction: constructors are not arrow functions
    const Constructor = function (...args: unknown[]) {
      // This constructor function will be intercepted by the Proxy
      return {} as unknown;
    } as unknown as RpcApiClass;

    client[className] = new Proxy(Constructor, {
      construct: (_ctorTarget, _ctorArgs) => {
        return new Proxy(
          {},
          {
            get: (_target, methodName) => {
              return async (...args: unknown[]) => {
                const request: RequestInit = {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(customHeaders || {}),
                  },
                  body: JSON.stringify({
                    className,
                    methodName,
                    args,
                  }),
                };

                // Call guards
                for (const guardHook of hooks.filter(
                  (h) => h.phase === "guard",
                )) {
                  const allowed = await guardHook.fn(
                    className,
                    methodName.toString(),
                    args,
                    request,
                  );

                  if (!allowed) {
                    throw new Error(
                      `RPC call to ${className}.${String(
                        methodName,
                      )} was blocked by an guard`,
                    );
                  }
                }

                const response = await fetch("/rpc", request);

                // Call loggers
                for (const responseHook of hooks.filter(
                  (h: ClientHook) => h.phase === "response",
                )) {
                  await responseHook.fn(
                    className,
                    methodName.toString(),
                    args,
                    request,
                    response,
                  );
                }

                if (!response.ok) {
                  throw new Error(`RPC call failed: ${response.statusText}`);
                }
                const data = DSON.parse(await response.text()) as T;

                // Call data loggers
                for (const resultHook of hooks.filter(
                  (h: ClientHook) => h.phase === "result",
                )) {
                  await resultHook.fn(
                    className,
                    methodName.toString(),
                    args,
                    request,
                    response,
                    data,
                  );
                }

                // Return the data
                return data;
              };
            },
          },
        );
      },
    });
  }
  return client as T;
}
