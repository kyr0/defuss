import { DSON } from "defuss-dson";
import type { RpcApiSchema } from "./types";

export async function getSchema() {
  const response = await fetch("/rpc/schema", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.statusText}`);
  }
  return response.json();
}

let schema: RpcApiSchema | null = null;

export async function getRpcClient<T>() {
  if (schema === null) {
    // TODO: cache schema in memory or localStorage
    schema = await getSchema();
  }
  const client = {};

  for (const apiClass of schema) {
    const className = apiClass.className;
    // biome-ignore lint/complexity/useArrowFunction: constructors are not arrow functions
    client[className] = new Proxy(function () {}, {
      construct: (_ctorTarget, _ctorArgs) => {
        return new Proxy(
          {},
          {
            get: (_target, methodName) => {
              return async (...args: any[]) => {
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
