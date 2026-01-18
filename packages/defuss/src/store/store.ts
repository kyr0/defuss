import { getByPath, setByPath } from "defuss-runtime";
import {
  webstorage,
  type PersistenceProviderImpl,
  type PersistenceProviderType,
} from "../webstorage/index.js";

export type Listener<T> = (
  newValue: T,
  oldValue?: T,
  changedKey?: string,
) => void;

export type EqualsFn<T> = (a: T, b: T) => boolean;

export interface StoreOptions<T> {
  /** Custom equality function. Default: Object.is (shallow identity) */
  equals?: EqualsFn<T>;
}

export interface Store<T> {
  value: T;
  /** Get value at path, or entire store if no path */
  get: <D = T>(path?: string) => D;
  /** Set value at path, or replace entire store if no path */
  set: <D = T>(pathOrValue: string | D, value?: D) => void;
  /** Get entire store value (clearer API than get()) */
  getRaw: () => T;
  /** Replace entire store value (clearer API than set(value)) */
  setRaw: (value: T) => void;
  /** Reset store to initial value or provided value */
  reset: (value?: T) => void;
  subscribe: (listener: Listener<T>) => () => void;
  persist: (key: string, provider?: PersistenceProviderType) => void;
  restore: (key: string, provider?: PersistenceProviderType) => void;
}

/** Shallow identity comparison (opt-in for performance) */
export const shallowEquals = <T>(a: T, b: T): boolean => Object.is(a, b);

/** Deep equality via JSON (default - backward compatible) */
export const deepEquals = <T>(a: T, b: T): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export const createStore = <T>(
  initialValue: T,
  options: StoreOptions<T> = {},
): Store<T> => {
  const equals = options.equals ?? shallowEquals;
  let value: T = initialValue;
  const listeners: Array<Listener<T>> = [];

  const notify = (oldValue: T, changedKey?: string) => {
    listeners.forEach((listener) => listener(value, oldValue, changedKey));
  };

  let storage: PersistenceProviderImpl<T> | null = null;
  let storageKey: string | null = null;
  let storageProvider: PersistenceProviderType | undefined;

  const initStorage = (provider?: PersistenceProviderType) => {
    if (!storage || storageProvider !== provider) {
      storage = webstorage<T>(provider);
      storageProvider = provider;
    }
    return storage;
  };

  const persistToStorage = () => {
    if (storage && storageKey) {
      storage.set(storageKey, value);
    }
  };

  return {
    // allow reading value but prevent external mutation
    get value() {
      return value;
    },

    persist(key: string, provider: PersistenceProviderType = "local") {
      storage = initStorage(provider);
      storageKey = key;
      persistToStorage();
    },

    restore(key: string, provider: PersistenceProviderType = "local") {
      storage = initStorage(provider);
      storageKey = key;
      const storedValue = storage.get(key, value);

      // Capture oldValue before assignment for correct notification
      const oldValue = value;
      if (!equals(oldValue, storedValue)) {
        value = storedValue;
        notify(oldValue);
      }
    },

    get(path?: string) {
      return path ? getByPath(value, path) : value;
    },

    /** Get entire store value (clearer API) */
    getRaw() {
      return value;
    },

    /** Replace entire store value (clearer API) */
    setRaw(newValue: T) {
      const oldValue = value;
      if (!equals(value, newValue)) {
        value = newValue;
        notify(oldValue);
        persistToStorage();
      }
    },

    /** Reset to initial or provided value */
    reset(resetValue?: T) {
      const oldValue = value;
      const newValue = resetValue ?? initialValue;
      if (!equals(value, newValue)) {
        value = newValue;
        notify(oldValue);
        persistToStorage();
      }
    },

    set(pathOrValue: string | any, newValue?: any) {
      const oldValue = value;

      if (newValue === undefined) {
        // replace entire store value
        if (!equals(value, pathOrValue)) {
          value = pathOrValue;
          notify(oldValue);
          persistToStorage();
        }
      } else {
        // update a specific path
        const updatedValue = setByPath(value, pathOrValue, newValue);
        // Use configured equals function for consistency
        if (!equals(value, updatedValue)) {
          value = updatedValue;
          notify(oldValue, pathOrValue);
          persistToStorage();
        }
      }
    },

    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
};
