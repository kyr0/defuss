import { getRpcClient as getRpcClientBase } from "defuss-rpc/client.js";
import type { RpcApi } from "../../rpc";

export async function getRpcClient() {
  const baseUrl = window.__RPC_ENDPOINT__ || undefined;
  return getRpcClientBase<RpcApi>({ baseUrl });
}
