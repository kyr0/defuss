import { DSON } from "defuss-dson";
import type { RpcApiClass, RpcApiSchema } from "./types.d.js";

export * from "./types.d.js";

export async function getSchema() {
  const response = await fetch("/rpc/schema", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.statusText}`);
  }
  return response.json();
}

let schema: RpcApiSchema | null = null;

export function clearSchemaCache() {
  schema = null;
}

export async function getRpcClient<T extends Record<string, RpcApiClass>>() {
  if (schema === null) {
    // TODO: cache schema in memory or localStorage
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
                const response = await fetch("/rpc", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    className,
                    methodName,
                    args,
                  }),
                });
                if (!response.ok) {
                  throw new Error(`RPC call failed: ${response.statusText}`);
                }
                return DSON.parse(await response.text());
              };
            },
          },
        );
      },
    });
  }
  return client as T;
}
