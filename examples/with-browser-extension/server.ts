import { createRpcServer } from "defuss-rpc/server.js";
import { ExpressRpcServer } from "defuss-rpc/express-server.js";
import type { WorkItem } from "./src/types.js";
import config from "./config.js";

// -- RPC API --
const WorkApi = {
  async getWorkItems(): Promise<Array<WorkItem>> {
    return [
      {
        id: crypto.randomUUID(),
        type: "google_search",
        payload: { query: "defuss framework" },
      },
      {
        id: crypto.randomUUID(),
        type: "google_search",
        payload: { query: "browser extension RPC" },
      },
    ];
  }
};

const RpcApi = { JobApi: WorkApi };
createRpcServer(RpcApi);

export type ServerRpcApi = typeof RpcApi;

// -- Start server --
const port = Number(new URL(config.serverEndpoint).port) || 3210;
const server = new ExpressRpcServer({ port });
await server.start();
