export type RpcApiClass = new (...args: unknown[]) => unknown;

export interface RpcClassSchema {
  className: string;
  methods: Record<string, { async: boolean }>;
  properties: Record<string, unknown>;
}

export type RpcApiSchema = RpcClassSchema[];

export interface ApiNamespace {
  [className: string]: RpcApiClass;
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
