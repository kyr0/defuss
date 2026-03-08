import { createRpcClient } from "defuss-rpc/client.js";
import type { ServerRpcApi } from "../../../server";
import config from "../../../config";

let _rpc: ServerRpcApi | null = null;

export async function getServerRpc(): Promise<ServerRpcApi> {
  if (!_rpc) {
    _rpc = await createRpcClient<ServerRpcApi>({ baseUrl: config.serverEndpoint });
  }
  return _rpc;
}
