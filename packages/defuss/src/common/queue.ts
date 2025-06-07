export const queueCallback = (cb: Function) => () =>
  queueMicrotask(cb as VoidFunction);
