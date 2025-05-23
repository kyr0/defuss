import {
  MongoProvider,
  DefussTable,
  type MongoProviderOptions,
  LibsqlProvider,
  type LibsqlProviderOptions,
} from "./server.js";
import { getEnv } from "./env.js";
import type { DefussRecord, RecordValue } from "./types.js"; // Import required types

interface TestUser extends DefussRecord {
  // Extend DefussRecord
  pk?: string | number;
  name: string;
  age: number;
  email: string;
  [key: string]: RecordValue | undefined; // Add the index signature
}

describe("Test the server-side database implementations of defuss-db using the MongoProvider and DefussTable", () => {
  let provider: MongoProvider;
  const TEST_TABLE_NAME = "test_users_mongo";
  let table: DefussTable<TestUser, MongoProviderOptions>;
  let options: MongoProviderOptions;

  beforeAll(async () => {
    // Get MongoDB connection string from environment
    const connectionString = getEnv("MONGO_CONNECTION_STRING");

    // Skip tests if no connection string is provided
    if (!connectionString) {
      console.warn(
        "Skipping MongoDB tests: No MONGO_CONNECTION_STRING provided in environment",
      );
      return;
    }

    options = {
      connectionString,
      databaseName: "test_db",
    };
  });

  beforeEach(async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      return;
    }

    // Create a new provider instance before each test
    provider = new MongoProvider(options);
    await provider.connect();

    // Create a new DefussTable instance before each test
    table = new DefussTable(provider, TEST_TABLE_NAME);
    await table.init();

    // Clean up any existing data
    if (provider.collections.has(TEST_TABLE_NAME)) {
      await provider.collections.get(TEST_TABLE_NAME)!.deleteMany({});
    }
  });

  afterEach(async () => {
    // Skip cleanup if no connection was established
    if (!provider) return;

    // Clean up after each test
    if (provider.collections.has(TEST_TABLE_NAME)) {
      await provider.collections.get(TEST_TABLE_NAME)!.deleteMany({});
    }
    await provider.disconnect();
  });

  it("should connect to MongoDB", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    expect(provider).toBeDefined();
    expect(provider.client).not.toBeNull();
    expect(provider.db).not.toBeNull();
  });

  it("should insert a record and retrieve it by index", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user: TestUser = {
      name: "Alice",
      age: 30,
      email: "alice@example.com",
    };
    const indexData = { email: user.email };

    const pk = await table.insert(user, indexData);
    expect(pk).toBeDefined();

    const results = await table.find({ email: "alice@example.com" });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining(user));
  });

  it("should find one record by index", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user1: TestUser = { name: "Bob", age: 25, email: "bob@example.com" };
    const user2: TestUser = {
      name: "Charlie",
      age: 35,
      email: "charlie@example.com",
    };

    await table.insert(user1, { email: user1.email });
    await table.insert(user2, { email: user2.email });

    const result = await table.findOne({ email: "bob@example.com" });
    expect(result).toEqual(expect.objectContaining(user1));
  });

  it("should return null when finding a non-existent record", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const result = await table.findOne({ email: "nonexistent@example.com" });
    expect(result).toBeNull();
  });

  it("should find multiple records using partial index data", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user1: TestUser = {
      name: "David",
      age: 30,
      email: "david@example.com",
    };
    const user2: TestUser = {
      name: "Emma",
      age: 30,
      email: "emma@example.com",
    };
    const user3: TestUser = {
      name: "Frank",
      age: 40,
      email: "frank@example.com",
    };

    await table.insert(user1, { email: user1.email, age: user1.age });
    await table.insert(user2, { email: user2.email, age: user2.age });
    await table.insert(user3, { email: user3.email, age: user3.age });

    const results = await table.find({ age: 30 });
    expect(results).toHaveLength(2);

    // Check that both user1 and user2 are in the results by their identifying properties
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: user1.name, email: user1.email }),
        expect.objectContaining({ name: user2.name, email: user2.email }),
      ]),
    );
  });

  it("should update a record by index", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user: TestUser = {
      name: "Grace",
      age: 28,
      email: "grace@example.com",
    };
    await table.insert(user, { email: user.email });

    await table.update({ email: user.email }, { age: 29 });

    const updatedUser = await table.findOne({ email: user.email });
    expect(updatedUser).toEqual(
      expect.objectContaining({
        ...user,
        age: 29,
      }),
    );
  });

  it("should delete a record by index", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user: TestUser = {
      name: "Henry",
      age: 32,
      email: "henry@example.com",
    };
    await table.insert(user, { email: user.email });

    await table.delete({ email: user.email });

    const result = await table.findOne({ email: user.email });
    expect(result).toBeNull();
  });

  it("should upsert a new record", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user: TestUser = {
      name: "Isabel",
      age: 27,
      email: "isabel@example.com",
    };

    const pk = await table.upsert(user, { email: user.email });
    expect(pk).toBeDefined();

    const result = await table.findOne({ email: user.email });
    expect(result).toEqual(expect.objectContaining(user));
  });

  it("should upsert an existing record", async () => {
    // Skip if no connection string is provided
    const connectionString = getEnv("MONGO_CONNECTION_STRING");
    if (!connectionString) {
      console.warn("Skipping test: No MONGO_CONNECTION_STRING provided");
      return;
    }

    const user: TestUser = { name: "Jack", age: 33, email: "jack@example.com" };
    await table.insert(user, { email: user.email });

    const updatedUser: TestUser = {
      name: "Jack",
      age: 34,
      email: "jack@example.com",
    };
    await table.upsert(updatedUser, { email: updatedUser.email });

    const result = await table.findOne({ email: user.email });
    expect(result).toEqual(expect.objectContaining(updatedUser));
  });
});

describe("Test the server-side database implementations of defuss-db using the LibsqlProvider and DefussTable", () => {
  let provider: LibsqlProvider;
  const TEST_TABLE_NAME = "test_users_libsql";
  let table: DefussTable<TestUser, LibsqlProviderOptions>;

  beforeEach(async () => {
    // Create a new provider instance before each test with in-memory database
    provider = new LibsqlProvider();
    await provider.connect({ url: ":memory:" });

    // Create a new DefussTable instance before each test
    table = new DefussTable(provider, TEST_TABLE_NAME);
    await table.init();
  });

  afterEach(async () => {
    // Clean up after each test
    if (provider) {
      await provider.disconnect();
    }
  });

  it("should connect to LibSQL", async () => {
    expect(provider).toBeDefined();
    expect(provider.db).toBeDefined();
  });

  it("should insert a record and retrieve it by index", async () => {
    const user: TestUser = {
      name: "Alice",
      age: 30,
      email: "alice@example.com",
    };
    const indexData = { email: user.email };

    const pk = await table.insert(user, indexData);
    expect(pk).toBeDefined();

    const results = await table.find({ email: "alice@example.com" });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining(user));
  });

  it("should find one record by index", async () => {
    const user1: TestUser = { name: "Bob", age: 25, email: "bob@example.com" };
    const user2: TestUser = {
      name: "Charlie",
      age: 35,
      email: "charlie@example.com",
    };

    await table.insert(user1, { email: user1.email });
    await table.insert(user2, { email: user2.email });

    const result = await table.findOne({ email: "bob@example.com" });
    expect(result).toEqual(expect.objectContaining(user1));
  });

  it("should return null when finding a non-existent record", async () => {
    const result = await table.findOne({ email: "nonexistent@example.com" });
    expect(result).toBeNull();
  });

  it("should find multiple records using partial index data", async () => {
    const user1: TestUser = {
      name: "David",
      age: 30,
      email: "david@example.com",
    };
    const user2: TestUser = {
      name: "Emma",
      age: 30,
      email: "emma@example.com",
    };
    const user3: TestUser = {
      name: "Frank",
      age: 40,
      email: "frank@example.com",
    };

    await table.insert(user1, { email: user1.email, age: user1.age });
    await table.insert(user2, { email: user2.email, age: user2.age });
    await table.insert(user3, { email: user3.email, age: user3.age });

    const results = await table.find({ age: 30 });
    expect(results).toHaveLength(2);

    // Check that both user1 and user2 are in the results by their identifying properties
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: user1.name, email: user1.email }),
        expect.objectContaining({ name: user2.name, email: user2.email }),
      ]),
    );
  });

  it("should update a record by index", async () => {
    const user: TestUser = {
      name: "Grace",
      age: 28,
      email: "grace@example.com",
    };
    await table.insert(user, { email: user.email });

    await table.update({ email: user.email }, { age: 29 });

    const updatedUser = await table.findOne({ email: user.email });
    expect(updatedUser).toEqual(
      expect.objectContaining({
        ...user,
        age: 29,
      }),
    );
  });

  it("should delete a record by index", async () => {
    const user: TestUser = {
      name: "Henry",
      age: 32,
      email: "henry@example.com",
    };
    await table.insert(user, { email: user.email });

    await table.delete({ email: user.email });

    const result = await table.findOne({ email: user.email });
    expect(result).toBeNull();
  });

  it("should upsert a new record", async () => {
    const user: TestUser = {
      name: "Isabel",
      age: 27,
      email: "isabel@example.com",
    };

    const pk = await table.upsert(user, { email: user.email });
    expect(pk).toBeDefined();

    const result = await table.findOne({ email: user.email });
    expect(result).toEqual(expect.objectContaining(user));
  });

  it("should upsert an existing record", async () => {
    const user: TestUser = { name: "Jack", age: 33, email: "jack@example.com" };
    await table.insert(user, { email: user.email });

    const updatedUser: TestUser = {
      name: "Jack",
      age: 34,
      email: "jack@example.com",
    };
    await table.upsert(updatedUser, { email: updatedUser.email });

    const result = await table.findOne({ email: user.email });
    expect(result).toEqual(expect.objectContaining(updatedUser));
  });

  it("should handle multiple indices when inserting", async () => {
    const user: TestUser = {
      name: "Kelly",
      age: 41,
      email: "kelly@example.com",
    };
    await table.insert(user, { email: user.email, name: user.name });

    const resultByEmail = await table.findOne({ email: user.email });
    expect(resultByEmail).toEqual(expect.objectContaining(user));

    const resultByName = await table.findOne({ name: user.name });
    expect(resultByName).toEqual(expect.objectContaining(user));
  });
});
