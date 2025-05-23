import { WebStorageProvider } from "../isomporphic/memory.js";
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "../types.js";

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  _provider: PersistenceProviderType,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  return new WebStorageProvider<T>();
};
