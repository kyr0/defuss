import Dexie from "dexie";
import { DefussTable } from "defuss-db";
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

let table: DefussTable<KeyValue, DexieProviderOptions>;
let initPromise: Promise<void> | null = null;

async function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      await provider.connect();
      table = new DefussTable<KeyValue, DexieProviderOptions>(
        provider,
        "keyValues",
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
  const pk = await table.upsert({ key, value }, { key });
  return pk as number;
};
