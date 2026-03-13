import type { APIRoute } from "astro";
import { DSON } from "defuss-dson";
import type {
  ApiNamespace,
  RpcApiClass,
  RpcApiEntry,
  RpcApiModule,
  RpcCallDescriptor,
  RpcSchemaEntry,
  ServerHook,
} from "./types.d.js";

export * from "./types.d.js";

/** Base path of the RPC dispatch endpoint. */
export const RPC_PATH = "/rpc" as const;

/** Base path of the RPC schema-discovery endpoint. */
export const RPC_SCHEMA_PATH = "/rpc/schema" as const;

/** Map from namespace name → entry (class or module). */
const rpcApiEntries: Map<string, RpcApiEntry> = new Map();

const hooks: ServerHook[] = [];

/**
 * Returns true if the entry is a class constructor, false if it's a plain object module.
 */
function isRpcClass(entry: RpcApiEntry): entry is RpcApiClass {
  return typeof entry === "function" && !!entry.prototype;
}

/**
 * Adds a hook function that gets called at a specific time BEFORE or AFTER each RPC method invocation.
 * Can reject calls by returning false (only for guards).
 *
 * @param hook - The hook to add
 */
export function addHook(hook: ServerHook) {
  hooks.push(hook);
}

/**
 * Register an API namespace map with the RPC server.
 *
 * - Each key becomes the `className` identifier used in RPC calls.
 * - Values can be a **class constructor** (instantiated fresh per-call) or a **plain object module**.
 * - **Idempotent**: if the registry already has entries, subsequent calls are silently ignored.
 *   This prevents accidental double-registration during hot-reload or module re-evaluation.
 * - Pass an empty object `{}` to explicitly clear the registry (prefer `clearRpcServer()` in tests).
 *
 * Must be called before the first request reaches `rpcRoute`.
 *
 * @param ns - Map of namespace name → class constructor or plain module object.
 *
 * @example
 * createRpcServer({ UserApi, OrderApi, mathUtils });
 */
export function createRpcServer(ns: ApiNamespace) {
  // Clear existing entries if empty namespace is passed
  if (Object.keys(ns).length === 0) {
    rpcApiEntries.clear();
    return;
  }

  if (rpcApiEntries.size > 0) {
    return; // Prevent re-publishing the same namespace
  }
  for (const [name, entry] of Object.entries(ns)) {
    rpcApiEntries.set(name, entry);
  }
}

/**
 * Clear the RPC server registry and remove all registered hooks.
 *
 * Intended for **test isolation only** — resets global state between test cases so each test
 * starts with a clean namespace registry and an empty hook list.
 */
export function clearRpcServer() {
  rpcApiEntries.clear();
  hooks.length = 0;
}

/**
 * Astro `APIRoute` handler for the defuss-rpc server.
 *
 * Mount this at `/rpc/[...all]` in your Astro project (e.g. `src/pages/rpc/[...all].ts`).
 * It handles two logical endpoints:
 *
 * | Method | Path           | Description                                                |
 * |--------|----------------|------------------------------------------------------------|
 * | any    | `/rpc/schema`  | Returns the full JSON schema of all registered namespaces. |
 * | POST   | `/rpc`         | Dispatches a single RPC call described in the request body.|
 *
 * **Request body** (`POST /rpc`): `RpcCallDescriptor` JSON — `{ className, methodName, args }`.
 *
 * **Response body**: DSON-serialized return value (`Content-Type: application/json`).
 * DSON extends JSON to preserve `Date`, `Map`, `Set`, `ArrayBuffer`, `BigInt`, and typed arrays.
 *
 * **Hook execution order:**
 * 1. Guard hooks — any hook returning `false` short-circuits with HTTP 403.
 * 2. Method/function invocation on the registered namespace entry.
 * 3. Result hooks — run after a successful return, before the response is flushed.
 *
 * **HTTP status codes:**
 * - `403` — A guard hook returned `false`.
 * - `404` — Namespace (`className`) or method/function name not found.
 * - `500` — The method/function threw during execution.
 */
export const rpcRoute: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  // Normalize trailing slashes so "/rpc/schema/" and "/rpc/schema" resolve identically.
  const pathname = url.pathname.replace(/\/+$/, "");

  if (pathname.endsWith(RPC_SCHEMA_PATH)) {
    // Return schema describing all registered classes and modules
    const schemaEntries: RpcSchemaEntry[] = [];

    for (const [name, entry] of rpcApiEntries) {
      if (isRpcClass(entry)) {
        const desc = describeInstance(entry.prototype) as {
          className: string;
          methods: Record<string, { async: boolean }>;
          properties: Record<string, unknown>;
        };
        schemaEntries.push({
          kind: "class",
          className: name,
          methods: desc.methods,
          properties: desc.properties,
        });
      } else {
        schemaEntries.push(describeModule(name, entry));
      }
    }

    return new Response(JSON.stringify(schemaEntries), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Handle RPC calls
  const callDescriptor: RpcCallDescriptor = await request.json();
  const { className, methodName, args } = callDescriptor;

  // Call "guard" hooks
  for (const hook of hooks.filter((h) => h.phase === "guard")) {
    const allowed = await hook.fn(className, methodName, args, request);
    // Only an explicit `false` return blocks the call; `void`/`undefined` implicitly allows it.
    if (allowed === false) {
      console.error("[defuss-rpc] Forbidden by hook", { className, methodName, args, request });
      return new Response(JSON.stringify({ error: "Forbidden by hook" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const entry = rpcApiEntries.get(className);
  if (!entry) {
    console.error("[defuss-rpc] Namespace not found", { className, methodName, args, request });
    return new Response(
      JSON.stringify({ error: `Namespace ${className} not found` }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  let result = null;

  if (isRpcClass(entry)) {
    // Class-based: instantiate and call
    const instance = new entry() as Record<string, unknown>;
    const method = instance[methodName];
    if (typeof method !== "function") {
      console.error("[defuss-rpc] Method not found", { className, methodName, args, request });
      return new Response(
        JSON.stringify({
          error: `Method ${methodName} not found on class ${className}`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    try {
      result = await (method as (...args: unknown[]) => unknown).apply(
        instance,
        args,
      );
    } catch (error: unknown) {
      console.error("[defuss-rpc] Error calling method", { className, methodName, args, request, error });
      return new Response(
        JSON.stringify({
          error: `Error calling method ${methodName}: ${error instanceof Error ? error.message : String(error)}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  } else {
    // Module-based: call function directly on the object
    const fn = (entry as Record<string, unknown>)[methodName];
    if (typeof fn !== "function") {
      console.error("[defuss-rpc] Function not found", { className, methodName, args, request });
      return new Response(
        JSON.stringify({
          error: `Function ${methodName} not found on module ${className}`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    try {
      result = await (fn as (...args: unknown[]) => unknown)(...args);
    } catch (error: unknown) {
      console.error("[defuss-rpc] Error calling function", { className, methodName, args, request, error });
      return new Response(
        JSON.stringify({
          error: `Error calling function ${methodName}: ${error instanceof Error ? error.message : String(error)}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Call "result" hooks
  for (const hook of hooks.filter((h) => h.phase === "result")) {
    await hook.fn(className, methodName, args, request, result);
  }

  return new Response(await DSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

/**
 * Describe a plain-object module's functions for the schema.
 */
export function describeModule(
  name: string,
  obj: RpcApiModule,
): RpcSchemaEntry {
  const methods: Record<string, { async: boolean }> = {};
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "function") {
      const fn = obj[key] as Function;
      const isAsync = fn.constructor.name === "AsyncFunction";
      methods[key] = { async: isAsync };
    }
  }
  return {
    kind: "module",
    moduleName: name,
    methods,
  };
}

/**
 * Introspect a prototype object and return a descriptor of its class name, methods, and properties.
 *
 * Used internally to build the schema entry for class-based namespaces.
 *
 * @param proto - The prototype to inspect (pass `MyClass.prototype`).
 * @param seen  - WeakSet tracking already-visited prototypes to break circular chains.
 *                Circular references are replaced with the sentinel string `"[Circular]"`.
 */
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
