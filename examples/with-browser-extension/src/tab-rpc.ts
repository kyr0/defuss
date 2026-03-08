/** Content-script RPC methods callable from the worker (and indirectly from popup) */
export const TabRpc = {
  showAlert(message: string): void {
    alert(message);
  },
};

export type TabRpcApi = typeof TabRpc;
