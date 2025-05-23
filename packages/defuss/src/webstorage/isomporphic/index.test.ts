/**
 * @vitest-environment happy-dom
 */
import {
  newInMemoryGenericStorageBackend,
  memory,
  WebStorageProvider,
} from "./index.js";

describe("Isomorphic WebStorage exports", () => {
  it("should export newInMemoryGenericStorageBackend", () => {
    expect(newInMemoryGenericStorageBackend).toBeDefined();
  });

  it("should export WebStorage with correct type", () => {
    expect(newInMemoryGenericStorageBackend).toBeInstanceOf(Function);
  });

  it("should export memory", () => {
    expect(memory).toBeDefined();
    expect(memory).toHaveProperty("clear");
    expect(memory).toHaveProperty("getItem");
    expect(memory).toHaveProperty("removeItem");
    expect(memory).toHaveProperty("setItem");
  });

  it("should export WebStorageProvider", () => {
    expect(WebStorageProvider).toBeDefined();
    expect(WebStorageProvider).toBeInstanceOf(Function);
    expect(WebStorageProvider.prototype).toHaveProperty("get");
    expect(WebStorageProvider.prototype).toHaveProperty("set");
    expect(WebStorageProvider.prototype).toHaveProperty("remove");
    expect(WebStorageProvider.prototype).toHaveProperty("removeAll");
    expect(WebStorageProvider.prototype).toHaveProperty("backendApi");
  });
});
