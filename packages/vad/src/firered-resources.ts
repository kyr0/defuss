import { cloneBytes, resolveFireRedAssetSources } from "./firered-assets.js";
import { readBrowserCachedFireRedAsset, writeBrowserCachedFireRedAsset } from "./firered-cache.js";
import { FireRedCmvnStats } from "./firered-cmvn.js";
import type {
  FireRedAssetOptions,
  FireRedRuntimeTarget,
} from "./firered-types.js";

export interface FireRedLoadedResources {
  modelBytes: Uint8Array;
  cmvn: FireRedCmvnStats;
  sessionCacheKey: string | null;
}

const resourcePromises = new Map<string, Promise<FireRedLoadedResources>>();

export async function loadFireRedResources(
  options: FireRedAssetOptions | undefined,
  runtimeTarget: FireRedRuntimeTarget,
): Promise<FireRedLoadedResources> {
  const sources = resolveFireRedAssetSources(options);

  if (options?.modelBytes || options?.cmvnBytes) {
    const modelBytes = options.modelBytes
      ? cloneBytes(options.modelBytes)
      : await loadFireRedAssetBytes({
          runtimeTarget,
          assetUrl: sources.modelUrl,
          cacheEnabled: sources.cacheEnabled,
          cacheDbName: sources.cacheDbName,
          cacheKey: sources.modelCacheKey,
        });
    const cmvnBytes = options.cmvnBytes
      ? cloneBytes(options.cmvnBytes)
      : await loadFireRedAssetBytes({
          runtimeTarget,
          assetUrl: sources.cmvnUrl,
          cacheEnabled: sources.cacheEnabled,
          cacheDbName: sources.cacheDbName,
          cacheKey: sources.cmvnCacheKey,
        });

    return {
      modelBytes,
      cmvn: FireRedCmvnStats.fromKaldiBinary(cmvnBytes),
      sessionCacheKey: null,
    };
  }

  const promiseKey = [
    runtimeTarget,
    sources.modelUrl,
    sources.cmvnUrl,
    String(sources.cacheEnabled),
    sources.cacheDbName,
    sources.modelCacheKey,
    sources.cmvnCacheKey,
  ].join("|");

  const cached = resourcePromises.get(promiseKey);
  if (cached) {
    return cached;
  }

  const next = (async (): Promise<FireRedLoadedResources> => {
    const [modelBytes, cmvnBytes] = await Promise.all([
      loadFireRedAssetBytes({
        runtimeTarget,
        assetUrl: sources.modelUrl,
        cacheEnabled: sources.cacheEnabled,
        cacheDbName: sources.cacheDbName,
        cacheKey: sources.modelCacheKey,
      }),
      loadFireRedAssetBytes({
        runtimeTarget,
        assetUrl: sources.cmvnUrl,
        cacheEnabled: sources.cacheEnabled,
        cacheDbName: sources.cacheDbName,
        cacheKey: sources.cmvnCacheKey,
      }),
    ]);

    return {
      modelBytes,
      cmvn: FireRedCmvnStats.fromKaldiBinary(cmvnBytes),
      sessionCacheKey: sources.modelUrl,
    };
  })();

  resourcePromises.set(promiseKey, next);
  return next;
}

async function loadFireRedAssetBytes(options: {
  runtimeTarget: FireRedRuntimeTarget;
  assetUrl: string;
  cacheEnabled: boolean;
  cacheDbName: string;
  cacheKey: string;
}): Promise<Uint8Array> {
  if (options.runtimeTarget === "web" && options.cacheEnabled) {
    const cached = await readBrowserCachedFireRedAsset({
      databaseName: options.cacheDbName,
      cacheKey: options.cacheKey,
    });

    if (cached) {
      return cached.bytes;
    }
  }

  const fetched = await readBinarySource(options.runtimeTarget, options.assetUrl);

  if (options.runtimeTarget === "web" && options.cacheEnabled) {
    await writeBrowserCachedFireRedAsset({
      databaseName: options.cacheDbName,
      cacheKey: options.cacheKey,
      assetUrl: options.assetUrl,
      bytes: fetched.bytes,
      contentType: fetched.contentType,
    });
  }

  return fetched.bytes;
}

async function readBinarySource(
  runtimeTarget: FireRedRuntimeTarget,
  assetUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  if (runtimeTarget === "node" && isFileLikeLocation(assetUrl)) {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const filePath = assetUrl.startsWith("file:")
      ? fileURLToPath(assetUrl)
      : assetUrl;
    const bytes = await readFile(filePath);
    return {
      bytes: new Uint8Array(bytes),
      contentType: null,
    };
  }

  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to load FireRed asset '${assetUrl}': ${response.status} ${response.statusText}`,
    );
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
}

function isFileLikeLocation(location: string): boolean {
  if (location.startsWith("file:")) {
    return true;
  }

  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(location);
}