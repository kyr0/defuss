import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createRpcServer,
  clearRpcServer,
  rpcRoute,
  addHook,
} from "./server.js";
import {
  TestMathModule,
  TestStringModule,
  TestUserApi,
} from "./test-api.js";
import { DSON } from "defuss-dson";

// Helper to call rpcRoute with a JSON body
async function callRpc(
  body: { className: string; methodName: string; args: unknown[] },
  path = "/rpc",
) {
  const request = new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return rpcRoute({ request } as any);
}

async function callSchema() {
  const request = new Request("http://localhost/rpc/schema", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return rpcRoute({ request } as any);
}

describe("Module-based RPC", () => {
  beforeEach(() => {
    clearRpcServer();
  });

  afterEach(() => {
    clearRpcServer();
  });

  describe("schema", () => {
    it("should return module schema with kind: module", async () => {
      createRpcServer({ TestMathModule });
      const response = await callSchema();
      const schema = await response.json();

      expect(schema).toHaveLength(1);
      expect(schema[0].kind).toBe("module");
      expect(schema[0].moduleName).toBe("TestMathModule");
      expect(schema[0].methods).toHaveProperty("add");
      expect(schema[0].methods).toHaveProperty("multiply");
      expect(schema[0].methods).toHaveProperty("subtract");
      expect(schema[0].methods).toHaveProperty("divide");
      expect(schema[0].methods).toHaveProperty("pi");
      expect(schema[0].methods.add.async).toBe(true);
      expect(schema[0].methods.pi.async).toBe(false);
    });

    it("should return mixed schema with classes and modules", async () => {
      createRpcServer({
        TestUserApi,
        TestMathModule,
        TestStringModule,
      });
      const response = await callSchema();
      const schema = await response.json();

      expect(schema).toHaveLength(3);

      const classEntry = schema.find((e: any) => e.kind === "class");
      const moduleEntries = schema.filter((e: any) => e.kind === "module");

      expect(classEntry).toBeDefined();
      expect(classEntry!.className).toBe("TestUserApi");

      expect(moduleEntries).toHaveLength(2);
      expect(moduleEntries.map((e: any) => e.moduleName).sort()).toEqual([
        "TestMathModule",
        "TestStringModule",
      ]);
    });
  });

  describe("method calls", () => {
    it("should call module functions and return results", async () => {
      createRpcServer({ TestMathModule });

      const response = await callRpc({
        className: "TestMathModule",
        methodName: "add",
        args: [3, 4],
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(await DSON.parse(text)).toBe(7);
    });

    it("should handle async module functions", async () => {
      createRpcServer({ TestStringModule });

      const response = await callRpc({
        className: "TestStringModule",
        methodName: "upper",
        args: ["hello"],
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(await DSON.parse(text)).toBe("HELLO");
    });

    it("should return 404 for non-existent module", async () => {
      createRpcServer({ TestMathModule });

      const response = await callRpc({
        className: "NonExistent",
        methodName: "add",
        args: [1, 2],
      });

      expect(response.status).toBe(404);
    });

    it("should return 404 for non-existent function", async () => {
      createRpcServer({ TestMathModule });

      const response = await callRpc({
        className: "TestMathModule",
        methodName: "nonExistent",
        args: [],
      });

      expect(response.status).toBe(404);
    });

    it("should return 500 for errors thrown in module functions", async () => {
      createRpcServer({ TestMathModule });

      const response = await callRpc({
        className: "TestMathModule",
        methodName: "divide",
        args: [1, 0],
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Division by zero");
    });

    it("should handle sync module functions", async () => {
      createRpcServer({ TestMathModule });

      const response = await callRpc({
        className: "TestMathModule",
        methodName: "pi",
        args: [],
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(await DSON.parse(text)).toBeCloseTo(Math.PI);
    });
  });

  describe("mixed classes and modules", () => {
    it("should handle class calls alongside module calls", async () => {
      createRpcServer({ TestUserApi, TestMathModule });

      // Call class method
      const classResponse = await callRpc({
        className: "TestUserApi",
        methodName: "getUser",
        args: ["1"],
      });
      expect(classResponse.status).toBe(200);
      const userData = await DSON.parse(await classResponse.text());
      expect(userData.id).toBe("1");
      expect(userData.name).toBe("User 1");

      // Call module function
      const moduleResponse = await callRpc({
        className: "TestMathModule",
        methodName: "multiply",
        args: [6, 7],
      });
      expect(moduleResponse.status).toBe(200);
      const result = await DSON.parse(await moduleResponse.text());
      expect(result).toBe(42);
    });
  });

  describe("hooks", () => {
    it("should fire guard hooks for module calls", async () => {
      createRpcServer({ TestMathModule });
      const guardFn = vi.fn().mockReturnValue(true);
      addHook({ fn: guardFn, phase: "guard" });

      await callRpc({
        className: "TestMathModule",
        methodName: "add",
        args: [1, 2],
      });

      expect(guardFn).toHaveBeenCalledWith(
        "TestMathModule",
        "add",
        [1, 2],
        expect.any(Request),
      );
    });

    it("should reject module calls when guard returns false", async () => {
      createRpcServer({ TestMathModule });
      addHook({ fn: () => false, phase: "guard" });

      const response = await callRpc({
        className: "TestMathModule",
        methodName: "add",
        args: [1, 2],
      });

      expect(response.status).toBe(403);
    });

    it("should fire result hooks for module calls", async () => {
      createRpcServer({ TestMathModule });
      const resultFn = vi.fn();
      addHook({ fn: resultFn, phase: "result" });

      await callRpc({
        className: "TestMathModule",
        methodName: "add",
        args: [3, 4],
      });

      expect(resultFn).toHaveBeenCalledWith(
        "TestMathModule",
        "add",
        [3, 4],
        expect.any(Request),
        7,
      );
    });
  });
});
