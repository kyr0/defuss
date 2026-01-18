import { createRpcServer, addHook } from "defuss-rpc/server.js";
import { BarApi } from "./rpc/bar-api";
import { FooApi } from "./rpc/foo-api";

// server-side RPC API definition
export const RpcApi = {
  FooApi,
  BarApi,
};

addHook({
  fn: async (className: string,
    methodName: string,
    args: unknown[],
    request: Request,
    result?: unknown) => {
    console.log("Guard function called with request:", className, methodName, args, request, result);
    // Implement your guard logic here
    return true;
  }, phase: "guard"
});

createRpcServer(RpcApi); // expose the RPC API

// client-side RPC API type
export type RpcApi = typeof RpcApi;
