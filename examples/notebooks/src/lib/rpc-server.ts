import type { APIRoute } from "astro";
import { DSON } from "defuss-dson";
import type {
  ApiNamespace,
  RpcApiClass,
  RpcCallDescriptor,
  RpcGuardFn,
} from "./types";

const rpcApiClasses: RpcApiClass[] = [];
let guardFunction: RpcGuardFn | null = null;

export function createRpcServer(ns: ApiNamespace) {
  if (rpcApiClasses.length > 0) {
    return; // Prevent re-publishing the same namespace
  }
  Object.values(ns).forEach((cls) => rpcApiClasses.push(cls));
}

export function setGuardFunction(guardFn: RpcGuardFn) {
  guardFunction = guardFn;
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
    // Check if a guard function is set and call it
    if (typeof guardFunction === "function") {
      const isAllowed = await guardFunction(request.clone());
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle RPC calls
    const callDescriptor: RpcCallDescriptor = await request.json();

    const { className, methodName, args } = callDescriptor;
    const apiClass = rpcApiClasses.find(
      (cls) =>
        cls.name === className || cls.prototype.constructor.name === className,
    );
    if (!apiClass) {
      return new Response(
        JSON.stringify({ error: `Class ${className} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    const instance = new apiClass();
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
      result = await method.apply(instance, args);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: `Error calling method ${methodName}: ${error.message}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(await DSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

export function describeInstance(proto: any, seen = new WeakSet()) {
  if (proto === null || typeof proto !== "object") return null;
  if (seen.has(proto)) return "[Circular]";
  seen.add(proto);

  const cls = proto.constructor?.name || "Object";
  const methods = Object.getOwnPropertyNames(proto)
    .filter(
      (name) => name !== "constructor" && typeof proto[name] === "function",
    )
    .reduce(
      (acc, name) => {
        const fn = proto[name];
        const isAsync = fn.constructor.name === "AsyncFunction";
        acc[name] = { async: isAsync };
        return acc;
      },
      {} as Record<string, any>,
    );

  const properties = Object.keys(proto).reduce(
    (acc, key) => {
      const val = proto[key];
      acc[key] =
        typeof val === "object" && val !== null
          ? describeInstance(val, seen)
          : typeof val;
      return acc;
    },
    {} as Record<string, any>,
  );

  return {
    className: cls,
    methods,
    properties,
  };
}
