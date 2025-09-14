import type { APIRoute } from "astro";
import { DSON } from "defuss-dson";
import type {
  ApiNamespace,
  RpcApiClass,
  RpcCallDescriptor,
  ServerHook,
} from "./types.d.js";

export * from "./types.d.js";

const rpcApiClasses: RpcApiClass[] = [];

const hooks: ServerHook[] = [];

/**
 * Adds an hook function that gets called at a specific time BEFORE or AFTER each RPC method invocation.
 * Can reject calls by returning false (only for guards).
 *
 * @param hook - The hook to add
 * @returns true to allow the call, false to reject it
 */
export function addHook(hook: ServerHook) {
  hooks.push(hook);
}

export function createRpcServer(ns: ApiNamespace) {
  // Clear existing classes if empty namespace is passed
  if (Object.keys(ns).length === 0) {
    rpcApiClasses.length = 0;
    return;
  }

  if (rpcApiClasses.length > 0) {
    return; // Prevent re-publishing the same namespace
  }
  Object.values(ns).forEach((cls) => rpcApiClasses.push(cls));
}

// Functions for testing - to clear state between tests
export function clearRpcServer() {
  createRpcServer({});
  hooks.length = 0;
}

export const rpcRoute: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/schema")) {
    // Return schema of RPC classes
    return new Response(
      JSON.stringify(rpcApiClasses.map((c) => describeInstance(c.prototype))),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } else {
    // Handle RPC calls
    const callDescriptor: RpcCallDescriptor = await request.json();

    const { className, methodName, args } = callDescriptor;

    // Call "guard" hooks
    for (const hook of hooks.filter((h) => h.phase === "guard")) {
      const allowed = await hook.fn(
        className,
        methodName,
        args,
        request.clone(),
      );
      if (allowed === false) {
        return new Response(JSON.stringify({ error: "Forbidden by hook" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const ApiClass = rpcApiClasses.find(
      (cls) =>
        cls.name === className || cls.prototype.constructor.name === className,
    );
    if (!ApiClass) {
      return new Response(
        JSON.stringify({ error: `Class ${className} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    const instance = new ApiClass() as Record<string, unknown>;
    const method = instance[methodName];
    if (typeof method !== "function") {
      return new Response(
        JSON.stringify({
          error: `Method ${methodName} not found on class ${className}`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    let result = null;
    try {
      result = await (method as (...args: unknown[]) => unknown).apply(
        instance,
        args,
      );
    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: `Error calling method ${methodName}: ${error instanceof Error ? error.message : String(error)}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Call "result" hooks
    for (const hook of hooks.filter((h) => h.phase === "result")) {
      await hook.fn(className, methodName, args, request.clone(), result);
    }

    return new Response(await DSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

export function describeInstance(
  proto: unknown,
  seen = new WeakSet(),
): unknown {
  if (proto === null || typeof proto !== "object") return null;
  if (seen.has(proto)) return "[Circular]";
  seen.add(proto);

  const cls =
    ((proto as Record<string, unknown>).constructor as { name?: string })
      ?.name || "Object";
  const methods = Object.getOwnPropertyNames(proto)
    .filter(
      (name) =>
        name !== "constructor" &&
        typeof (proto as Record<string, unknown>)[name] === "function",
    )
    .reduce(
      (acc, name) => {
        const fn = (proto as Record<string, unknown>)[name] as Function;
        const isAsync = fn.constructor.name === "AsyncFunction";
        acc[name] = { async: isAsync };
        return acc;
      },
      {} as Record<string, { async: boolean }>,
    );

  const properties = Object.keys(proto).reduce(
    (acc, key) => {
      const val = (proto as Record<string, unknown>)[key];
      acc[key] =
        typeof val === "object" && val !== null
          ? describeInstance(val, seen)
          : typeof val;
      return acc;
    },
    {} as Record<string, unknown>,
  );

  return {
    className: cls,
    methods,
    properties,
  };
}
