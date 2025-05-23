// @vitest-environment happy-dom
import { createRef, isRef } from "./ref.js";
import { webstorage } from "../webstorage/index.js";
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

describe("Ref tests", () => {
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
    it("creates a ref with null current property", () => {
      const ref = createRef();
      expect(ref.current).toBeNull();
    });

    it("creates a ref with specified default state", () => {
      const defaultState = { count: 0, name: "John" };
      const ref = createRef(undefined, defaultState);
      expect(ref.state).toEqual(defaultState);
    });

    it("identifies ref objects correctly with isRef", () => {
      const ref = createRef();
      const notRef = { something: "else" };

      expect(isRef(ref)).toBe(true);
      expect(isRef(notRef)).toBe(false);
      expect(isRef(null)).toBe(false);
      expect(isRef(undefined)).toBe(false);
    });

    it("updates state via state setter", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      ref.state = { count: 1 };
      expect(ref.state).toEqual({ count: 1 });
    });

    it("updates state via updateState method", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      ref.updateState({ count: 2 });
      expect(ref.state).toEqual({ count: 2 });
    });
  });

  describe("Subscription", () => {
    it("calls refUpdateFn when state changes", () => {
      const refUpdateFn = vi.fn();
      const ref = createRef(refUpdateFn, { count: 0 });

      ref.updateState({ count: 1 });

      expect(refUpdateFn).toHaveBeenCalledOnce();
      expect(refUpdateFn).toHaveBeenCalledWith(
        { count: 1 },
        { count: 0 },
        undefined,
      );
    });

    it("subscribes to state changes after creation", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      const refUpdateFn = vi.fn();

      ref.subscribe(refUpdateFn);
      ref.updateState({ count: 1 });

      expect(refUpdateFn).toHaveBeenCalledOnce();
    });

    it("unsubscribes from state changes correctly", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      const refUpdateFn = vi.fn();

      const unsubscribe = ref.subscribe(refUpdateFn);
      unsubscribe();
      ref.updateState({ count: 1 });

      expect(refUpdateFn).not.toHaveBeenCalled();
    });
  });

  describe("Persistence", () => {
    it("persists state to memory storage", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      ref.persist("test-ref", "memory");

      // Verify state was persisted
      const memStorage = webstorage<{ count: number }>("memory");
      expect(memStorage.get("test-ref", { count: -1 })).toEqual({ count: 0 });

      // Change state and verify it updates in storage
      ref.updateState({ count: 5 });
      expect(memStorage.get("test-ref", { count: -1 })).toEqual({ count: 5 });
    });

    it("persists state to local storage", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      ref.persist("test-ref", "local");

      // Verify state was persisted
      const localStorage = webstorage<{ count: number }>("local");
      expect(localStorage.get("test-ref", { count: -1 })).toEqual({ count: 0 });

      // Change state and verify it updates in storage
      ref.updateState({ count: 5 });
      expect(localStorage.get("test-ref", { count: -1 })).toEqual({ count: 5 });
    });

    it("persists state to session storage", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      ref.persist("test-ref", "session");

      // Verify state was persisted
      const sessionStorage = webstorage<{ count: number }>("session");
      expect(sessionStorage.get("test-ref", { count: -1 })).toEqual({
        count: 0,
      });

      // Change state and verify it updates in storage
      ref.updateState({ count: 5 });
      expect(sessionStorage.get("test-ref", { count: -1 })).toEqual({
        count: 5,
      });
    });

    it("uses local storage as default when not specified", () => {
      const ref = createRef<{ count: number }>(undefined, { count: 0 });
      ref.persist("test-ref");

      // Verify state was persisted to local storage
      const localStorage = webstorage<{ count: number }>("local");
      expect(localStorage.get("test-ref", { count: -1 })).toEqual({ count: 0 });
    });
  });

  describe("Restore", () => {
    it("restores state from memory storage", () => {
      // Setup initial data in storage
      const memStorage = webstorage<{ count: number }>("memory");
      memStorage.set("test-ref", { count: 42 });

      // Create a ref with different initial state
      const ref = createRef<{ count: number }>(undefined, { count: 0 });

      // Restore from storage
      ref.restore("test-ref", "memory");

      // Verify ref now has the state from storage
      expect(ref.state).toEqual({ count: 42 });
    });

    it("restores state from local storage", () => {
      // Setup initial data in storage
      const localStorage = webstorage<{ count: number }>("local");
      localStorage.set("test-ref", { count: 42 });

      // Create a ref with different initial state
      const ref = createRef<{ count: number }>(undefined, { count: 0 });

      // Restore from storage
      ref.restore("test-ref", "local");

      // Verify ref now has the state from storage
      expect(ref.state).toEqual({ count: 42 });
    });

    it("restores state from session storage", () => {
      // Setup initial data in storage
      const sessionStorage = webstorage<{ count: number }>("session");
      sessionStorage.set("test-ref", { count: 42 });

      // Create a ref with different initial state
      const ref = createRef<{ count: number }>(undefined, { count: 0 });

      // Restore from storage
      ref.restore("test-ref", "session");

      // Verify ref now has the state from storage
      expect(ref.state).toEqual({ count: 42 });
    });

    it("uses local storage as default when not specified for restore", () => {
      // Setup initial data in local storage
      const localStorage = webstorage<{ count: number }>("local");
      localStorage.set("test-ref", { count: 42 });

      // Create a ref with different initial state
      const ref = createRef<{ count: number }>(undefined, { count: 0 });

      // Restore from storage (without specifying provider)
      ref.restore("test-ref");

      // Verify ref now has the state from local storage
      expect(ref.state).toEqual({ count: 42 });
    });

    it("preserves initial state when no data exists in storage", () => {
      const initialState = { count: 99 };
      const ref = createRef<{ count: number }>(undefined, initialState);

      // Try to restore from a key that doesn't exist
      ref.restore("non-existent-key", "memory");

      // Verify ref still has the initial state
      expect(ref.state).toEqual(initialState);
    });
  });

  describe("Persistence and Restore workflow", () => {
    it("completes a full persist-modify-restore cycle", () => {
      // Create and persist initial ref
      const ref1 = createRef<{ count: number }>(undefined, { count: 10 });
      ref1.persist("workflow-test", "memory");

      // Modify the state
      ref1.updateState({ count: 20 });

      // Create a new ref instance
      const ref2 = createRef<{ count: number }>(undefined, { count: 0 });

      // Restore from the same storage location
      ref2.restore("workflow-test", "memory");

      // Verify the second ref has the updated state
      expect(ref2.state).toEqual({ count: 20 });
    });

    it("persists to one storage type and restores from the same", () => {
      // Test with all storage types
      ["memory", "local", "session"].forEach((storageType) => {
        // Create and persist initial ref
        const ref1 = createRef<{ count: number }>(undefined, { count: 10 });
        ref1.persist("cycle-test", storageType as any);

        // Modify the state
        ref1.updateState({ count: 25 });

        // Create a new ref instance
        const ref2 = createRef<{ count: number }>(undefined, { count: 0 });

        // Restore from the same storage location
        ref2.restore("cycle-test", storageType as any);

        // Verify the second ref has the updated state
        expect(ref2.state).toEqual({ count: 25 });
      });
    });

    it("triggers refUpdateFn after restore", () => {
      // Setup initial data in storage
      const memStorage = webstorage<{ count: number }>("memory");
      memStorage.set("listener-test", { count: 50 });

      // Create ref with listener
      const refUpdateFn = vi.fn();
      const ref = createRef<{ count: number }>(refUpdateFn, { count: 0 });

      // Restore from storage
      ref.restore("listener-test", "memory");

      // Verify listener was called with correct values
      expect(refUpdateFn).toHaveBeenCalledTimes(1);
      expect(refUpdateFn).toHaveBeenCalledWith(
        { count: 50 },
        { count: 50 },
        undefined,
      );
    });
  });

  describe("DOM interaction", () => {
    it("associates with a DOM element via current property", () => {
      const ref = createRef();
      const div = document.createElement("div");

      ref.current = div;

      expect(ref.current).toBe(div);
    });

    it("updates DOM content via update method", async () => {
      const ref = createRef<any, HTMLDivElement>();
      const div = document.createElement("div");
      div.innerHTML = "<span>Original</span>";
      document.body.appendChild(div);
      ref.current = div;

      await ref.update("<span>Updated</span>");

      expect(div.innerHTML).toBe("<span>Updated</span>");
    });
  });
});
