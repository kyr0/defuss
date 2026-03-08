import Dexie from "dexie";
import { DefussTable } from "defuss-db";
import type { DefussRecord, RecordValue } from "defuss-db";
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

// -- DexieProvider demo: persist a persona record in IndexedDB --
interface DemoPersona extends DefussRecord {
  pk?: string | number;
  name: string;
  age: number;
  job: string;
  updatedAt: string;
  [key: string]: RecordValue | undefined;
}

export const demoDexie = async () => {
  try {
    const demoProvider = createProvider("PersonaFlowDemo");

    const demoTable = new DefussTable<DemoPersona, DexieProviderOptions>(
      demoProvider,
      "demo_personas",
    );
    await demoTable.init();

    const existing = await demoTable.findOne({ name: "Demo Persona" });

    if (existing) {
      console.log("[DexieProvider demo] Fetching from local DB:", existing);
      const newAge = new Date().getMinutes();
      await demoTable.update({ pk: existing.pk }, {
        age: newAge,
        updatedAt: new Date().toISOString(),
      } as Partial<DemoPersona>);
      const updated = await demoTable.findOne({ pk: existing.pk });
      console.log("[DexieProvider demo] Updated existing persona:", updated);
    } else {
      const pk = await demoTable.insert(
        {
          name: "Demo Persona",
          age: new Date().getMinutes(),
          job: "Researcher",
          updatedAt: new Date().toISOString(),
        } as DemoPersona,
        { name: true } as Record<string, boolean>,
      );
      const inserted = await demoTable.findOne({ pk });
      console.log(
        "[DexieProvider demo] Inserted new persona (pk=%s):",
        pk,
        inserted,
      );
    }
  } catch (err) {
    console.error("[DexieProvider demo] Error:", err);
  }
};
