import { createRpcServer, setGuardFunction } from "defuss-rpc/server.js";
import { BarApi } from "./rpc/bar-api";
import { FooApi } from "./rpc/foo-api";

// server-side RPC API definition
export const RpcApi = {
  FooApi,
  BarApi,
};

setGuardFunction(async (request) => {
  const payload = await request.json();
  console.log("Guard function called with request:", payload);
  // Implement your guard logic here
  return true;
});

createRpcServer(RpcApi); // expose the RPC API

// client-side RPC API type
export type RpcApi = typeof RpcApi;
