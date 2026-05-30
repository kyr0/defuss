import { createRpcServer, addHook } from "defuss-rpc/server.js";
import { AuthApi } from "./rpc/auth.js";
import { UsersApi } from "./rpc/users-api.js";
import { TenantsApi } from "./rpc/tenants-api.js";
import { ApiKeysApi } from "./rpc/api-keys-api.js";
import { DashboardApi } from "./rpc/dashboard-api.js";

// server-side RPC API definition
export const RpcApi = {
  AuthApi,
  UsersApi,
  TenantsApi,
  ApiKeysApi,
  DashboardApi,
};

interface WhitelistRpcCall {
  className: string;
  methodName: string;
}

// Auth-free RPC calls (login/logout must be accessible without token)
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

    // Check for whitelisted RPC calls and call through, else require auth
    const isWhitelisted = rpcCallWhitelist.some(
      (rpcCall) =>
        rpcCall.className === className && rpcCall.methodName === methodName,
    );

    if (isWhitelisted) {
      return true; // allow whitelisted calls without auth
    }

    // For all other calls, require a token (simulated auth)
    if (!token || !token.startsWith("Bearer ")) {
      console.log("Blocking RPC Call (no auth):", { className, methodName });
      return false; // block the call
    }

    return true; // allow the call
  },
});

createRpcServer(RpcApi); // expose the RPC API

// client-side RPC API type
export type RpcApi = typeof RpcApi;
