import { getByPath, setByPath } from "../common/index.js";
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

export interface Store<T> {
  value: T;
  get: <D = T>(path?: string) => D;
  set: <D = T>(pathOrValue: string | D, value?: D) => void;
  subscribe: (listener: Listener<T>) => () => void;
  persist: (key: string, provider?: PersistenceProviderType) => void;
  restore: (key: string, provider?: PersistenceProviderType) => void;
}

export const createStore = <T>(initialValue: T): Store<T> => {
  let value: T = initialValue; // internal state
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

      // Deep equality comparison would be better here, but for now use JSON comparison
      const valueAsString = JSON.stringify(value);
      const storedValueAsString = JSON.stringify(storedValue);

      if (valueAsString !== storedValueAsString) {
        value = storedValue;
        notify(value);
      }
    },
    get(path?: string) {
      return path ? getByPath(value, path) : value;
    },
    set(pathOrValue: string | any, newValue?: any) {
      const oldValue = value;

      if (newValue === undefined) {
        // replace entire store value
        const valueAsString = JSON.stringify(value);
        const newValueAsString = JSON.stringify(pathOrValue);

        if (valueAsString !== newValueAsString) {
          value = pathOrValue;
          notify(oldValue);
          persistToStorage();
        }
      } else {
        // update a specific path
        const updatedValue = setByPath(value, pathOrValue, newValue);
        const updatedValueAsString = JSON.stringify(updatedValue);
        const oldValueAsString = JSON.stringify(oldValue);

        if (oldValueAsString !== updatedValueAsString) {
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
