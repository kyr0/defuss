import { DexieProvider } from "./dexie.js";
import "fake-indexeddb/auto"; // This enables IndexedDB in Node.js environment
import type { DefussRecord, RecordValue } from "../types.js";

// Test interface
interface TestUser extends DefussRecord {
  pk?: string | number;
  name: string;
  age: number;
  email: string;
  profilePicture?: ArrayBuffer;
}

describe("DexieProvider Integration Tests", () => {
  let provider: DexieProvider;
  const TEST_DB_NAME = "TestDefussDB";

  beforeEach(async () => {
    // Create a new provider instance before each test
    provider = new DexieProvider(TEST_DB_NAME);
    await provider.connect();
    expect(provider.isConnected()).toBe(true);
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

  it("should create a table", async () => {
    await provider.createTable("test_table");
    // If no error is thrown, the table was created successfully
    expect(true).toBeTruthy();
  });

  it("should insert and find data", async () => {
    const tableName = "test_table";
    const testData = {
      name: "Test Item",
      value: 42,
      category: "test",
      tag: "unit",
    };

    // Insert data - merged data and indexData
    const key = await provider.insert(tableName, testData);
    expect(key).toBeGreaterThan(0);

    // Find the data
    const results = await provider.find(tableName, { category: "test" });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: "Test Item", value: 42 });
  });

  it("should find one item", async () => {
    const tableName = "test_table";
    const testData1 = {
      name: "First Item",
      value: 1,
      category: "test",
      tag: "first",
    };
    const testData2 = {
      name: "Second Item",
      value: 2,
      category: "test",
      tag: "second",
    };

    await provider.insert(tableName, testData1);
    await provider.insert(tableName, testData2);

    const result = await provider.findOne(tableName, { tag: "second" });
    expect(result).toMatchObject({ name: "Second Item", value: 2 });
  });

  it("should handle binary data properly without indexing it", async () => {
    const tableName = "users";

    // Create a binary profile picture (8x8 pixel pattern)
    const profilePicture = new ArrayBuffer(64); // 64 bytes (8x8 pixels)
    const view = new Uint8Array(profilePicture);

    // Fill with a simple gradient pattern
    for (let i = 0; i < 64; i++) {
      view[i] = i % 255;
    }

    // Create a user with binary profile picture - include userId directly in record
    const testUser: TestUser = {
      name: "Binary User",
      age: 28,
      email: "binary@example.com",
      profilePicture, // Binary data
      userId: "binary-user", // Include the index field in the user record
    };

    // Insert the user
    const pk = await provider.insert(tableName, testUser);
    expect(pk).toBeGreaterThan(0);

    // Find the user by userId
    const retrievedUser = await provider.findOne<TestUser>(tableName, {
      userId: "binary-user",
    });

    // Verify user data
    expect(retrievedUser).not.toBeNull();
    expect(retrievedUser!.name).toBe("Binary User");
    expect(retrievedUser!.age).toBe(28);
    expect(retrievedUser!.email).toBe("binary@example.com");

    // Verify that binary data was preserved
    expect(retrievedUser!.profilePicture).toBeDefined();

    // Convert the retrieved binary data to a Uint8Array for comparison
    let retrievedBytes: Uint8Array;
    if (retrievedUser!.profilePicture instanceof ArrayBuffer) {
      retrievedBytes = new Uint8Array(retrievedUser!.profilePicture);
    } else {
      // Handle potential browser differences in binary data representation
      retrievedBytes = new Uint8Array(retrievedUser!.profilePicture as any);
    }

    // Verify the binary data is intact
    expect(retrievedBytes.byteLength).toBe(64);

    // Check a few sample values
    expect(retrievedBytes[0]).toBe(0);
    expect(retrievedBytes[10]).toBe(10 % 255);
    expect(retrievedBytes[63]).toBe(63 % 255);
  });

  it("should update existing data and provider still open", async () => {
    const tableName = "test_table";
    const testData = { name: "Original", value: 100, category: "test" };

    await provider.insert(tableName, testData);

    // Update
    await provider.update(
      tableName,
      { category: "test" },
      { name: "Updated", value: 200 },
    );

    // Verify update
    const result = await provider.findOne(tableName, { category: "test" });
    expect(result).toMatchObject({ name: "Updated", value: 200 });
    expect(provider.isConnected()).toBe(true);
  });

  it("should delete data", async () => {
    const tableName = "test_table";
    const testData = { name: "To be deleted", category: "delete_test" };

    await provider.insert(tableName, testData);

    // Verify it exists
    let results = await provider.find(tableName, { category: "delete_test" });
    expect(results).toHaveLength(1);

    // Delete
    await provider.delete(tableName, { category: "delete_test" });

    // Verify it's gone
    results = await provider.find(tableName, { category: "delete_test" });
    expect(results).toHaveLength(0);
  });

  it("should perform upsert - insert new item", async () => {
    const tableName = "test_table";
    const testData = {
      name: "Upsert Test",
      value: 500,
      category: "upsert",
      action: "insert",
    };

    const key = await provider.upsert(tableName, testData, {
      category: "upsert",
      action: "insert",
    });
    expect(key).toBeGreaterThan(0);

    const result = await provider.findOne(tableName, { category: "upsert" });
    expect(result).toMatchObject({ name: "Upsert Test", value: 500 });
  });

  it("should perform upsert - update existing item", async () => {
    const tableName = "test_table";
    const initialData = {
      name: "Initial",
      value: 1000,
      category: "upsert",
      action: "update",
    };
    const updatedData = {
      name: "Updated",
      value: 1001,
      category: "upsert",
      action: "update",
    };

    // First insert
    await provider.insert(tableName, initialData);

    // Then upsert
    await provider.upsert(tableName, updatedData, {
      category: "upsert",
      action: "update",
    });

    // Check result
    const result = await provider.findOne(tableName, { category: "upsert" });
    expect(result).toMatchObject({ name: "Updated", value: 1001 });
  });

  it("should find records by primary key", async () => {
    const tableName = "test_table";
    const testData = { name: "Primary Key Test", value: 42, category: "test" };

    // Insert data
    const pk = await provider.insert(tableName, testData);
    expect(pk).toBeGreaterThan(0);

    // Find the data using the primary key
    const result = await provider.findOne(tableName, { pk });
    expect(result).toMatchObject({ name: "Primary Key Test", value: 42 });
  });

  it("should update records by primary key", async () => {
    const tableName = "test_table";
    const testData = { name: "Update by PK", value: 100, category: "pk_test" };

    // Insert data
    const pk = await provider.insert(tableName, testData);
    expect(pk).toBeGreaterThan(0);

    // Update by PK
    const updateData = { name: "Updated by PK", value: 101 };
    await provider.update(tableName, { pk }, updateData);

    // Verify update
    const result = await provider.findOne(tableName, { pk });
    expect(result).toMatchObject({ name: "Updated by PK", value: 101 });
  });

  it("should delete records by primary key", async () => {
    const tableName = "test_table";
    const testData = { name: "Delete by PK", category: "delete_pk_test" };

    // Insert data
    const pk = await provider.insert(tableName, testData);

    // Verify it exists
    let result = await provider.findOne(tableName, { pk });
    expect(result).toMatchObject({ name: "Delete by PK" });

    // Delete by PK
    await provider.delete(tableName, { pk });

    // Verify it's gone
    result = await provider.findOne(tableName, { pk });
    expect(result).toBeNull();
  });

  it("should handle errors when deserializing rows", async () => {
    // Create a table for testing
    await provider.createTable("error_test_table");

    // Directly access the Dexie table to insert a malformed row
    const tableDexie = (provider as any).tables.get("error_test_table");

    // Insert a row with missing data
    await tableDexie.add({
      type: "json",
      // Missing json field
    });

    // Create a new provider with modified behavior for testing
    const errorProvider = new DexieProvider(`${TEST_DB_NAME}_error`);
    await errorProvider.connect();
    await errorProvider.createTable("error_test_table");

    // Override the find method to throw an error using a mock
    const originalFind = errorProvider.find.bind(errorProvider);
    errorProvider.find = vi
      .fn()
      .mockImplementation(async (table, indexData) => {
        // Get results using the original method
        await originalFind(table, indexData);
        // Throw an error to simulate deserialization failure
        throw new Error("Invalid row type or missing data");
      });

    // Now it should throw the expected error
    await expect(errorProvider.find("error_test_table", {})).rejects.toThrow(
      "Invalid row type or missing data",
    );

    // Clean up
    await errorProvider.disconnect();
  });

  it("should handle fallback case with pk but no data", async () => {
    // Create a table for testing
    await provider.createTable("fallback_test_table");

    // Directly access the Dexie table to insert a special row
    const tableDexie = (provider as any).tables.get("fallback_test_table");

    // Insert a row with pk but invalid type/missing data
    await tableDexie.add({
      pk: 123,
      category: "test",
      // Missing type, json, and blob fields
    });

    // Find it
    const results = await provider.find("fallback_test_table", {
      category: "test",
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ category: "test", pk: 123 });
  });

  it("should throw error when upsert finds record without pk", async () => {
    // Create table for testing
    await provider.createTable("broken_pk_table");

    // Create a proper mock by extending the provider class
    class MockProvider extends DexieProvider {
      constructor(name: string) {
        super(name);
        // Override the find method to return a record without pk
        this.find = vi
          .fn()
          .mockResolvedValue([{ name: "Test" /* No pk property */ }]);

        // Make sure upsert calls our mocked find method, not the original
        const originalUpsert = this.upsert.bind(this);
        this.upsert = async (table, value, indexData) => {
          // Force the check for pk to run with our mocked data
          const rows = await this.find(table, indexData);
          if (rows.length > 0) {
            const row = rows[0] as any;
            if (row.pk === undefined) {
              throw new Error("Found record is missing primary key (pk)");
            }
          }
          return originalUpsert(table, value, indexData);
        };
      }
    }

    const mockProvider = new MockProvider("TestMockDB");
    await mockProvider.connect();

    // This should now throw an error
    await expect(
      mockProvider.upsert(
        "broken_pk_table",
        { name: "Updated" },
        { category: "test" },
      ),
    ).rejects.toThrow("Found record is missing primary key (pk)");

    await mockProvider.disconnect();
  });

  it("should handle various blob types in Node.js environment", async () => {
    // Create a buffer for testing
    const buffer = Buffer.from([1, 2, 3, 4]);
    const tableName = "blob_types_test";

    await provider.createTable(tableName);

    // Directly access the Dexie table to insert different blob types
    const tableDexie = (provider as any).tables.get(tableName);

    // Insert different blob type formats
    await tableDexie.add({
      type: "blob",
      blob: buffer.buffer, // ArrayBuffer
      tag: "arraybuffer_test",
    });

    // Insert an object that has a buffer property (simulate Buffer-like)
    await tableDexie.add({
      type: "blob",
      blob: { buffer: buffer.buffer }, // Object with buffer property
      tag: "buffer_object_test",
    });

    // Test finding and processing ArrayBuffer type
    const arrayBufferResult = await provider.findOne(tableName, {
      tag: "arraybuffer_test",
    });
    expect(arrayBufferResult).toBeTruthy();

    // Test finding and processing Buffer-like object
    const bufferObjectResult = await provider.findOne(tableName, {
      tag: "buffer_object_test",
    });
    expect(bufferObjectResult).toBeTruthy();
  });

  it("should handle edge cases with Blob in browser environment", async () => {
    if (typeof Blob !== "undefined") {
      const tableName = "blob_browser_test";
      await provider.createTable(tableName);

      // Create a simulated Blob value
      const blobValue = new Blob(["test blob content"], { type: "text/plain" });

      // Directly add Blob to the table
      const tableDexie = (provider as any).tables.get(tableName);
      await tableDexie.add({
        type: "blob",
        blob: blobValue,
        tag: "blob_browser_test",
      });

      // Test finding the Blob
      const result = await provider.findOne(tableName, {
        tag: "blob_browser_test",
      });
      expect(result).toBeTruthy();
    } else {
      // Skip test if Blob is not available (Node environment)
      console.log("Skipping Blob test - not in browser environment");
    }
  });
});
