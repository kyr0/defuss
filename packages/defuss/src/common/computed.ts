import type { Store, Listener } from "../store/store.js";

/**
 * Creates a computed (derived) store from other stores.
 * The computed value is recalculated when any dependency store changes.
 *
 * @example
 * ```ts
 * const countStore = createStore({ count: 0 });
 * const doubled = computed(countStore, (v) => v.count * 2);
 *
 * // Or with multiple stores:
 * const a = createStore({ value: 1 });
 * const b = createStore({ value: 2 });
 * const sum = computed([a, b], (av, bv) => av.value + bv.value);
 * ```
 */
export function computed<T>(
  stores: Store<any> | Store<any>[],
  fn: (...values: any[]) => T
): Store<T> {
  const storeList = Array.isArray(stores) ? stores : [stores];

  let value = fn(...storeList.map((s) => s.value));
  const listeners: Array<Listener<T>> = [];

  const recalculate = () => {
    const oldValue = value;
    value = fn(...storeList.map((s) => s.value));
    if (value !== oldValue) {
      listeners.forEach((l) => l(value, oldValue));
    }
  };

  // Subscribe to all dependency stores
  const unsubscribes = storeList.map((s) => s.subscribe(recalculate));

  return {
    get value() {
      return value;
    },
    get: () => value,
    set: () => {
      throw new Error("Computed stores are read-only");
    },
    getRaw: () => value,
    setRaw: () => {
      throw new Error("Computed stores are read-only");
    },
    reset: () => {},
    subscribe: (listener: Listener<T>) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    persist: () => {},
    restore: () => {},
  };
}
