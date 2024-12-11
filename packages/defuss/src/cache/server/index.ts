import { WebStorageProvider } from '../isomporphic/memory.js'
import type { PersistenceProvider, PersistenceProviderImpl, PersistenceProviderOptions } from '../provider.js'

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  _provider: PersistenceProvider,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  return new WebStorageProvider<T>()
}
