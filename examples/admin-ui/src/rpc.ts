import { createRpcServer, addHook } from "defuss-rpc/server.js";
import { AuthApi } from "./rpc/auth.js";
import { FooApi } from "./rpc/foo-api.js";

// server-side RPC API definition
export const RpcApi = {
  AuthApi,
  FooApi,
};

interface WhitelistRpcCall {
  className: string;
  methodName: string;
}

const rpcCallWhitelist: WhitelistRpcCall[] = [
  { className: "AuthApi", methodName: "login" },
  { className: "AuthApi", methodName: "logout" },
];

// ACL hook to guard RPC calls
addHook({
  phase: "guard",
  fn: (
    className: string,
    methodName: string,
    args: unknown[],
    request: Request,
  ) => {
    const token = request.headers.get("Authorization");

    console.log("RPC Call:", { className, methodName, args });
    console.log("Request Init:", request);
    console.log("Token:", token);

    // check for whitelisted RPC calls and call through, else return false
    if (
      !rpcCallWhitelist.find(
        (rpcCall) =>
          rpcCall.className === className && rpcCall.methodName === methodName,
      )
    ) {
      // Auth required for non-whitelisted calls

      // TODO: Actually check validity using defuss-jwt or similar
      if (!token) {
        console.log("Blocking RPC Call:", { className, methodName, args });
        return false; // block the call
      }
    }
    return true; // allow the call
  },
});

createRpcServer(RpcApi); // expose the RPC API

// client-side RPC API type
export type RpcApi = typeof RpcApi;
