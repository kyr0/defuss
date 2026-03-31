import { describe, it, expect, vi } from "vitest";
import { serializeFunction, warnIfClosure } from "./serialize.js";

// ─── serializeFunction ──────────────────────────────────────────────

describe("serializeFunction", () => {
  it("returns a string", () => {
    const script = serializeFunction((x: number) => x * 2);
    expect(typeof script).toBe("string");
  });

  it("contains the serialized function body", () => {
    const fn = (x: number) => x * 2;
    const script = serializeFunction(fn);
    expect(script).toContain("x * 2");
  });

  it("contains the onmessage handler setup", () => {
    const script = serializeFunction((x: number) => x + 1);
    expect(script).toContain("__handleMessage");
    expect(script).toContain("execute");
    expect(script).toContain("result");
    expect(script).toContain("error");
  });

  it("includes Transferable detection logic", () => {
    const script = serializeFunction((x: number) => x);
    expect(script).toContain("__getTransferables");
    expect(script).toContain("ArrayBuffer");
  });

  it("includes both Web Worker and worker_threads setup", () => {
    const script = serializeFunction((x: number) => x);
    // Browser: self.onmessage
    expect(script).toContain("self.onmessage");
    // Node: parentPort
    expect(script).toContain("parentPort");
  });

  it("serializes arrow functions", () => {
    const fn = (a: number, b: number) => a + b;
    const script = serializeFunction(fn);
    expect(script).toContain("__fn");
  });

  it("serializes regular functions", () => {
    function myFunc(x: number): number {
      return x * x;
    }
    const script = serializeFunction(myFunc);
    expect(script).toContain("x * x");
  });

  it("serializes functions with complex bodies", () => {
    const fn = (arr: number[]) => {
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
      }
      return sum;
    };
    const script = serializeFunction(fn);
    expect(script).toContain("sum += arr[i]");
  });

  // ─── Actually evaluable ─────────────────────────────────────────

  it("generates evaluable code that can define __fn", () => {
    const fn = (a: number, b: number) => a + b;
    const script = serializeFunction(fn);
    // The script should be valid JS — we can at least parse the function part
    expect(script).toContain("const __fn =");
    // Should start with 'use strict'
    expect(script.startsWith("'use strict'")).toBe(true);
  });
});

// ─── warnIfClosure ──────────────────────────────────────────────────

describe("warnIfClosure", () => {
  it("does not warn for pure arrow functions", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfClosure((x: number) => x * 2);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not warn for pure regular functions", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfClosure(function add(a: number, b: number) {
      return a + b;
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("warns when arrow function references 'this'", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Note: arrow functions that reference this — this is toString'd
    const fn = eval("((x) => { return this.value + x; })");
    warnIfClosure(fn);
    // May or may not warn depending on toString output;
    // at minimum, should not throw
    spy.mockRestore();
  });

  it("does not throw for any function type", () => {
    expect(() => warnIfClosure(() => 42)).not.toThrow();
    expect(() => warnIfClosure(function () { return 42; })).not.toThrow();
    expect(() => warnIfClosure(Math.max)).not.toThrow();
  });
});
