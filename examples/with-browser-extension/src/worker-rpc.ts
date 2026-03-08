import { dbGetValue, dbSetValue } from "./lib/worker/db";
import { getValue, setValue } from "./lib/worker/prefs";
import { getArrayBufferValue, setArrayBufferValue, removeBlobValue } from "./lib/worker/blob";
import { createTabRpcClient } from "./lib/rpc";

/** Worker-side RPC methods callable from popup and content-script */
export const WorkerRpc = {
  async dbGet(key: string): Promise<string | undefined> {
    return dbGetValue(key);
  },

  async dbSet(key: string, value: string): Promise<number> {
    return dbSetValue(key, value);
  },

  async getPrefValue(key: string, local = true): Promise<unknown> {
    return getValue(key, undefined, local);
  },

  async setPrefValue(key: string, value: unknown, local = true): Promise<void> {
    await setValue(key, value, local);
  },

  async saveFile(name: string, data: ArrayBuffer): Promise<void> {
    await setArrayBufferValue(name, data);
  },

  async readFile(name: string): Promise<ArrayBuffer | undefined> {
    return getArrayBufferValue(name);
  },

  async deleteFile(name: string): Promise<void> {
    await removeBlobValue(name);
  },

  /** Forward an RPC call to the active tab's content script */
  async tabRpcCall(
    className: string,
    methodName: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const rpc = await createTabRpcClient<Record<string, Record<string, (...a: any[]) => any>>>();
    return rpc[className][methodName](...args);
  },

  /** Receive a captured DOM event from a tab's content script */
  async onCapturedEvent(
    type: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    console.log(`[worker] captured ${type}:`, detail);

    // Forward to popup (if open) — best-effort, ignore errors
    chrome.runtime.sendMessage({
      action: "__rpc",
      className: "PopupRpc",
      methodName: "onCapturedEvent",
      args: [type, detail],
    }).catch(() => {});
  },
};

export type WorkerRpcApi = typeof WorkerRpc;
