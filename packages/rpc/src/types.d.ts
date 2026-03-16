/** A class constructor that can be used as an RPC namespace. */
export type RpcApiClass = new (...args: unknown[]) => unknown;

/** A plain object whose values are functions - used for object-based RPC modules. */
export type RpcApiModule = Record<string, (...args: any[]) => any>;

/** A namespace entry can be either a class constructor or a plain object with functions. */
export type RpcApiEntry = RpcApiClass | RpcApiModule;

/**
 * Schema descriptor for a single class-based RPC namespace.
 * Returned as part of the array from `/rpc/schema`.
 */

/** Descriptor for a single method/function in the RPC schema. */
export interface RpcMethodDescriptor {
  async: boolean;
  generator: boolean;
}

export interface RpcClassSchema {
  kind: "class";
  className: string;
  methods: Record<string, RpcMethodDescriptor>;
  properties: Record<string, unknown>;
}

/**
 * Schema descriptor for a single module-based (plain-object) RPC namespace.
 * Returned as part of the array from `/rpc/schema`.
 */
export interface RpcModuleSchema {
  kind: "module";
  moduleName: string;
  methods: Record<string, RpcMethodDescriptor>;
}

/**
 * A single entry in the RPC schema — either a class or a module descriptor.
 * The full schema is an array of these, serialized as JSON at `/rpc/schema`.
 */
export type RpcSchemaEntry = RpcClassSchema | RpcModuleSchema;

/** The full schema returned by `/rpc/schema` — an array of namespace descriptors. */
export type RpcApiSchema = RpcSchemaEntry[];

/**
 * The namespace map passed to `createRpcServer()`.
 * Keys become the namespace identifiers used in RPC calls (i.e. `className`).
 *
 * @example
 * createRpcServer({ UserApi, OrderApi, mathUtils });
 */
export interface ApiNamespace {
  [name: string]: RpcApiEntry;
}

/**
 * Wire format of a single RPC call sent from client to server as the POST body of `/rpc`.
 */
export interface RpcCallDescriptor {
  /**
   * Optional request ID — reserved for future request-correlation and deduplication.
   * Not currently consumed by `rpcRoute`.
   */
  id?: string | number;
  /**
   * Optional Unix millisecond timestamp of when the call was initiated on the client.
   * Establishes implicit call order when multiple concurrent requests are in flight.
   */
  ts?: number;
  /** The registered namespace name (class name or module name). */
  className: string;
  /** The method or function name to invoke on the namespace. */
  methodName: string;
  /** Positional argument list, serialized as a JSON array. */
  args: unknown[];
}

// hooks

/**
 * Lifecycle phase for server-side hooks.
 *
 * - `"guard"` — runs **before** the method is invoked. Return `false` to reject with HTTP 403.
 *   Returning `void`/`undefined` is treated as allowed.
 * - `"result"` — runs **after** the method returns successfully, before the response is sent.
 *   Return value is ignored; use for logging, auditing, or side-effects.
 */
export type ServerHookPhase = "guard" | "result";

/**
 * A server-side hook function.
 *
 * - In `"guard"` phase: returning `false` blocks the call (HTTP 403). Any other return value
 *   (`true`, `void`, `undefined`) allows the call through.
 * - In `"result"` phase: return value is ignored; use for logging, auditing, or side-effects.
 *
 * @param className  - The namespace name (RPC class or module).
 * @param methodName - The method/function being called.
 * @param args       - The positional argument list.
 * @param request    - The raw Fetch API `Request` object.
 * @param result     - The return value of the method (only populated in `"result"` phase).
 */
export type ServerHookFn = (
  className: string,
  methodName: string,
  args: unknown[],
  request: Request,
  result?: unknown,
) => boolean | Promise<boolean> | void | Promise<void>;

export type ServerHook = {
  fn: ServerHookFn;
  phase: ServerHookPhase;
};

/**
 * Lifecycle phase for client-side hooks.
 *
 * - `"guard"` — runs **before** the fetch is dispatched. Return falsy to abort (throws an Error).
 *   Returning `void`/`undefined` is treated as allowed.
 * - `"response"` — runs **after** the raw HTTP `Response` arrives, before DSON deserialization.
 *   Useful for logging, metrics, or reading raw response headers/status.
 * - `"result"` — runs **after** the response body has been DSON-deserialized. Use for result
 *   logging or side-effects. `data` is populated with the final return value.
 */
export type ClientHookPhase = "guard" | "response" | "result";

/**
 * A client-side hook function.
 *
 * - In `"guard"` phase: return falsy to throw and abort the call.
 * - In `"response"` phase: `response` is populated; `data` is `undefined`.
 * - In `"result"` phase: both `response` and `data` are populated.
 *
 * @param className  - The namespace name.
 * @param methodName - The method/function being called.
 * @param args       - The positional argument list.
 * @param request    - The `RequestInit` used for the fetch (headers, body, etc.).
 * @param response   - The raw `Response` (populated in `"response"` and `"result"` phases).
 * @param data       - The deserialized result (only in `"result"` phase).
 */
export type ClientHookFn = (
  className: string,
  methodName: string,
  args: unknown[],
  request?: RequestInit,
  response?: Response,
  data?: unknown,
) => boolean | Promise<boolean> | void | Promise<void>;

export type ClientHook = {
  fn: ClientHookFn;
  phase: ClientHookPhase;
};

/**
 * A single NDJSON frame sent by the server when an RPC method returns a generator.
 *
 * - `yield`  — one yielded value (non-terminal).
 * - `return` — the generator's return value (terminal, stream ends after this).
 * - `error`  — an error thrown during iteration (terminal).
 */
export type DsonStreamFrame =
  | { type: "yield"; value: unknown }
  | { type: "return"; value: unknown }
  | { type: "error"; error: { message: string; stack?: string } };
