import type { PersistenceProvider, PersistenceProviderImpl, PersistenceProviderOptions } from './provider.js'
import { getPersistenceProvider as getPersistenceProviderClient } from './client/index.js'
import { getPersistenceProvider as getPersistenceProviderServer } from './server/index.js'
import { isServer } from './runtime.js'

/** returns the persistence provider (isomorphic) */
export const webstorage = <T>(
  provider: PersistenceProvider = 'local',
  options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  if (isServer()) {
    return getPersistenceProviderServer(provider, options)
  } else {
    return getPersistenceProviderClient(provider, options)
  }
}

export * from './provider.js'
