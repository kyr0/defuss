export type RpcApiClass = new (...args: any[]) => any;

export interface RpcClassSchema {
  className: string;
  methods: Record<string, { async: boolean }>;
  properties: Record<string, any>;
}

export type RpcApiSchema = RpcClassSchema[];

export interface ApiNamespace {
  [className: string]: RpcApiClass;
}

export interface RpcCallDescriptor {
  id?: string | number;
  className: string;
  methodName: string;
  args: any[];
}

export type RpcGuardFn = (req: Request) => Promise<boolean>;
