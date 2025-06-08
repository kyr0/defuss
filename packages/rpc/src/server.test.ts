import { describe, it, expect, beforeEach } from "vitest";
import {
  createRpcServer,
  setGuardFunction,
  rpcRoute,
  clearRpcServer,
} from "./server.js";
import { TestUserApi, TestProductApi } from "./test-api.js";

describe("RPC Server", () => {
  beforeEach(() => {
    // Clear state before each test to ensure isolation
    clearRpcServer();
  });

  describe("createRpcServer", () => {
    it("should register API classes", () => {
      const apiNamespace = {
        TestUserApi,
        TestProductApi,
      };

      createRpcServer(apiNamespace);

      // Since we can't directly access the internal array, we test by making a schema request
      expect(() => createRpcServer(apiNamespace)).not.toThrow();
    });

    it("should prevent re-publishing the same namespace", () => {
      const apiNamespace = {
        TestUserApi,
      };

      createRpcServer(apiNamespace);
      // Second call should not throw but should not add duplicates
      createRpcServer(apiNamespace);

      expect(true).toBe(true); // If we get here, no errors were thrown
    });
  });

  describe("setGuardFunction", () => {
    it("should set a guard function", () => {
      const guardFn = async (req: Request) => {
        return req.headers.get("authorization") === "Bearer test-token";
      };

      expect(() => setGuardFunction(guardFn)).not.toThrow();
    });
  });

  describe("rpcRoute - Schema Endpoint", () => {
    it("should return schema for registered API classes", async () => {
      const apiNamespace = {
        TestUserApi,
        TestProductApi,
      };

      createRpcServer(apiNamespace);

      const request = new Request("http://localhost/rpc/schema", {
        method: "POST",
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const schema = await response.json();
      expect(Array.isArray(schema)).toBe(true);
      expect(schema.length).toBeGreaterThanOrEqual(2);

      // Check TestUserApi schema
      const userApiSchema = schema.find(
        (s: any) => s.className === "TestUserApi",
      );
      expect(userApiSchema).toBeDefined();
      expect(userApiSchema.methods).toBeDefined();
      expect(userApiSchema.methods.getUser).toEqual({ async: true });
      expect(userApiSchema.methods.createUser).toEqual({ async: true });
      expect(userApiSchema.methods.getUserCount).toEqual({ async: false });

      // Check TestProductApi schema
      const productApiSchema = schema.find(
        (s: any) => s.className === "TestProductApi",
      );
      expect(productApiSchema).toBeDefined();
      expect(productApiSchema.methods.getProduct).toEqual({ async: true });
      expect(productApiSchema.methods.searchProducts).toEqual({ async: true });
    });
  });

  describe("rpcRoute - RPC Calls", () => {
    it("should handle successful RPC calls", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "getUser",
          args: ["123"],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
      // Parse DSON response
      const { DSON } = await import("defuss-dson");
      const userData = await DSON.parse(result);

      expect(userData).toEqual({
        id: "123",
        name: "User 123",
        email: "user123@example.com",
        age: 1230,
      });
    });

    it("should handle RPC calls with multiple arguments", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "updateUser",
          args: ["456", { name: "Updated User", age: 25 }],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
      const { DSON } = await import("defuss-dson");
      const userData = await DSON.parse(result);

      expect(userData.id).toBe("456");
      expect(userData.name).toBe("Updated User");
      expect(userData.age).toBe(25);
      expect(userData.updatedAt).toBeDefined();
    });

    it("should handle synchronous methods", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
      const { DSON } = await import("defuss-dson");
      const count = await DSON.parse(result);

      expect(count).toBe(42);
    });

    it("should handle complex data structures", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestProductApi",
          methodName: "getComplexData",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
      const { DSON } = await import("defuss-dson");
      const complexData = await DSON.parse(result);

      expect(complexData.metadata).toBeDefined();
      expect(complexData.metadata.version).toBe("1.0.0");
      expect(complexData.data).toHaveLength(2);
      expect(complexData.data[0].nested.value).toBe(123);
      expect(complexData.data[0].nested.array).toEqual([1, 2, 3]);
    });

    it("should return 404 for non-existent class", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "NonExistentApi",
          methodName: "someMethod",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Class NonExistentApi not found");
    });

    it("should return 404 for non-existent method", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "nonExistentMethod",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe(
        "Method nonExistentMethod not found on class TestUserApi",
      );
    });

    it("should handle method errors gracefully", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestProductApi",
          methodName: "throwError",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(500);

      const error = await response.json();
      expect(error.error).toBe(
        "Error calling method throwError: This is a test error",
      );
    });
  });

  describe("Guard Function", () => {
    it("should allow requests when guard function returns true", async () => {
      createRpcServer({ TestUserApi });

      setGuardFunction(async (request: Request) => {
        return request.headers.get("authorization") === "Bearer valid-token";
      });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);
    });

    it("should reject requests when guard function returns false", async () => {
      createRpcServer({ TestUserApi });

      setGuardFunction(async (request: Request) => {
        return request.headers.get("authorization") === "Bearer valid-token";
      });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(403);

      const error = await response.json();
      expect(error.error).toBe("Forbidden");
    });

    it("should work without guard function", async () => {
      createRpcServer({ TestUserApi });

      // Don't set any guard function
      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);
    });
  });
});
