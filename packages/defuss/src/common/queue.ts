export const queueCallback = <T extends any[]>(cb: (...args: T) => void) => (...args: T) =>
  queueMicrotask(() => cb(...args));
