import { addHook } from "defuss-rpc/server.js";
import { AuthApi } from "./rpc/auth.js";
import { UsersApi } from "./rpc/users-api.js";
import { TenantsApi } from "./rpc/tenants-api.js";
import { ApiKeysApi } from "./rpc/api-keys-api.js";
import { DashboardApi } from "./rpc/dashboard-api.js";

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

const rpcCallWhitelist: WhitelistRpcCall[] = [
  { className: "AuthApi", methodName: "login" },
  { className: "AuthApi", methodName: "logout" },
];

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

    const isWhitelisted = rpcCallWhitelist.some(
      (rpcCall) =>
        rpcCall.className === className && rpcCall.methodName === methodName,
    );

    if (isWhitelisted) {
      return true;
    }

    if (!token || !token.startsWith("Bearer ")) {
      console.log("Blocking RPC Call (no auth):", { className, methodName });
      return false;
    }

    return true;
  },
});

export default RpcApi;

export type RpcApi = typeof RpcApi;
