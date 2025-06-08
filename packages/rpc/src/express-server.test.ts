import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ExpressRpcServer, createExpressRpcServer } from "./express-server.js";
import { createRpcServer, clearRpcServer } from "./server.js";
import { TestUserApi, TestProductApi } from "./test-api.js";

describe("Express RPC Server", () => {
  let server: ExpressRpcServer | null;
  let serverInfo: { port: number; url: string };

  beforeEach(async () => {
    // Register test APIs
    createRpcServer({
      TestUserApi,
      TestProductApi,
    });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }

    // Clear RPC state
    clearRpcServer();
  });

  describe("Server Lifecycle", () => {
    it("should start and stop the server", async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();

      expect(serverInfo.port).toBeGreaterThan(0);
      expect(serverInfo.url).toContain(`http://localhost:${serverInfo.port}`);

      await server.stop();
      server = null; // Clear reference so afterEach doesn't try to stop it again
    });

    it("should start with createExpressRpcServer helper", async () => {
      const result = await createExpressRpcServer({ port: 0 });
      server = result.server;

      expect(result.port).toBeGreaterThan(0);
      expect(result.url).toContain(`http://localhost:${result.port}`);
    });
  });

  describe("Health Check", () => {
    beforeEach(async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();
    });

    it("should respond to health check", async () => {
      const response = await fetch(`${serverInfo.url}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("RPC Schema Endpoint", () => {
    beforeEach(async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();
    });

    it("should return RPC schema", async () => {
      const response = await fetch(`${serverInfo.url}/rpc/schema`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const schema = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(schema)).toBe(true);
      expect(schema.length).toBeGreaterThan(0);

      // Check if TestUserApi is in the schema
      const userApiSchema = schema.find(
        (s: any) => s.className === "TestUserApi",
      );
      expect(userApiSchema).toBeDefined();
      expect(userApiSchema.methods).toBeDefined();
      expect(userApiSchema.methods.getUser).toBeDefined();
    });
  });

  describe("RPC Method Calls", () => {
    beforeEach(async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();
    });

    it("should handle async RPC method calls", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
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

      const responseText = await response.text();
      const { DSON } = await import("defuss-dson");
      const result = await DSON.parse(responseText);

      expect(response.status).toBe(200);
      expect(result).toEqual({
        id: "123",
        name: "User 123",
        email: "user123@example.com",
        age: 1230,
      });
    });

    it("should handle sync RPC method calls", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
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

      const responseText = await response.text();
      const { DSON } = await import("defuss-dson");
      const result = await DSON.parse(responseText);

      expect(response.status).toBe(200);
      expect(result).toBe(42);
    });

    it("should handle method calls with complex arguments", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
      };

      const response = await fetch(`${serverInfo.url}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          className: "TestUserApi",
          methodName: "createUser",
          args: [userData],
        }),
      });

      const responseText = await response.text();
      const { DSON } = await import("defuss-dson");
      const result = await DSON.parse(responseText);

      expect(response.status).toBe(200);
      expect(result.id).toBe("new-user-id");
      expect(result.name).toBe(userData.name);
      expect(result.email).toBe(userData.email);
      expect(result.age).toBe(userData.age);
      expect(result.createdAt).toBeDefined();
    });

    it("should return 404 for non-existent class", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
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

      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toContain("Class NonExistentApi not found");
    });

    it("should return 404 for non-existent method", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
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

      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toContain("Method nonExistentMethod not found");
    });
  });

  describe("CORS Support", () => {
    beforeEach(async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();
    });

    it("should handle OPTIONS preflight requests", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST",
      );
    });
  });

  describe("Custom Base Path", () => {
    it("should work with custom base path", async () => {
      server = new ExpressRpcServer({ port: 0, basePath: "/api/v1" });
      serverInfo = await server.start();

      const healthResponse = await fetch(`${serverInfo.url}/health`);
      expect(healthResponse.status).toBe(200);

      const rpcResponse = await fetch(`${serverInfo.url}/rpc/schema`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(rpcResponse.status).toBe(200);
    });
  });
});
