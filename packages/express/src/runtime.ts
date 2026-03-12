import type { PrimaryRuntime, WorkerRuntime } from "./types.js";

export const primaryRuntime: PrimaryRuntime = {
  mode: "primary",
  backends: new Map(),
  workerByIndex: new Map(),
  workerIndexById: new Map(),
  signalHandlersInstalled: false,
};

export const workerRuntime: WorkerRuntime = {
  mode: "worker",
  activeConnections: new Set(),
  signalHandlersInstalled: false,
};
