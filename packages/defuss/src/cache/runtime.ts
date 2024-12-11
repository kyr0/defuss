//export const isBrowser = (): boolean => typeof window !== "undefined" && typeof window.document !== "undefined";

export const isServer = (): boolean => typeof window === "undefined" || typeof window.document === "undefined";

//export const isWebWorker = (): boolean => typeof self === "object" && self.constructor?.name === "DedicatedWorkerGlobalScope";