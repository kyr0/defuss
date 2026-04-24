import { DefussTable, defineTable, type DefussRecord } from "defuss-db";

const SILERO_CACHE_TABLE_NAME = "silero_assets";

interface SileroAssetCacheRecord extends DefussRecord {
  cacheKey: string;
  assetUrl: string;
  bytes: ArrayBuffer;
  contentType: string | null;
  updatedAt: string;
}

const sileroCacheTable = defineTable<SileroAssetCacheRecord>({
  name: SILERO_CACHE_TABLE_NAME,
  indexes: [
    {
      name: "cacheKey",
      source: "cacheKey",
      unique: true,
    },
    {
      name: "assetUrl",
      source: "assetUrl",
    },
  ],
});

const providerPromises = new Map<
  string,
  Promise<DefussTable<SileroAssetCacheRecord, object> | null>
>();

function isNodeRuntime(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    process.versions?.node != null
  );
}

async function getBrowserCacheProvider(
  databaseName: string,
): Promise<DefussTable<SileroAssetCacheRecord, object> | null> {
  if (isNodeRuntime() || typeof indexedDB === "undefined") {
    return null;
  }

  const existing = providerPromises.get(databaseName);
  if (existing) {
    return existing;
  }

  const next = (async (): Promise<DefussTable<SileroAssetCacheRecord, object> | null> => {
    const { DexieProvider } = await import("defuss-db/client.js");
    const provider = new DexieProvider(databaseName) as any;
    await provider.connect();
    const table = new DefussTable(provider, sileroCacheTable);
    await table.init();
    return table;
  })();

  providerPromises.set(databaseName, next);
  return next;
}

export async function readBrowserCachedSileroAsset(options: {
  databaseName: string;
  cacheKey: string;
}): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  const provider = await getBrowserCacheProvider(options.databaseName);
  if (!provider) {
    return null;
  }

  const record = await provider.findOne({ cacheKey: options.cacheKey });

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
}

export async function writeBrowserCachedSileroAsset(options: {
  databaseName: string;
  cacheKey: string;
  assetUrl: string;
  bytes: Uint8Array;
  contentType: string | null;
}): Promise<void> {
  const provider = await getBrowserCacheProvider(options.databaseName);
  if (!provider) {
    return;
  }

  await provider.upsert(
    { cacheKey: options.cacheKey },
    {
      cacheKey: options.cacheKey,
      assetUrl: options.assetUrl,
      bytes: toArrayBuffer(options.bytes),
      contentType: options.contentType,
      updatedAt: new Date().toISOString(),
    },
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).slice().buffer;
}

function toUint8Array(value: unknown): Uint8Array | null {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value.slice(0));
  }

  if (ArrayBuffer.isView(value) && value.buffer instanceof ArrayBuffer) {
    return new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
    );
  }

  return null;
}
