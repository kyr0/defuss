const isNodeRuntime = (): boolean => {
  return typeof process !== "undefined" && process.release?.name === "node";
};

export const resolveModelCacheDir = async (
  cacheDir?: string | null,
): Promise<string | null> => {
  if (cacheDir) {
    return cacheDir;
  }

  if (!isNodeRuntime()) {
    return null;
  }

  const { getDefaultNodeCacheDir } = await import("./model-cache.node.js");
  return getDefaultNodeCacheDir();
};

export const loadCachedModelFile = async (options: {
  cacheDir: string | null;
  cacheKey: string;
  remoteUrl: string;
}): Promise<{
  bytes: Uint8Array;
  contentType: string | null;
  location: "filesystem" | "browser-cache" | "browser-db";
} | null> => {
  if (isNodeRuntime()) {
    const { getDefaultNodeCacheDir, readNodeCachedFile } = await import("./model-cache.node.js");
    const file = await readNodeCachedFile(options.cacheDir ?? getDefaultNodeCacheDir(), options.cacheKey);

    return file ? { ...file, location: "filesystem" } : null;
  }

  const {
    readBrowserCacheApiFile,
    readBrowserPersistentCachedFile,
    writeBrowserCacheApiFile,
  } = await import("./model-cache.browser.js");

  const cacheApiHit = await readBrowserCacheApiFile(options.remoteUrl);
  if (cacheApiHit) {
    return { ...cacheApiHit, location: "browser-cache" };
  }

  const persistentHit = await readBrowserPersistentCachedFile(options.cacheKey);
  if (!persistentHit) {
    return null;
  }

  await writeBrowserCacheApiFile(
    options.remoteUrl,
    persistentHit.bytes,
    persistentHit.contentType,
  );

  return { ...persistentHit, location: "browser-db" };
};

export const storeCachedModelFile = async (options: {
  cacheDir: string | null;
  cacheKey: string;
  remoteUrl: string;
  fileName: string;
  modelId: string;
  revision: string;
  bytes: Uint8Array;
  contentType: string | null;
}): Promise<"filesystem" | "browser-db"> => {
  if (isNodeRuntime()) {
    const { getDefaultNodeCacheDir, writeNodeCachedFile } = await import("./model-cache.node.js");
    await writeNodeCachedFile(
      options.cacheDir ?? getDefaultNodeCacheDir(),
      options.cacheKey,
      options.bytes,
    );
    return "filesystem";
  }

  const {
    writeBrowserCacheApiFile,
    writeBrowserPersistentCachedFile,
  } = await import("./model-cache.browser.js");

  await Promise.all([
    writeBrowserCacheApiFile(options.remoteUrl, options.bytes, options.contentType),
    writeBrowserPersistentCachedFile({
      cacheKey: options.cacheKey,
      remoteUrl: options.remoteUrl,
      fileName: options.fileName,
      modelId: options.modelId,
      revision: options.revision,
      bytes: options.bytes,
      contentType: options.contentType,
    }),
  ]);

  return "browser-db";
};