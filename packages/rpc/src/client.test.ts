import { describe, it, expect, beforeEach } from "vitest";
import {
  getSchema,
  getRpcClient,
  clearSchemaCache,
  clearHooks,
  addHook,
  setHeaders,
} from "./client.js";
import {
  TestUserApi,
  TestProductApi,
  TestMathModule,
  TestStringModule,
} from "./test-api.js";
import { withTestServer, TestRpcServer } from "./test-utils.js";

// Define TestApiNamespace type that satisfies the constraint
type TestApiNamespace = {
  TestUserApi: new () => TestUserApi;
  TestProductApi: new () => TestProductApi;
  [key: string]: new (
    ...args: any[]
  ) => any; // Index signature to satisfy RpcApiClass constraint
};

type TestModuleNamespace = {
  TestMathModule: typeof TestMathModule;
  TestStringModule: typeof TestStringModule;
  [key: string]: unknown;
};

type MixedNamespace = {
  TestUserApi: new () => TestUserApi;
  TestMathModule: typeof TestMathModule;
  [key: string]: unknown;
};

describe("RPC Client", () => {
  beforeEach(() => {
    clearSchemaCache();
    clearHooks();
  });

  describe("getSchema", () => {
    it("should fetch schema from server", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        // Override global fetch to point to our test server
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          // Rewrite relative URLs to point to test server
          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const schema = await getSchema();

          expect(Array.isArray(schema)).toBe(true);
          expect(schema.length).toBe(2);

          const userApiSchema = schema.find(
            (s: any) => s.className === "TestUserApi",
          );
          expect(userApiSchema).toBeDefined();
          expect(userApiSchema.methods.getUser).toEqual({ async: true });
          expect(userApiSchema.methods.createUser).toEqual({ async: true });
          expect(userApiSchema.methods.getUserCount).toEqual({ async: false });

          const productApiSchema = schema.find(
            (s: any) => s.className === "TestProductApi",
          );
          expect(productApiSchema).toBeDefined();
          expect(productApiSchema.methods.getProduct).toEqual({ async: true });
          expect(productApiSchema.methods.searchProducts).toEqual({
            async: true,
          });
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should throw error when schema fetch fails", async () => {
      // Test with a server that doesn't exist
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        });
      };

      try {
        await expect(getSchema()).rejects.toThrow(
          "Failed to fetch schema: Internal Server Error",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("getRpcClient", () => {
    it("should create RPC client with proper API structure", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        // Override global fetch to point to our test server
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();

          expect(client).toBeDefined();
          expect(client.TestUserApi).toBeDefined();
          expect(client.TestProductApi).toBeDefined();
          expect(typeof client.TestUserApi).toBe("function");
          expect(typeof client.TestProductApi).toBe("function");
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should make RPC calls through proxy instances", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const userApi = new client.TestUserApi();

          const result = await userApi.getUser("123");

          expect(result).toEqual({
            id: "123",
            name: "User 123",
            email: "user123@example.com",
            age: 1230,
          });
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should handle methods with multiple arguments", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const userApi = new client.TestUserApi();

          const userData = {
            name: "New User",
            email: "new@example.com",
            age: 25,
          };
          const result = await userApi.createUser(userData);

          expect(result.id).toBe("new-user-id");
          expect(result.name).toBe("New User");
          expect(result.email).toBe("new@example.com");
          expect(result.age).toBe(25);
          expect(result.createdAt).toBeDefined();
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should handle methods with no arguments", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const userApi = new client.TestUserApi();

          const result = await userApi.getUserCount();

          expect(result).toBe(42);
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should handle methods with optional arguments", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const productApi = new client.TestProductApi();

          // Call with default limit
          const result1 = await productApi.searchProducts("test");
          expect(result1).toHaveLength(10);
          expect(result1[0].name).toBe("test Product 1");

          // Call with custom limit
          const result2 = await productApi.searchProducts("custom", 3);
          expect(result2).toHaveLength(3);
          expect(result2[0].name).toBe("custom Product 1");
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should handle RPC call failures", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const productApi = new client.TestProductApi();

          await expect(productApi.throwError()).rejects.toThrow();
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should cache schema between client calls", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        // Clear schema cache to ensure we start fresh
        clearSchemaCache();

        const originalFetch = globalThis.fetch;
        let schemaCallCount = 0;

        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          // Count schema calls
          if (urlStr.includes("/rpc/schema")) {
            schemaCallCount++;
          }

          return originalFetch(url, options);
        };

        try {
          // First client creation
          const client1 = await getRpcClient<TestApiNamespace>();
          expect(schemaCallCount).toBe(1);

          // Second client creation should reuse cached schema
          const client2 = await getRpcClient<TestApiNamespace>();
          expect(schemaCallCount).toBe(1); // Should still be 1, not 2

          // Both clients should work the same
          const result1 = await new client1.TestUserApi().getUserCount();
          const result2 = await new client2.TestUserApi().getUserCount();

          expect(result1).toBe(42);
          expect(result2).toBe(42);
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should work with multiple API classes", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();

          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }

          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();

          const userApi = new client.TestUserApi();
          const productApi = new client.TestProductApi();

          const userResult = await userApi.getUserCount();
          const productResult = await productApi.searchProducts("multi", 2);

          expect(userResult).toBe(42);
          expect(productResult).toHaveLength(2);
          expect(productResult[0].name).toBe("multi Product 1");
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should include custom headers and run hooks in order", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        clearSchemaCache();
        const events: string[] = [];

        // Setup headers
        setHeaders({ Authorization: "Bearer TEST", "X-Custom": "abc" });

        // guard records request
        addHook({
          phase: "guard",
          fn: (cls, meth, args, req) => {
            events.push(`guard:${cls}.${meth}`);
            expect(req?.headers).toBeDefined();
            const headers = req!.headers as Record<string, string>;
            // Node-fetch RequestInit.headers may be Headers or object; server reads via Express which accepts object
            expect(headers["Content-Type"] || headers["content-type"]).toBe(
              "application/json",
            );
            expect((headers as any).Authorization).toBe("Bearer TEST");
            expect(headers["X-Custom"]).toBe("abc");
            // allow
            return true;
          },
        });

        // Response hook validates status
        addHook({
          phase: "response",
          fn: (cls, meth, args, req, res) => {
            events.push(`response:${cls}.${meth}`);
            expect(res).toBeDefined();
          },
        });

        // Result hook inspects result
        addHook({
          phase: "result",
          fn: (cls, meth, args, req, res, result) => {
            events.push(`result:${cls}.${meth}`);
            expect(typeof result).toBe("number");
            expect(result).toBe(42);
          },
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }
          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const userApi = new client.TestUserApi();
          const result = await userApi.getUserCount();
          expect(result).toBe(42);

          // Hooks order
          expect(events).toEqual([
            "guard:TestUserApi.getUserCount",
            "response:TestUserApi.getUserCount",
            "result:TestUserApi.getUserCount",
          ]);
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should block call when guard returns false", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) {
            url = `${serverUrl}${urlStr}`;
          }
          return originalFetch(url, options);
        };

        // Block getProduct
        addHook({
          phase: "guard",
          fn: (cls, meth) => {
            if (cls === "TestProductApi" && meth === "getProduct") return false;
          },
        });

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const productApi = new client.TestProductApi();
          await expect(productApi.getProduct("1")).rejects.toThrow(
            "RPC call to TestProductApi.getProduct was blocked by a guard",
          );
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should call deleteUser via class-based proxy", async () => {
      await withTestServer({ TestUserApi, TestProductApi }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestApiNamespace>();
          const userApi = new client.TestUserApi();
          const result = await userApi.deleteUser("99");
          expect(result).toEqual({ success: true, deletedId: "99" });
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });
  });

  describe("getRpcClient - module-based API", () => {
    it("should create module proxy with callable methods", async () => {
      await withTestServer(
        { TestMathModule, TestStringModule },
        async (server) => {
          clearSchemaCache();
          const originalFetch = globalThis.fetch;
          globalThis.fetch = async (
            url: string | URL | Request,
            options?: RequestInit,
          ) => {
            const urlStr = typeof url === "string" ? url : url.toString();
            const serverUrl = server.getUrl();
            if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
            return originalFetch(url, options);
          };

          try {
            const client = await getRpcClient<TestModuleNamespace>();
            expect(client.TestMathModule).toBeDefined();
            expect(typeof client.TestMathModule).toBe("object");

            const result = await (client.TestMathModule as any).add(3, 4);
            expect(result).toBe(7);
          } finally {
            globalThis.fetch = originalFetch;
          }
        },
      );
    });

    it("should call subtract and divide on module proxy", async () => {
      await withTestServer({ TestMathModule }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestModuleNamespace>();
          const math = client.TestMathModule as any;

          expect(await math.subtract(10, 3)).toBe(7);
          expect(await math.divide(10, 2)).toBe(5);
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should call string module echo, concat and now", async () => {
      await withTestServer({ TestStringModule }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestModuleNamespace>();
          const str = client.TestStringModule as any;

          expect(await str.echo("hello")).toBe("hello");
          expect(await str.concat("foo", "bar")).toBe("foobar");

          const dateResult = await str.now();
          expect(dateResult).toBeDefined();
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should dynamically create RPC caller for unknown methods on module proxy", async () => {
      await withTestServer({ TestMathModule }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestModuleNamespace>();
          const math = client.TestMathModule as any;

          // Accessing a method not in schema should still return a function (dynamic proxy)
          expect(typeof math.unknownMethod).toBe("function");
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should return undefined for symbol prop access on module proxy", async () => {
      await withTestServer({ TestMathModule }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
          return originalFetch(url, options);
        };

        try {
          const client = await getRpcClient<TestModuleNamespace>();
          const math = client.TestMathModule as any;
          const sym = Symbol("test");
          expect(math[sym]).toBeUndefined();
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });

    it("should work with mixed class and module namespaces", async () => {
      await withTestServer(
        { TestUserApi, TestMathModule },
        async (server) => {
          clearSchemaCache();
          const originalFetch = globalThis.fetch;
          globalThis.fetch = async (
            url: string | URL | Request,
            options?: RequestInit,
          ) => {
            const urlStr = typeof url === "string" ? url : url.toString();
            const serverUrl = server.getUrl();
            if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
            return originalFetch(url, options);
          };

          try {
            const client = await getRpcClient<MixedNamespace>();

            // Class-based
            const userApi = new (client.TestUserApi as any)();
            const user = await userApi.getUser("5");
            expect(user.id).toBe("5");

            // Module-based
            const result = await (client.TestMathModule as any).multiply(6, 7);
            expect(result).toBe(42);
          } finally {
            globalThis.fetch = originalFetch;
          }
        },
      );
    });

    it("should apply guards to module-based RPC calls", async () => {
      await withTestServer({ TestMathModule }, async (server) => {
        clearSchemaCache();
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (
          url: string | URL | Request,
          options?: RequestInit,
        ) => {
          const urlStr = typeof url === "string" ? url : url.toString();
          const serverUrl = server.getUrl();
          if (urlStr.startsWith("/")) url = `${serverUrl}${urlStr}`;
          return originalFetch(url, options);
        };

        addHook({
          phase: "guard",
          fn: (cls, meth) => {
            if (cls === "TestMathModule" && meth === "add") return false;
            return true;
          },
        });

        try {
          const client = await getRpcClient<TestModuleNamespace>();
          const math = client.TestMathModule as any;

          await expect(math.add(1, 2)).rejects.toThrow(
            "RPC call to TestMathModule.add was blocked by a guard",
          );

          // Other methods should still work
          expect(await math.multiply(3, 4)).toBe(12);
        } finally {
          globalThis.fetch = originalFetch;
        }
      });
    });
  });
});
