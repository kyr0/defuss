import { WebStorageProvider } from '../isomporphic/memory.js'
import type { PersistenceProvider, PersistenceProviderImpl, PersistenceProviderOptions } from '../provider.js'

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  provider: PersistenceProvider,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  switch (provider) {
    case 'session':
      return new WebStorageProvider<T>(window.sessionStorage)
    case 'local':
      return new WebStorageProvider<T>(window.localStorage)
  }
  return new WebStorageProvider<T>() // memory
}
