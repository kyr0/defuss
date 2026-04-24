import { cloneBytes, resolveSileroAssetSources } from "./silero-assets.js";
import {
  readBrowserCachedSileroAsset,
  writeBrowserCachedSileroAsset,
} from "./silero-cache.js";
import type {
  SileroAssetOptions,
  SileroRuntimeTarget,
} from "./silero-types.js";

export interface SileroLoadedResources {
  modelBytes: Uint8Array;
  sessionCacheKey: string | null;
}

const resourcePromises = new Map<string, Promise<SileroLoadedResources>>();

export async function loadSileroResources(
  options: SileroAssetOptions | undefined,
  runtimeTarget: SileroRuntimeTarget,
): Promise<SileroLoadedResources> {
  const sources = resolveSileroAssetSources(options);

  if (options?.modelBytes) {
    return {
      modelBytes: cloneBytes(options.modelBytes),
      sessionCacheKey: null,
    };
  }

  const promiseKey = [
    runtimeTarget,
    sources.modelUrl,
    String(sources.cacheEnabled),
    sources.cacheDbName,
    sources.modelCacheKey,
  ].join("|");

  const cached = resourcePromises.get(promiseKey);
  if (cached) {
    return cached;
  }

  const next = (async (): Promise<SileroLoadedResources> => {
    const modelBytes = await loadSileroAssetBytes({
      runtimeTarget,
      assetUrl: sources.modelUrl,
      cacheEnabled: sources.cacheEnabled,
      cacheDbName: sources.cacheDbName,
      cacheKey: sources.modelCacheKey,
    });

    return {
      modelBytes,
      sessionCacheKey: sources.modelUrl,
    };
  })();

  resourcePromises.set(promiseKey, next);
  return next;
}

async function loadSileroAssetBytes(options: {
  runtimeTarget: SileroRuntimeTarget;
  assetUrl: string;
  cacheEnabled: boolean;
  cacheDbName: string;
  cacheKey: string;
}): Promise<Uint8Array> {
  if (options.runtimeTarget === "web" && options.cacheEnabled) {
    const cached = await readBrowserCachedSileroAsset({
      databaseName: options.cacheDbName,
      cacheKey: options.cacheKey,
    });

    if (cached) {
      return cached.bytes;
    }
  }

  const fetched = await readBinarySource(options.runtimeTarget, options.assetUrl);

  if (options.runtimeTarget === "web" && options.cacheEnabled) {
    await writeBrowserCachedSileroAsset({
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
  runtimeTarget: SileroRuntimeTarget,
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
      `Failed to load Silero asset '${assetUrl}': ${response.status} ${response.statusText}`,
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