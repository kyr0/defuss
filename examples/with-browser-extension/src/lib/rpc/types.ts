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
  args: string; // DSON-encoded args array
}

/** Wire format for an RPC response */
export interface RpcResponse {
  success: boolean;
  result?: string; // DSON-encoded result
  error?: string;
  schema?: RpcSchema[];
}

/** Metadata appended as the last argument to RPC method calls */
export interface RpcMeta {
  sender?: chrome.runtime.MessageSender;
}
