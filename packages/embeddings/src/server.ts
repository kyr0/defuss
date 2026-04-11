import { BaseEmbeddingRuntime } from "./core.js";
import { getDefaultNodeCacheDir } from "./model-cache.node.js";
import type { EmbedderInitOptions } from "./types.js";

export * from "./shared.js";

export class DefussEmbeddingServer extends BaseEmbeddingRuntime {
  public constructor(options: EmbedderInitOptions = {}) {
    super(
      {
        ...options,
        cacheDir: options.cacheDir ?? getDefaultNodeCacheDir(),
        useFS: options.useFS ?? true,
        useFSCache: options.useFSCache ?? true,
      },
      { allowLocalModels: true },
    );
  }
}

export const createEmbeddingServer = (options: EmbedderInitOptions = {}): DefussEmbeddingServer => {
  return new DefussEmbeddingServer(options);
};
