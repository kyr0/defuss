import { DSON } from "defuss-dson";
import { request as httpRequest } from "node:http";
import { gunzipSync, gzipSync } from "node:zlib";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ExpressRpcServer, createExpressRpcServer } from "./express-server.js";
import { createRpcServer, clearRpcServer } from "./server.js";
import { TestUserApi, TestProductApi, TestStreamModule } from "./test-api.js";

/** Low-level HTTP POST that gives us raw headers and body bytes (no auto-decompression). */
function rawPost(
  url: string,
  body: string | Buffer,
  headers: Record<string, string>,
): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = httpRequest(
      {
        hostname: parsed.hostname,
        port: Number(parsed.port),
        path: parsed.pathname,
        method: "POST",
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode!,
            headers: res.headers as Record<
              string,
              string | string[] | undefined
            >,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

describe("Express RPC Server", () => {
  let server: ExpressRpcServer | null;
  let serverInfo: { port: number; url: string };

  beforeEach(async () => {
    // Register test APIs
    createRpcServer({
      TestUserApi,
      TestProductApi,
      TestStreamModule,
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
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUser",
          args: ["123"],
        }),
      });

      const responseText = await response.text();
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
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
      });

      const responseText = await response.text();
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
        body: DSON.stringify({
          className: "TestUserApi",
          methodName: "createUser",
          args: [userData],
        }),
      });

      const responseText = await response.text();
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
        body: DSON.stringify({
          className: "NonExistentApi",
          methodName: "someMethod",
          args: [],
        }),
      });

      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toContain("Namespace NonExistentApi not found");
    });

    it("should return 404 for non-existent method", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
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

  describe("Response Compression (Phase 1)", () => {
    beforeEach(async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();
    });

    it("should gzip-compress NDJSON streaming responses when Accept-Encoding: gzip", async () => {
      const res = await rawPost(
        `${serverInfo.url}/rpc`,
        DSON.stringify({
          className: "TestStreamModule",
          methodName: "countUp",
          args: [3],
        }),
        {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
        },
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/x-ndjson");
      expect(res.headers["content-encoding"]).toBe("gzip");
      expect(res.headers["vary"]).toBe("Accept-Encoding");

      // Raw body is gzip — decompress to get NDJSON text
      const decompressed = gunzipSync(res.body).toString("utf-8");
      const frames = decompressed
        .split("\n")
        .filter(Boolean)
        .map((l) => DSON.parse(l));

      expect(frames).toHaveLength(4); // 3 yields + 1 return
      expect(frames[0]).toEqual({ type: "yield", value: 0 });
      expect(frames[1]).toEqual({ type: "yield", value: 1 });
      expect(frames[2]).toEqual({ type: "yield", value: 2 });
      expect(frames[3]).toEqual({ type: "return", value: 3 });
    });

    it("should NOT compress NDJSON when Accept-Encoding omits gzip", async () => {
      const res = await rawPost(
        `${serverInfo.url}/rpc`,
        DSON.stringify({
          className: "TestStreamModule",
          methodName: "countUp",
          args: [2],
        }),
        {
          "Content-Type": "application/json",
          "Accept-Encoding": "identity",
        },
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBeUndefined();

      const text = res.body.toString("utf-8");
      const frames = text
        .split("\n")
        .filter(Boolean)
        .map((l) => DSON.parse(l));
      expect(frames).toHaveLength(3); // 2 yields + 1 return
      expect(frames[0]).toEqual({ type: "yield", value: 0 });
      expect(frames[1]).toEqual({ type: "yield", value: 1 });
      expect(frames[2]).toEqual({ type: "return", value: 2 });
    });

    it("should NOT compress when compression option is disabled", async () => {
      // Stop the default server and create one with compression disabled
      await server!.stop();
      server = new ExpressRpcServer({ port: 0, compression: false });
      serverInfo = await server.start();

      const res = await rawPost(
        `${serverInfo.url}/rpc`,
        DSON.stringify({
          className: "TestStreamModule",
          methodName: "countUp",
          args: [2],
        }),
        {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
        },
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBeUndefined();

      const text = res.body.toString("utf-8");
      const frames = text
        .split("\n")
        .filter(Boolean)
        .map((l) => DSON.parse(l));
      expect(frames).toHaveLength(3);
    });

    it("should gzip-compress large buffered RPC responses", async () => {
      // searchProducts returns an array — with limit=50 the DSON text exceeds 1 KB
      const res = await rawPost(
        `${serverInfo.url}/rpc`,
        DSON.stringify({
          className: "TestProductApi",
          methodName: "searchProducts",
          args: ["widget", 50],
        }),
        {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
        },
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBe("gzip");
      expect(res.headers["vary"]).toBe("Accept-Encoding");

      const decompressed = gunzipSync(res.body).toString("utf-8");
      const result = DSON.parse(decompressed);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(50);
      expect(result[0].name).toContain("widget");
    });

    it("should NOT gzip-compress small buffered RPC responses", async () => {
      const res = await rawPost(
        `${serverInfo.url}/rpc`,
        DSON.stringify({
          className: "TestUserApi",
          methodName: "getUserCount",
          args: [],
        }),
        {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
        },
      );

      expect(res.status).toBe(200);
      // Small response (just "42") should not be compressed
      expect(res.headers["content-encoding"]).toBeUndefined();

      const responseText = res.body.toString("utf-8");
      const result = DSON.parse(responseText);
      expect(result).toBe(42);
    });
  });

  describe("Request Decompression (Phase 2)", () => {
    beforeEach(async () => {
      server = new ExpressRpcServer({ port: 0 });
      serverInfo = await server.start();
    });

    it("should decompress a gzip-compressed request body", async () => {
      const body = DSON.stringify({
        className: "TestUserApi",
        methodName: "getUser",
        args: ["456"],
      });
      const compressed = gzipSync(Buffer.from(body, "utf-8"));

      const res = await rawPost(`${serverInfo.url}/rpc`, compressed, {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
        "Content-Length": String(compressed.length),
      });

      expect(res.status).toBe(200);
      const result = DSON.parse(res.body.toString("utf-8"));
      expect(result).toEqual({
        id: "456",
        name: "User 456",
        email: "user456@example.com",
        age: 4560,
      });
    });

    it("should handle uncompressed requests normally when compression is enabled", async () => {
      const response = await fetch(`${serverInfo.url}/rpc`, {
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

      expect(response.status).toBe(200);
      const responseText = await response.text();
      const result = DSON.parse(responseText);
      expect(result).toBe(42);
    });
  });
});
