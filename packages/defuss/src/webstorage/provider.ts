import type { MemoryProviderOptions } from './isomporphic/memory.js'

export type MiddlewareFn<T> = (key: string, value: T) => T

/** a simple key/value persistence interface */
export interface PersistenceProviderImpl<T> {
  get: (key: string, defaultValue: T, middlewareFn?: MiddlewareFn<T>) => T
  set: (key: string, value: T, middlewareFn?: MiddlewareFn<T>) => void
  remove: (key: string) => void
  removeAll: () => void
  backendApi: any
}

export type PersistenceProvider = 'session' | 'local' | 'memory'

export type PersistenceProviderOptions = MemoryProviderOptions

export type { MemoryStorage, WebStorage } from './isomporphic/memory.js'
