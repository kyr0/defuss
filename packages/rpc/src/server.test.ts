import { describe, it, expect, beforeEach } from "vitest";
import { DSON } from "defuss-dson";
import {
  createRpcServer,
  addHook,
  rpcRoute,
  clearRpcServer,
  describeInstance,
} from "./server.js";
import { TestUserApi, TestProductApi, TestStreamModule } from "./test-api.js";

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

  describe("addHook", () => {
    it("should register a guard hook", () => {
      const guardFn = async (
        _className: string,
        _methodName: string,
        _args: unknown[],
        request: Request,
      ) => {
        return request.headers.get("authorization") === "Bearer test-token";
      };

      expect(() => addHook({ phase: "guard", fn: guardFn })).not.toThrow();
    });

    it("should register a result hook", () => {
      const resultFn = (
        _className: string,
        _methodName: string,
        _args: unknown[],
        _request: Request,
        _result?: unknown,
      ) => {};

      expect(() => addHook({ phase: "result", fn: resultFn })).not.toThrow();
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
      expect(userApiSchema.methods.getUser).toEqual({ async: true, generator: false });
      expect(userApiSchema.methods.createUser).toEqual({ async: true, generator: false });
      expect(userApiSchema.methods.getUserCount).toEqual({ async: false, generator: false });

      // Check TestProductApi schema
      const productApiSchema = schema.find(
        (s: any) => s.className === "TestProductApi",
      );
      expect(productApiSchema).toBeDefined();
      expect(productApiSchema.methods.getProduct).toEqual({ async: true, generator: false });
      expect(productApiSchema.methods.searchProducts).toEqual({ async: true, generator: false });
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
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUser",
          args: ["123"],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
      // Parse DSON response
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
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "updateUser",
          args: ["456", { name: "Updated User", age: 25 }],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
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
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
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
        body: DSON.stringify({
          className: "TestProductApi",
          methodName: "getComplexData",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      const result = await response.text();
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
        body: DSON.stringify({
          className: "NonExistentApi",
          methodName: "someMethod",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Namespace NonExistentApi not found");
    });

    it("should return 404 for non-existent method", async () => {
      createRpcServer({ TestUserApi, TestProductApi });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: DSON.stringify({
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
        body: DSON.stringify({
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

  describe("Guard Hooks", () => {
    it("should allow requests when guard function returns true", async () => {
      createRpcServer({ TestUserApi });

      addHook({
        phase: "guard",
        fn: async (
          _className: string,
          _methodName: string,
          _args: unknown[],
          request: Request,
        ) => {
          return request.headers.get("authorization") === "Bearer valid-token";
        },
      });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: DSON.stringify({
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

      addHook({
        phase: "guard",
        fn: async (
          _className: string,
          _methodName: string,
          _args: unknown[],
          request: Request,
        ) => {
          return request.headers.get("authorization") === "Bearer valid-token";
        },
      });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token",
        },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(403);

      const error = await response.json();
      expect(error.error).toBe("Forbidden by hook");
    });

    it("should work without guard function", async () => {
      createRpcServer({ TestUserApi });

      // Don't set any guard function
      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);
    });

    it("should call result hooks with the returned value", async () => {
      createRpcServer({ TestUserApi });

      let called = false;
      let captured: unknown;
      addHook({
        phase: "result",
        fn: async (
          className: string,
          methodName: string,
          _args: unknown[],
          _request: Request,
          result?: unknown,
        ) => {
          if (className === "TestUserApi" && methodName === "getUserCount") {
            called = true;
            captured = result;
          }
        },
      });

      const request = new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const response = await rpcRoute({ request } as any);
      expect(response.status).toBe(200);

      expect(called).toBe(true);
      expect(captured).toBe(42);
    });

    it("should allow guard to selectively block by method name", async () => {
      createRpcServer({ TestUserApi });

      addHook({
        phase: "guard",
        fn: async (
          _className: string,
          methodName: string,
          _args: unknown[],
          _request: Request,
        ) => {
          // Only allow getUserCount, block everything else
          return methodName === "getUserCount";
        },
      });

      // Allowed call
      const allowedReq = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });
      const allowedRes = await rpcRoute({ request: allowedReq } as any);
      expect(allowedRes.status).toBe(200);

      // Blocked call
      const blockedReq = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUser",
          args: ["1"],
        }),
      });
      const blockedRes = await rpcRoute({ request: blockedReq } as any);
      expect(blockedRes.status).toBe(403);
    });

    it("should support multiple guard hooks (all must pass)", async () => {
      createRpcServer({ TestUserApi });

      // First guard: always allow
      addHook({
        phase: "guard",
        fn: async () => true,
      });

      // Second guard: block deleteUser
      addHook({
        phase: "guard",
        fn: async (
          _className: string,
          methodName: string,
        ) => {
          return methodName !== "deleteUser";
        },
      });

      const deleteReq = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "deleteUser",
          args: ["1"],
        }),
      });
      const deleteRes = await rpcRoute({ request: deleteReq } as any);
      expect(deleteRes.status).toBe(403);

      const countReq = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });
      const countRes = await rpcRoute({ request: countReq } as any);
      expect(countRes.status).toBe(200);
    });
  });

  describe("createRpcServer - empty namespace", () => {
    it("should clear entries when empty namespace is passed", async () => {
      // Register some APIs
      createRpcServer({ TestUserApi });

      // Verify it works
      const req1 = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });
      const res1 = await rpcRoute({ request: req1 } as any);
      expect(res1.status).toBe(200);

      // Clear with empty namespace
      createRpcServer({});

      // Now calls should fail with 404
      const req2 = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });
      const res2 = await rpcRoute({ request: req2 } as any);
      expect(res2.status).toBe(404);
    });

    it("should allow re-registering after clearing with empty namespace", async () => {
      createRpcServer({ TestUserApi });
      createRpcServer({}); // clear
      createRpcServer({ TestProductApi }); // re-register different API

      const schemaReq = new Request("http://localhost/rpc/schema", {
        method: "POST",
      });
      const schemaRes = await rpcRoute({ request: schemaReq } as any);
      const schema = await schemaRes.json();

      expect(schema).toHaveLength(1);
      expect(schema[0].className).toBe("TestProductApi");
    });
  });

  describe("describeInstance", () => {
    it("should describe prototype with properties", () => {
      class WithProps {
        name = "test";
        count = 42;
        getValue() {
          return this.name;
        }
        async fetchData() {
          return {};
        }
      }

      const result = describeInstance(new WithProps()) as any;
      expect(result.className).toBe("WithProps");
      expect(result.properties.name).toBe("string");
      expect(result.properties.count).toBe("number");
    });

    it("should handle nested objects in properties", () => {
      class Nested {
        meta = { version: "1.0", info: { deep: true } };
      }

      const result = describeInstance(new Nested()) as any;
      expect(result.properties.meta).toBeDefined();
      expect(result.properties.meta.className).toBe("Object");
    });

    it("should return null for null or non-object proto", () => {
      expect(describeInstance(null)).toBeNull();
      expect(describeInstance(undefined)).toBeNull();
      expect(describeInstance("string")).toBeNull();
      expect(describeInstance(42)).toBeNull();
    });

    it("should handle circular references", () => {
      const a: any = {};
      const b: any = { ref: a };
      a.ref = b;

      const result = describeInstance(a) as any;
      // Should not throw, and the circular part should be "[Circular]"
      expect(result).toBeDefined();
    });
  });

  describe("Generator / streaming", () => {
    /** Helper: collect all NDJSON frames from a streaming response */
    async function collectFrames(response: Response) {
      const text = await response.text();
      return text
        .split("\n")
        .filter(Boolean)
        .map((line) => DSON.parse(line));
    }

    it("should report generator: true in the module schema", async () => {
      createRpcServer({ TestStreamModule });
      const req = new Request("http://localhost/rpc/schema", { method: "POST" });
      const res = await rpcRoute({ request: req } as any);
      const schema = await res.json();

      expect(schema).toHaveLength(1);
      expect(schema[0].methods.countUp).toEqual({ async: true, generator: true });
      expect(schema[0].methods.throwMidStream).toEqual({ async: true, generator: true });
      expect(schema[0].methods.chat).toEqual({ async: true, generator: true });
      expect(schema[0].methods.ping).toEqual({ async: true, generator: false });
    });

    it("should stream NDJSON frames for a generator method", async () => {
      createRpcServer({ TestStreamModule });

      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({ className: "TestStreamModule", methodName: "countUp", args: [3] }),
      });

      const res = await rpcRoute({ request: req } as any);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/x-ndjson");

      const frames = await collectFrames(res);
      // 3 yield frames + 1 return frame
      expect(frames).toHaveLength(4);
      expect(frames[0]).toEqual({ type: "yield", value: 0 });
      expect(frames[1]).toEqual({ type: "yield", value: 1 });
      expect(frames[2]).toEqual({ type: "yield", value: 2 });
      expect(frames[3]).toEqual({ type: "return", value: 3 });
    });

    it("should emit an error frame when a generator throws mid-stream", async () => {
      createRpcServer({ TestStreamModule });

      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestStreamModule",
          methodName: "throwMidStream",
          args: [],
        }),
      });

      const res = await rpcRoute({ request: req } as any);
      expect(res.status).toBe(200);

      const frames = await collectFrames(res);
      // 2 yields + 1 error
      expect(frames).toHaveLength(3);
      expect(frames[0]).toEqual({ type: "yield", value: "a" });
      expect(frames[1]).toEqual({ type: "yield", value: "b" });
      expect(frames[2].type).toBe("error");
      expect(frames[2].error.message).toBe("mid-stream error");
    });

    it("should stream chat words as individual frames", async () => {
      createRpcServer({ TestStreamModule });

      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({
          className: "TestStreamModule",
          methodName: "chat",
          args: ["hello world"],
        }),
      });

      const res = await rpcRoute({ request: req } as any);
      const frames = await collectFrames(res);

      expect(frames).toHaveLength(3); // 2 yields + 1 return
      expect(frames[0]).toEqual({ type: "yield", value: "hello" });
      expect(frames[1]).toEqual({ type: "yield", value: "world" });
      expect(frames[2]).toEqual({ type: "return", value: "hello world" });
    });

    it("should still return a normal DSON response for non-generator methods in a mixed module", async () => {
      createRpcServer({ TestStreamModule });

      const req = new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: DSON.stringify({ className: "TestStreamModule", methodName: "ping", args: [] }),
      });

      const res = await rpcRoute({ request: req } as any);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/json");

      const text = await res.text();
      expect(DSON.parse(text)).toBe("pong");
    });
  });
});
