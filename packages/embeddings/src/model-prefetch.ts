import { env } from "@huggingface/transformers";
import {
  loadCachedModelFile,
  resolveModelCacheDir,
  storeCachedModelFile,
} from "./model-cache.js";
import {
  buildNodeCacheKey,
  buildRemoteModelFileUrl,
  getRequiredModelFiles,
  resolveModelSource,
} from "./model-source.js";
import type { ModelPrefetchOptions, ModelPrefetchResult } from "./types.js";

const isNodeRuntime = (): boolean => {
  return typeof process !== "undefined" && process.release?.name === "node";
};

const buildFetchHeaders = (remoteUrl: string): Headers => {
  const headers = new Headers();
  if (isNodeRuntime()) {
    headers.set("User-Agent", `defuss-embeddings/${env.version ?? "dev"}`);
  }

  if (/^https?:\/\/(huggingface\.co|hf\.co)\//i.test(remoteUrl) && isNodeRuntime()) {
    const token = process.env.HF_TOKEN ?? process.env.HF_ACCESS_TOKEN;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
};

export const prefetchModel = async (
  urlOrRepoId: string,
  options: ModelPrefetchOptions = {},
): Promise<ModelPrefetchResult> => {
  const source = resolveModelSource(urlOrRepoId, options);
  const files = getRequiredModelFiles(source, options.dtype ?? "fp32", options.requiredFiles);
  const cacheDir = await resolveModelCacheDir(options.cacheDir ?? env.cacheDir ?? null);
  const prefetched: ModelPrefetchResult["files"] = [];

  for (const fileName of files) {
    const remoteUrl = buildRemoteModelFileUrl(source, fileName);
    const cacheKey = buildNodeCacheKey(source, fileName);

    const cached = await loadCachedModelFile({ cacheDir, cacheKey, remoteUrl });
    if (!cached) {
      const response = await fetch(remoteUrl, { headers: buildFetchHeaders(remoteUrl) });

      if (!response.ok) {
        throw new Error(`Failed to fetch model file: ${remoteUrl} (${response.status})`);
      }

      await storeCachedModelFile({
        cacheDir,
        cacheKey,
        remoteUrl,
        fileName,
        modelId: source.modelId,
        revision: source.revision,
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get("content-type"),
      });
    }

    prefetched.push({ fileName, remoteUrl, cacheKey });
  }

  return { source, files: prefetched };
};
