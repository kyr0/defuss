import Dexie from "dexie";
import { DefussTable, defineTable } from "defuss-db";
import { DexieProvider, type DexieProviderOptions } from "defuss-db/client.js";

// Service workers forbid dynamic import(); pre-initialize Dexie statically
// so that DexieProvider.connect() short-circuits (sees db + isOpen already set).
function createProvider(name: string): DexieProvider {
  const p = new DexieProvider(name);
  p.db = new Dexie(name) as any;
  p.isOpen = true;
  return p;
}

const provider = createProvider("WorkerDatabase");

export interface KeyValue {
  [key: string]: string;
}

const keyValueTable = defineTable<KeyValue>({
  name: "keyValues",
  indexes: [
    {
      name: "key",
      source: "key",
      unique: true,
    },
  ],
});

let table: DefussTable<KeyValue, DexieProviderOptions>;
let initPromise: Promise<void> | null = null;

async function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      await provider.connect();
      table = new DefussTable<KeyValue, DexieProviderOptions>(
        provider,
        keyValueTable,
      );
      await table.init();
    })();
  }
  return initPromise;
}

export const dbGetValue = async (key: string): Promise<string | undefined> => {
  await ensureInit();
  const record = await table.findOne({ key });
  return record?.value;
};

export const dbSetValue = async (
  key: string,
  value: string,
): Promise<number> => {
  await ensureInit();
  const id = await table.upsert({ key }, { key, value });
  return id as number;
};
