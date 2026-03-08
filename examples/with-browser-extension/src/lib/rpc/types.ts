/** Schema describing a registered RPC endpoint */
export interface RpcSchema {
  name: string;
  methods: string[];
}

/** Wire format for an RPC call (mirrors defuss-rpc) */
export interface RpcCallMessage {
  action: "__rpc" | "__rpc_schema";
  className: string;
  methodName: string;
  args: unknown[];
}

/** Wire format for an RPC response */
export interface RpcResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  schema?: RpcSchema[];
}
