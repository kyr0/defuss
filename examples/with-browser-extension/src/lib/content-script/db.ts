import { createWorkerRpcClient } from "../rpc";
import type { WorkerRpcApi } from "../../worker-rpc";

type WorkerRpc = { WorkerRpc: WorkerRpcApi };
let rpc: WorkerRpc;
const rpcReady = createWorkerRpcClient<WorkerRpc>().then((client) => {
  rpc = client;
});

// async chrome extension storage-synced db key values, connected to worker via RPC
export const db = <T>(key: string, defaultValue?: T) => {
  return {
    get: async (): Promise<T> => {
      await rpcReady;
      const val = await rpc.WorkerRpc.dbGet(key);
      if (val == null) return defaultValue as T;
      try {
        return JSON.parse(val) as T;
      } catch {
        return defaultValue as T;
      }
    },
    set: async (value: T) => {
      await rpcReady;
      await rpc.WorkerRpc.dbSet(key, JSON.stringify(value));
    },
  };
};
