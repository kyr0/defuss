export type RpcApiClass = new (...args: unknown[]) => unknown;

/** A plain object whose values are functions — used for object-based RPC modules. */
export type RpcApiModule = Record<string, (...args: any[]) => any>;

/** A namespace entry can be either a class constructor or a plain object with functions. */
export type RpcApiEntry = RpcApiClass | RpcApiModule;

export interface RpcClassSchema {
  kind: "class";
  className: string;
  methods: Record<string, { async: boolean }>;
  properties: Record<string, unknown>;
}

export interface RpcModuleSchema {
  kind: "module";
  moduleName: string;
  methods: Record<string, { async: boolean }>;
}

export type RpcSchemaEntry = RpcClassSchema | RpcModuleSchema;

export type RpcApiSchema = RpcSchemaEntry[];

export interface ApiNamespace {
  [name: string]: RpcApiEntry;
}

export interface RpcCallDescriptor {
  id?: string | number;
  className: string;
  methodName: string;
  args: unknown[];
}

// hooks

export type ServerHookPhase = "guard" | "result";

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

export type ClientHookPhase = "guard" | "response" | "result";

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
