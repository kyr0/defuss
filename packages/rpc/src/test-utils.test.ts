import { describe, it, expect } from "vitest";
import { withTestServer, TestRpcServer } from "./test-utils.js";
import { TestUserApi, TestProductApi } from "./test-api.js";

describe("Test Utilities", () => {
  describe("withTestServer", () => {
    it("should create and cleanup server automatically", async () => {
      await withTestServer({ TestUserApi }, async (server) => {
        const result = await server.call("TestUserApi", "getUser", ["123"]);
        expect(result.id).toBe("123");
        expect(result.name).toBe("User 123");
      });
    });

    it("should work with multiple APIs", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const userResult = await server.call("TestUserApi", "getUserCount");
        expect(userResult).toBe(42);

        const productResult = await server.call(
          "TestProductApi",
          "getProduct",
          ["456"],
        );
        expect(productResult.id).toBe("456");
        expect(productResult.name).toBe("Product 456");
      });
    });

    it("should provide schema access", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const schema = await server.getSchema();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBe(2);

        const userApiSchema = schema.find(
          (s: any) => s.className === "TestUserApi",
        );
        expect(userApiSchema).toBeDefined();
        expect(userApiSchema.methods.getUser).toBeDefined();
        expect(userApiSchema.methods.getUser.async).toBe(true);
        expect(userApiSchema.methods.getUserCount.async).toBe(false);
      });
    });
  });

  describe("TestRpcServer", () => {
    it("should handle manual lifecycle", async () => {
      const server = new TestRpcServer();

      const info = await server.start({ TestUserApi });
      expect(info.port).toBeGreaterThan(0);
      expect(info.url).toContain("localhost");

      const result = await server.call("TestUserApi", "getUser", ["789"]);
      expect(result.id).toBe("789");

      await server.stop();
    });

    it("should throw error when calling without starting", async () => {
      const server = new TestRpcServer();

      await expect(
        server.call("TestUserApi", "getUser", ["123"]),
      ).rejects.toThrow("Server not started");
      await expect(server.getSchema()).rejects.toThrow("Server not started");
    });

    it("should handle RPC call errors", async () => {
      await withTestServer({ TestUserApi }, async (server) => {
        await expect(
          server.call("NonExistentApi", "someMethod"),
        ).rejects.toThrow("RPC call failed");

        await expect(
          server.call("TestUserApi", "nonExistentMethod"),
        ).rejects.toThrow("RPC call failed");
      });
    });
  });
});
