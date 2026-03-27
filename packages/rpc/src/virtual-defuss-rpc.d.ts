declare module "virtual:defuss-rpc" {
  /** Full URL of the RPC endpoint the client should connect to (e.g. `"http://localhost:3210"`). */
  export const rpcEndpoint: string;

  /** @deprecated Use `rpcEndpoint` instead. */
  export const rpcBaseUrl: string;
}
