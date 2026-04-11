import type { DefussRecord } from "defuss-db";
import { DEFAULT_TRANSFORMERS_CACHE_NAME } from "./model-source.js";

export const BROWSER_MODEL_CACHE_DB_NAME = "defuss-embeddings-cache";
export const BROWSER_MODEL_CACHE_TABLE_NAME = "model_files";

interface BrowserModelCacheRecord extends DefussRecord {
  pk?: number;
  cacheKey: string;
  cacheKey_index: string;
  remoteUrl: string;
  remoteUrl_index: string;
  fileName: string;
  modelId: string;
  revision: string;
  bytes: ArrayBuffer;
  contentType: string | null;
  updatedAt: string;
}

let providerPromise: Promise<{
  createTable(table: string): Promise<void>;
  connect(options?: object): Promise<void>;
  disconnect(): Promise<void>;
  findOne<T extends DefussRecord>(
    table: string,
    query: Partial<Record<string, string | bigint | number | boolean | null | ArrayBuffer | Blob>>,
  ): Promise<T | null>;
  upsert<T extends DefussRecord>(
    table: string,
    value: T,
    query: Partial<Record<string, string | bigint | number | boolean | null | ArrayBuffer | Blob>>,
  ): Promise<string | number | bigint>;
} | null> = null;

const getProvider = async () => {
  if (providerPromise !== null) {
    return providerPromise;
  }

  providerPromise = (async () => {
    const { DexieProvider } = await import("defuss-db/client.js");
    const provider = new DexieProvider(BROWSER_MODEL_CACHE_DB_NAME);
    await provider.connect();
    await provider.createTable(BROWSER_MODEL_CACHE_TABLE_NAME);
    return provider;
  })();

  return providerPromise;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const toUint8Array = (value: unknown): Uint8Array | null => {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value.slice(0));
  }

  if (
    value !== null
    && typeof value === "object"
    && "buffer" in value
    && (value as { buffer: unknown }).buffer instanceof ArrayBuffer
  ) {
    return new Uint8Array((value as { buffer: ArrayBuffer }).buffer.slice(0));
  }

  return null;
};

export const readBrowserCacheApiFile = async (
  remoteUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> => {
  if (typeof caches === "undefined") {
    return null;
  }

  const cache = await caches.open(DEFAULT_TRANSFORMERS_CACHE_NAME);
  const response = await cache.match(remoteUrl);

  if (!response) {
    return null;
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
};

export const inspectBrowserCacheApiFile = async (remoteUrl: string): Promise<boolean> => {
  if (typeof caches === "undefined") {
    return false;
  }

  const cache = await caches.open(DEFAULT_TRANSFORMERS_CACHE_NAME);
  return Boolean(await cache.match(remoteUrl));
};

export const writeBrowserCacheApiFile = async (
  remoteUrl: string,
  bytes: Uint8Array,
  contentType: string | null,
): Promise<void> => {
  if (typeof caches === "undefined") {
    return;
  }

  const cache = await caches.open(DEFAULT_TRANSFORMERS_CACHE_NAME);
  const headers = new Headers();

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  try {
    await cache.put(remoteUrl, new Response(bytes.slice(0), { headers }));
  } catch {
    // Some browser environments reject large Cache API writes; keep IndexedDB as the durable source.
  }
};

export const readBrowserPersistentCachedFile = async (
  cacheKey: string,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> => {
  const provider = await getProvider();
  if (!provider) {
    return null;
  }

  const record = await provider.findOne<BrowserModelCacheRecord>(BROWSER_MODEL_CACHE_TABLE_NAME, {
    cacheKey_index: cacheKey,
  });

  if (!record) {
    return null;
  }

  const bytes = toUint8Array(record.bytes);
  if (!bytes) {
    return null;
  }

  return {
    bytes,
    contentType: typeof record.contentType === "string" ? record.contentType : null,
  };
};

export const inspectBrowserPersistentCachedFile = async (cacheKey: string): Promise<boolean> => {
  const provider = await getProvider();
  if (!provider) {
    return false;
  }

  const record = await provider.findOne<BrowserModelCacheRecord>(BROWSER_MODEL_CACHE_TABLE_NAME, {
    cacheKey_index: cacheKey,
  });

  return Boolean(record);
};

export const writeBrowserPersistentCachedFile = async (options: {
  cacheKey: string;
  remoteUrl: string;
  fileName: string;
  modelId: string;
  revision: string;
  bytes: Uint8Array;
  contentType: string | null;
}): Promise<void> => {
  const provider = await getProvider();
  if (!provider) {
    return;
  }

  await provider.upsert<BrowserModelCacheRecord>(
    BROWSER_MODEL_CACHE_TABLE_NAME,
    {
      cacheKey: options.cacheKey,
      cacheKey_index: options.cacheKey,
      remoteUrl: options.remoteUrl,
      remoteUrl_index: options.remoteUrl,
      fileName: options.fileName,
      modelId: options.modelId,
      revision: options.revision,
      bytes: toArrayBuffer(options.bytes),
      contentType: options.contentType,
      updatedAt: new Date().toISOString(),
    },
    { cacheKey_index: options.cacheKey },
  );
};

export const clearBrowserPersistentCacheForTests = async (): Promise<void> => {
  if (providerPromise) {
    const provider = await providerPromise;
    await provider?.disconnect();
    providerPromise = null;
  }

  if (typeof indexedDB === "undefined") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(BROWSER_MODEL_CACHE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};

export const clearBrowserCacheApiForTests = async (): Promise<void> => {
  if (typeof caches === "undefined") {
    return;
  }

  await caches.delete(DEFAULT_TRANSFORMERS_CACHE_NAME);
};

export const deleteBrowserCacheApiFile = async (remoteUrl: string): Promise<boolean> => {
  if (typeof caches === "undefined") {
    return false;
  }

  const cache = await caches.open(DEFAULT_TRANSFORMERS_CACHE_NAME);
  return cache.delete(remoteUrl);
};

export const deleteBrowserPersistentCachedFile = async (cacheKey: string): Promise<boolean> => {
  const provider = await getProvider();
  if (!provider) {
    return false;
  }

  const existing = await provider.findOne<BrowserModelCacheRecord>(BROWSER_MODEL_CACHE_TABLE_NAME, {
    cacheKey_index: cacheKey,
  });

  if (!existing) {
    return false;
  }

  await provider.delete(BROWSER_MODEL_CACHE_TABLE_NAME, {
    cacheKey_index: cacheKey,
  });

  return true;
};
