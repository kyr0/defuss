/**
 * @vitest-environment happy-dom
 */
import { webstorage } from "../webstorage/index.js";
import { createStore, deepEquals } from "./store.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PersistenceProviderType } from "../webstorage/index.js";

// Mock the webstorage module
vi.mock("../webstorage/index.js", () => {
  // Create storage objects for each type
  const storages: Record<string, Map<string, unknown>> = {
    memory: new Map<string, unknown>(),
    local: new Map<string, unknown>(),
    session: new Map<string, unknown>(),
  };

  return {
    webstorage: vi.fn(<T>(type: PersistenceProviderType = "memory") => {
      const storage = storages[type as string] || storages.memory;

      return {
        get: <V = T>(key: string, defaultValue: V): V => {
          return storage.has(key)
            ? (JSON.parse(JSON.stringify(storage.get(key))) as V)
            : defaultValue;
        },
        set: <V = T>(key: string, value: V): V => {
          storage.set(key, JSON.parse(JSON.stringify(value)));
          return value;
        },
        remove: (key: string): void => {
          storage.delete(key);
        },
        removeAll: (): void => {
          storage.clear();
        },
        backendApi: {},
      };
    }),
  };
});

describe("Store", () => {
  beforeEach(() => {
    // Clear any storage before each test
    const memStorage = webstorage("memory");
    const localStorage = webstorage("local");
    const sessionStorage = webstorage("session");

    memStorage.removeAll();
    localStorage.removeAll();
    sessionStorage.removeAll();

    // Reset the webstorage mock
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("creates a store with initial value", () => {
      const initialValue = { count: 0, user: { name: "John" } };
      const store = createStore(initialValue);

      expect(store.value).toEqual(initialValue);
    });

    it("gets the entire store value when no path is provided", () => {
      const store = createStore({ count: 0, user: { name: "John" } });

      expect(store.get()).toEqual({ count: 0, user: { name: "John" } });
    });

    it("gets a value from a nested path", () => {
      const store = createStore({ count: 0, user: { name: "John" } });

      expect(store.get("user.name")).toBe("John");
    });

    it("updates the entire store value", () => {
      const store = createStore({ count: 0, user: { name: "John" } });
      const newValue = { count: 1, user: { name: "Jane" } };

      store.set(newValue);

      expect(store.value).toEqual(newValue);
    });

    it("updates a value at a specific path", () => {
      const store = createStore({ count: 0, user: { name: "John" } });

      store.set("user.name", "Jane");

      expect(store.get("user.name")).toBe("Jane");
      expect(store.value).toEqual({ count: 0, user: { name: "Jane" } });
    });

    it("doesn't notify listeners when setting the same value (deep equality opt-in)", () => {
      const store = createStore({ count: 0 }, { equals: deepEquals });
      const listener = vi.fn();

      store.subscribe(listener);
      store.set({ count: 0 });

      expect(listener).not.toHaveBeenCalled();
    });

    it("notifies listeners when setting the same value but new reference (default shallow)", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.set({ count: 0 });

      // Default is shallow, so new object reference trigger updates
      expect(listener).toHaveBeenCalled();
    });
  });

  describe("Subscription", () => {
    it("notifies listeners when value changes", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.set({ count: 1 });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        { count: 1 },
        { count: 0 },
        undefined,
      );
    });

    it("notifies listeners with changed path when setting a nested value", () => {
      const store = createStore({ count: 0, user: { name: "John" } });
      const listener = vi.fn();

      store.subscribe(listener);
      store.set("user.name", "Jane");

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        { count: 0, user: { name: "Jane" } },
        { count: 0, user: { name: "John" } },
        "user.name",
      );
    });

    it("unsubscribes listeners correctly", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.set({ count: 1 });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Persistence", () => {
    it("persists data to memory storage using persist method", () => {
      const store = createStore({ count: 0 });
      store.persist("test-store", "memory");

      // Verify data was persisted correctly
      const memStorage = webstorage<{ count: number }>("memory");
      expect(
        memStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 0 });

      // Change store value and verify it updates in storage
      store.set({ count: 5 });
      expect(
        memStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 5 });
    });

    it("persists data to local storage using persist method", () => {
      const store = createStore({ count: 0 });
      store.persist("test-store", "local");

      // Verify data was persisted correctly
      const localStorage = webstorage<{ count: number }>("local");
      expect(
        localStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 0 });

      // Change store value and verify it updates in storage
      store.set({ count: 5 });
      expect(
        localStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 5 });
    });

    it("persists data to session storage using persist method", () => {
      const store = createStore({ count: 0 });
      store.persist("test-store", "session");

      // Verify data was persisted correctly
      const sessionStorage = webstorage<{ count: number }>("session");
      expect(
        sessionStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 0 });

      // Change store value and verify it updates in storage
      store.set({ count: 5 });
      expect(
        sessionStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 5 });
    });

    it("uses local storage as the default when not specified", () => {
      const store = createStore({ count: 0 });
      store.persist("test-store");

      // Verify data was persisted to local storage
      const localStorage = webstorage<{ count: number }>("local");
      expect(
        localStorage.get("test-store", {
          count: 0,
        }),
      ).toEqual({ count: 0 });
    });

    it("automatically persists path-based updates to storage", () => {
      const store = createStore({ user: { name: "John", age: 30 } });
      store.persist("user-store", "memory");

      // Update a nested path
      store.set("user.name", "Jane");

      // Verify the entire object was persisted with the update
      const memStorage = webstorage<{ user: { name: string; age: number } }>(
        "memory",
      );
      expect(
        memStorage.get("user-store", {
          user: { name: "John", age: 0 },
        }),
      ).toEqual({
        user: { name: "Jane", age: 30 },
      });
    });
  });

  describe("Restore", () => {
    it("restores data from memory storage using restore method", () => {
      // Setup initial data in storage
      const memStorage = webstorage<{ count: number }>("memory");
      memStorage.set("test-store", { count: 42 });

      // Create a new store with different initial value
      const store = createStore({ count: 0 });

      // Restore from storage
      store.restore("test-store", "memory");

      // Verify store now has the value from storage
      expect(store.value).toEqual({ count: 42 });
    });

    it("restores data from local storage using restore method", () => {
      // Setup initial data in storage
      const localStorage = webstorage<{ count: number }>("local");
      localStorage.set("test-store", { count: 42 });

      // Create a new store with different initial value
      const store = createStore({ count: 0 });

      // Restore from storage
      store.restore("test-store", "local");

      // Verify store now has the value from storage
      expect(store.value).toEqual({ count: 42 });
    });

    it("restores data from session storage using restore method", () => {
      // Setup initial data in storage
      const sessionStorage = webstorage<{ count: number }>("session");
      sessionStorage.set("test-store", { count: 42 });

      // Create a new store with different initial value
      const store = createStore({ count: 0 });

      // Restore from storage
      store.restore("test-store", "session");

      // Verify store now has the value from storage
      expect(store.value).toEqual({ count: 42 });
    });

    it("uses local storage as the default when not specified for restore", () => {
      // Setup initial data in local storage
      const localStorage = webstorage<{ count: number }>("local");
      localStorage.set("test-store", { count: 42 });

      // Create a new store with different initial value
      const store = createStore({ count: 0 });

      // Restore from storage (without specifying provider)
      store.restore("test-store");

      // Verify store now has the value from local storage
      expect(store.value).toEqual({ count: 42 });
    });

    it("preserves the initial value when no data exists in storage", () => {
      const initialValue = { count: 99 };
      const store = createStore(initialValue);

      // Try to restore from a key that doesn't exist
      store.restore("non-existent-key", "memory");

      // Verify store still has the initial value
      expect(store.value).toEqual(initialValue);
    });
  });

  describe("Persistence and Restore workflow", () => {
    it("completes a full persist-modify-restore cycle", () => {
      // Create and persist initial store
      const store1 = createStore({ count: 10 });
      store1.persist("workflow-test", "memory");

      // Modify the value
      store1.set({ count: 20 });

      // Create a new store instance
      const store2 = createStore({ count: 0 });

      // Restore from the same storage location
      store2.restore("workflow-test", "memory");

      // Verify the second store has the updated value
      expect(store2.value).toEqual({ count: 20 });
    });

    it("persists to one storage type and restores from the same", () => {
      // Test with all storage types
      ["memory", "local", "session"].forEach((storageType) => {
        // Create and persist initial store
        const store1 = createStore({ count: 10 });
        store1.persist("cycle-test", storageType as any);

        // Modify the value
        store1.set({ count: 25 });

        // Create a new store instance
        const store2 = createStore({ count: 0 });

        // Restore from the same storage location
        store2.restore("cycle-test", storageType as any);

        // Verify the second store has the updated value
        expect(store2.value).toEqual({ count: 25 });
      });
    });

    it("notifies subscribers after restore", () => {
      // Setup initial data in storage
      const memStorage = webstorage<{ count: number }>("memory");
      memStorage.set("listener-test", { count: 50 });

      // Create store with listener
      const store = createStore({ count: 0 });
      const listener = vi.fn();
      store.subscribe(listener);

      // Restore from storage
      store.restore("listener-test", "memory");

      // Verify listener was called with correct values
      expect(listener).toHaveBeenCalledTimes(1);
      // oldValue is { count: 0 } (the initial store value), newValue is { count: 50 } (from storage)
      expect(listener).toHaveBeenCalledWith(
        { count: 50 },
        { count: 0 },
        undefined,
      );
    });
  });

  it("can initStorage without value and storageProvider === provider (", () => {
    const store = createStore({ count: 0 });
    store.set("count", 1);
    store.persist("test-store", "memory");
    store.persist("test-store", "memory");

    expect(store.get("count")).toBeDefined();
    expect(store.get("count")).toEqual(1);
  });
});
