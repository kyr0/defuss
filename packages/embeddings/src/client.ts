import { BaseEmbeddingRuntime } from "./core.js";
import type { EmbedderInitOptions } from "./types.js";

export * from "./shared.js";

export class DefussEmbeddingClient extends BaseEmbeddingRuntime {
  public constructor(options: EmbedderInitOptions = {}) {
    super(options, { allowLocalModels: false, useBrowserCache: true });
  }
}

export const createEmbeddingClient = (options: EmbedderInitOptions = {}): DefussEmbeddingClient => {
  return new DefussEmbeddingClient(options);
};
