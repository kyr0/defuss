import "fake-indexeddb/auto";
import { DexieProvider } from "./dexie.js";
import { defineTable, type DefussRecord } from "../types.js";

interface TestUser extends DefussRecord {
  name: string;
  age: number;
  email: string;
  profile: {
    city: string;
  };
  avatar?: ArrayBuffer;
}

const tableDefinition = defineTable<TestUser>({
  name: "dexie_users_v2",
  indexes: [
    { name: "email", source: "email", unique: true },
    { name: "city", source: "profile.city" },
  ],
});

describe("DexieProvider", () => {
  let provider: DexieProvider;
  const databaseName = "DefussDbDexieProviderV2";

  beforeEach(async () => {
    provider = new DexieProvider(databaseName);
    await provider.connect();
    await provider.ensureTable(tableDefinition);
  });

  afterEach(async () => {
    await provider.disconnect();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it("creates the declared table", () => {
    expect(provider.tables.has(tableDefinition.name)).toBe(true);
  });

  it("inserts and finds records by declared and undeclared selectors", async () => {
    const insertedId = await provider.insert(tableDefinition, {
      name: "Alice",
      age: 30,
      email: "alice@example.com",
      profile: { city: "Berlin" },
    });

    const byEmail = await provider.findOne(tableDefinition, { email: "alice@example.com" });
    const byName = await provider.findOne(tableDefinition, { name: "Alice" });

    expect(byEmail?.id).toBe(insertedId);
    expect(byName?.email).toBe("alice@example.com");
  });

  it("preserves array buffers", async () => {
    const bytes = new Uint8Array(new ArrayBuffer(8));
    bytes[4] = 22;

    await provider.insert(tableDefinition, {
      name: "Binary",
      age: 31,
      email: "binary@example.com",
      profile: { city: "Hamburg" },
      avatar: bytes.buffer.slice(0),
    });

    const record = await provider.findOne(tableDefinition, { email: "binary@example.com" });
    expect(record?.avatar).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(record!.avatar as ArrayBuffer)[4]).toBe(22);
  });

  it("updates and deletes by id", async () => {
    const insertedId = await provider.insert(tableDefinition, {
      name: "Carla",
      age: 24,
      email: "carla@example.com",
      profile: { city: "Munich" },
    });

    await provider.update(tableDefinition, { id: insertedId }, { age: 25 });
    const updated = await provider.findOne(tableDefinition, { id: insertedId });
    expect(updated?.age).toBe(25);

    await provider.delete(tableDefinition, { id: insertedId });
    const deleted = await provider.findOne(tableDefinition, { id: insertedId });
    expect(deleted).toBeNull();
  });

  it("upserts on a unique selector without changing id", async () => {
    const insertedId = await provider.insert(tableDefinition, {
      name: "David",
      age: 42,
      email: "david@example.com",
      profile: { city: "Leipzig" },
    });

    const upsertedId = await provider.upsert(
      tableDefinition,
      { email: "david@example.com" },
      {
        name: "David",
        age: 43,
        email: "david@example.com",
        profile: { city: "Leipzig" },
      },
    );

    const updated = await provider.findOne(tableDefinition, { email: "david@example.com" });
    expect(upsertedId).toBe(insertedId);
    expect(updated?.id).toBe(insertedId);
    expect(updated?.age).toBe(43);
  });
});