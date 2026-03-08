/** Popup-side RPC methods callable from the worker */
export const PopupRpc = {
  onCapturedEvent(type: string, detail: Record<string, unknown>): void {
    console.log(`[popup] captured ${type}:`, detail);
  },
};

export type PopupRpcApi = typeof PopupRpc;
