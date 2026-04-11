import { resolveModelCacheDir } from "./model-cache.js";
import {
  buildNodeCacheKey,
  buildRemoteModelFileUrl,
  getRequiredModelFiles,
  resolveModelSource,
} from "./model-source.js";
import type {
  ModelCacheClearFileResult,
  ModelCacheClearResult,
  ModelCacheInspectionResult,
  ModelCacheLocation,
  ModelCacheOptions,
} from "./types.js";

const isNodeRuntime = (): boolean => {
  return typeof process !== "undefined" && process.release?.name === "node";
};

export const inspectModelCache = async (
  urlOrRepoId: string,
  options: ModelCacheOptions = {},
): Promise<ModelCacheInspectionResult> => {
  const source = resolveModelSource(urlOrRepoId, options);
  const cacheDir = await resolveModelCacheDir(options.cacheDir ?? null);
  const files = getRequiredModelFiles(source, options.dtype ?? "fp32", options.requiredFiles);

  const inspectedFiles = await Promise.all(
    files.map(async (fileName) => {
      const remoteUrl = buildRemoteModelFileUrl(source, fileName);
      const cacheKey = buildNodeCacheKey(source, fileName);
      const locations: ModelCacheLocation[] = [];

      if (isNodeRuntime()) {
        const { getDefaultNodeCacheDir, inspectNodeCachedFile } = await import("./model-cache.node.js");
        const exists = await inspectNodeCachedFile(cacheDir ?? getDefaultNodeCacheDir(), cacheKey);
        if (exists) {
          locations.push("filesystem");
        }
      } else {
        const {
          inspectBrowserCacheApiFile,
          inspectBrowserPersistentCachedFile,
        } = await import("./model-cache.browser.js");

        if (await inspectBrowserCacheApiFile(remoteUrl)) {
          locations.push("browser-cache");
        }
        if (await inspectBrowserPersistentCachedFile(cacheKey)) {
          locations.push("browser-db");
        }
      }

      return {
        fileName,
        remoteUrl,
        cacheKey,
        locations,
      };
    }),
  );

  return {
    source,
    files: inspectedFiles,
  };
};

export const clearModelCache = async (
  urlOrRepoId: string,
  options: ModelCacheOptions = {},
): Promise<ModelCacheClearResult> => {
  const source = resolveModelSource(urlOrRepoId, options);
  const cacheDir = await resolveModelCacheDir(options.cacheDir ?? null);
  const files = getRequiredModelFiles(source, options.dtype ?? "fp32", options.requiredFiles);

  const clearedFiles = await Promise.all(
    files.map(async (fileName): Promise<ModelCacheClearFileResult> => {
      const remoteUrl = buildRemoteModelFileUrl(source, fileName);
      const cacheKey = buildNodeCacheKey(source, fileName);
      const locations: ModelCacheLocation[] = [];
      const removedFrom: ModelCacheLocation[] = [];

      if (isNodeRuntime()) {
        const { getDefaultNodeCacheDir, inspectNodeCachedFile, deleteNodeCachedFile } = await import("./model-cache.node.js");
        const effectiveCacheDir = cacheDir ?? getDefaultNodeCacheDir();
        if (await inspectNodeCachedFile(effectiveCacheDir, cacheKey)) {
          locations.push("filesystem");
        }
        if (await deleteNodeCachedFile(effectiveCacheDir, cacheKey)) {
          removedFrom.push("filesystem");
        }
      } else {
        const {
          inspectBrowserCacheApiFile,
          inspectBrowserPersistentCachedFile,
          deleteBrowserCacheApiFile,
          deleteBrowserPersistentCachedFile,
        } = await import("./model-cache.browser.js");

        if (await inspectBrowserCacheApiFile(remoteUrl)) {
          locations.push("browser-cache");
        }
        if (await inspectBrowserPersistentCachedFile(cacheKey)) {
          locations.push("browser-db");
        }
        if (await deleteBrowserCacheApiFile(remoteUrl)) {
          removedFrom.push("browser-cache");
        }
        if (await deleteBrowserPersistentCachedFile(cacheKey)) {
          removedFrom.push("browser-db");
        }
      }

      return {
        fileName,
        remoteUrl,
        cacheKey,
        locations,
        removedFrom,
      };
    }),
  );

  return {
    source,
    files: clearedFiles,
  };
};