import { createRpcServer } from "defuss-rpc/server.js";
import { ExpressRpcServer } from "defuss-rpc/express-server.js";
import type { WorkItem, WorkItemResult } from "../types.js";
import {
  enqueueWorkItem,
  doWorkItem,
  observeWorkItem,
  completeWorkItem,
  claimWorkItems,
} from "./work-orchestration.js";
import config from "../../config.js";

export { enqueueWorkItem, doWorkItem, observeWorkItem };

// -- RPC API --
const WorkApi = {
  /** Claim all pending work items (atomically moves them to in-progress) */
  async claimWorkItems(): Promise<Array<WorkItem>> {
    return claimWorkItems();
  },

  /** Receive a processed work item result from the extension */
  async submitWorkItemResult(
    id: string,
    result: WorkItemResult,
  ): Promise<void> {
    completeWorkItem(id, result);
  },

  /** Enqueue a new work item (callable via RPC for external orchestration) */
  async enqueue(item: Omit<WorkItem, "id" | "status">): Promise<WorkItem> {
    return enqueueWorkItem(item);
  },
};

export const RpcApi = { JobApi: WorkApi };
createRpcServer(RpcApi);

export type ServerRpcApi = typeof RpcApi;

// -- Start server --
export const port = Number(new URL(config.serverEndpoint).port) || 3210;
export const server = new ExpressRpcServer({ port });
