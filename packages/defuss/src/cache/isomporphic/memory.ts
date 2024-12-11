import type { PersistenceProviderImpl } from '../provider.js'
import type { GenericLocalStorage } from './generic.js'
import type { MiddlewareFn } from '../provider.js'

export type MemoryProviderOptions = {}

export const newInMemoryGenericStorageBackend = <T = string>(): GenericLocalStorage<T> => {
  const cache = new Map<string, T>()
  return {
    clear: (): void => {
      cache.clear()
    },

    getItem: (key: string): T | null => {
      return cache.get(String(key)) ?? null
    },

    removeItem: (key: string): void => {
      cache.delete(String(key))
    },

    setItem: (key: string, value: T): void => {
      cache.set(String(key), value)
    },
  }
}

/** global in-memory storage backend */
export const memory = newInMemoryGenericStorageBackend()

/** a simple, serverless and high-performance key/value storage engine  */
export class WebStorageProvider<T> implements PersistenceProviderImpl<T> {
  protected storage: GenericLocalStorage<string>;

  constructor(storage?: GenericLocalStorage<string>) {
    this.storage = storage || memory;
  }

  get(key: string, defaultValue: T, middlewareFn?: MiddlewareFn<T>): T {
    const rawValue = this.storage.getItem(key);

    if (rawValue === null) return defaultValue;

    let value: T = JSON.parse(rawValue);

    if (middlewareFn) {
      value = middlewareFn(key, value);
    }
    return value;
  }

  set(key: string, value: T, middlewareFn?: MiddlewareFn<T>): void {
    if (middlewareFn) {
      value = middlewareFn(key, value);
    }
    this.storage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  removeAll(): void {
    this.storage.clear();
  }

  get backendApi(): GenericLocalStorage<string> {
    return this.storage;
  }
}

export interface MemoryStorage<T> extends PersistenceProviderImpl<T> {
  backendApi: Omit<Omit<Storage, 'key'>, 'length'>
}

export interface WebStorage<T> extends PersistenceProviderImpl<T> {
  backendApi: Storage
}
