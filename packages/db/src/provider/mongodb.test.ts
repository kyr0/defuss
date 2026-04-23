import {
  MongoProvider,
  clearMongoConnections,
  type MongoProviderOptions,
} from "./mongodb.js";
import { getEnv } from "../env.js";
import { defineTable, type DefussRecord } from "../types.js";

interface TestUser extends DefussRecord {
  name: string;
  age: number;
  email: string;
  profile: {
    city: string;
  };
}

const tableDefinition = defineTable<TestUser>({
  name: "mongo_users_v2",
  indexes: [
    { name: "email", source: "email", unique: true },
    { name: "city", source: "profile.city" },
  ],
});

describe("MongoProvider", () => {
  let provider: MongoProvider;
  let options: MongoProviderOptions;

  beforeAll(() => {
    clearMongoConnections();
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    options = {
      connectionString,
      databaseName: "test_db",
    };
  });

  beforeEach(async () => {
    if (!options.connectionString) {
      return;
    }

    provider = new MongoProvider(options);
    await provider.connect(options);
    await provider.ensureTable(tableDefinition);
    if (provider.db) {
      await provider.db.collection(tableDefinition.name).deleteMany({});
    }
  });

  afterEach(async () => {
    if (!provider) {
      return;
    }

    if (provider.db) {
      await provider.db.collection(tableDefinition.name).deleteMany({});
    }
    await provider.disconnect();
    clearMongoConnections();
  });

  it("creates the declared collection", async () => {
    if (!options.connectionString) {
      return;
    }

    expect(provider.collections.has(tableDefinition.name)).toBe(true);
  });

  it("inserts and finds records by declared and undeclared selectors", async () => {
    if (!options.connectionString) {
      return;
    }

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

  it("rejects empty ids", async () => {
    if (!options.connectionString) {
      return;
    }

    await expect(
      provider.insert(tableDefinition, {
        id: "",
        name: "Invalid",
        age: 1,
        email: "invalid@example.com",
        profile: { city: "Nowhere" },
      }),
    ).rejects.toThrow();
  });

  it("updates and deletes by id", async () => {
    if (!options.connectionString) {
      return;
    }

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
    if (!options.connectionString) {
      return;
    }

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