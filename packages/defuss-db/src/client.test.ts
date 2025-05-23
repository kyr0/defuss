import {
  DexieProvider,
  DefussTable,
  type DexieProviderOptions,
} from "./client.js";
import type { DefussRecord, RecordValue } from "./types.js"; // Import required types
import "fake-indexeddb/auto"; // This enables IndexedDB in Node.js environment

interface TestUser extends DefussRecord {
  pk?: string | number;
  name: string;
  age: number;
  email: string;
  [key: string]: RecordValue | undefined; // Add the index signature to satisfy DefussRecord constraint
}

describe("Test the client-side database implementation of defuss-db using the DexieProvider and DefussTable", () => {
  let provider: DexieProvider;
  const TEST_DB_NAME = "TestDefussDB";
  const TEST_TABLE_NAME = "test_table";
  let table: DefussTable<TestUser, DexieProviderOptions>;

  beforeEach(async () => {
    // Create a new provider instance before each test
    provider = new DexieProvider(TEST_DB_NAME);
    await provider.connect();

    // Create a new DefussTable instance before each test
    table = new DefussTable(provider, TEST_TABLE_NAME);
    await table.init();
  });

  afterEach(async () => {
    // Clean up after each test
    await provider.disconnect();
    // Force delete the database - use indexedDB global from fake-indexeddb
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(TEST_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });

  it("should connect to the database", async () => {
    expect(provider).toBeDefined();
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
    // Use expect.objectContaining to check for user properties without being strict about the pk
    expect(results[0]).toEqual(expect.objectContaining(user));
    // But also verify that pk exists and matches the returned value
    expect(results[0].pk).toBe(pk);
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
    expect(result?.pk).toBe(pk);
  });

  it("should upsert an existing record", async () => {
    const user: TestUser = { name: "Jack", age: 33, email: "jack@example.com" };
    const pk = await table.insert(user, { email: user.email });

    const updatedUser: TestUser = {
      name: "Jack",
      age: 34,
      email: "jack@example.com",
    };
    const updatedPk = await table.upsert(updatedUser, {
      email: updatedUser.email,
    });
    expect(updatedPk).toBe(pk); // Should be the same PK

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

  // Tests for working with PKs

  it("should update a record using its PK", async () => {
    const user: TestUser = { name: "Lucy", age: 29, email: "lucy@example.com" };
    // Get the PK from the insert operation
    const pk = await table.insert(user, { email: user.email });

    // Use the PK directly for the update operation
    await table.update({ pk }, { age: 30 });

    // Verify the update worked
    const updatedUser = await table.findOne({ pk });
    expect(updatedUser).toEqual(
      expect.objectContaining({
        ...user,
        age: 30,
      }),
    );
    expect(updatedUser?.pk).toBe(pk);
  });

  it("should find a record using its PK", async () => {
    const user: TestUser = { name: "Mike", age: 42, email: "mike@example.com" };
    const pk = await table.insert(user, { email: user.email });

    // Find by PK
    const result = await table.findOne({ pk });
    expect(result).toEqual(expect.objectContaining(user));
    expect(result?.pk).toBe(pk);
  });

  it("should delete a record using its PK", async () => {
    const user: TestUser = {
      name: "Nancy",
      age: 37,
      email: "nancy@example.com",
    };
    const pk = await table.insert(user, { email: user.email });

    // Delete by PK
    await table.delete({ pk });

    // Verify the record is gone
    const result = await table.findOne({ pk });
    expect(result).toBeNull();

    // Also verify it's not findable by other indices
    const resultByEmail = await table.findOne({ email: user.email });
    expect(resultByEmail).toBeNull();
  });

  it("should update a record with multiple properties using PK", async () => {
    const user: TestUser = {
      name: "Oscar",
      age: 31,
      email: "oscar@example.com",
    };
    const pk = await table.insert(user, { email: user.email });

    console.log("Inserted user with PK:", pk);

    // Update multiple properties at once using the PK
    const updates = {
      name: "Oscar Updated",
      age: 32,
    };
    await table.update({ pk }, updates);

    // Verify all properties were updated
    const updatedUser = await table.findOne({ pk });
    expect(updatedUser).toEqual(
      expect.objectContaining({
        ...user,
        ...updates,
      }),
    );
    expect(updatedUser?.pk).toBe(pk);
  });
});
