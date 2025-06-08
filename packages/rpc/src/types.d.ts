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

export type RpcGuardFn = (req: Request) => Promise<boolean>;
