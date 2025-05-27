import { isTypeOf } from "./isTypeOf.js";

describe("isTypeOf", () => {
  it("returns true for string values", () => {
    expect(isTypeOf("hello", "string")).toBe(true);
  });

  it("returns false for non-string values", () => {
    expect(isTypeOf(1, "string")).toBe(false);
    expect(isTypeOf(false, "string")).toBe(false);
    expect(isTypeOf({}, "string")).toBe(false);
    expect(isTypeOf(null, "string")).toBe(false);
    expect(isTypeOf(undefined, "string")).toBe(false);
    expect(isTypeOf(() => {}, "string")).toBe(false);
    expect(isTypeOf(Symbol("test"), "string")).toBe(false);
    expect(isTypeOf(new Date(), "string")).toBe(false);
    expect(isTypeOf([], "string")).toBe(false);
    expect(isTypeOf(new Map(), "string")).toBe(false);
    expect(isTypeOf(new Set(), "string")).toBe(false);
    expect(isTypeOf(new Error("test"), "string")).toBe(false);
    expect(isTypeOf(new Uint8Array(), "string")).toBe(false);
    expect(isTypeOf(new Int32Array(), "string")).toBe(false);
    expect(isTypeOf(new Float64Array(), "string")).toBe(false);
    expect(isTypeOf(/test/, "string")).toBe(false);
    expect(isTypeOf(new Promise<void>((resolve) => resolve()), "string")).toBe(
      false,
    );
    expect(isTypeOf(new WeakMap(), "string")).toBe(false);
    expect(isTypeOf(new WeakSet(), "string")).toBe(false);
    expect(isTypeOf(new ArrayBuffer(8), "string")).toBe(false);
    expect(isTypeOf(new DataView(new ArrayBuffer(8)), "string")).toBe(false);
    expect(isTypeOf(new BigInt64Array(), "string")).toBe(false);
    expect(isTypeOf(new BigUint64Array(), "string")).toBe(false);
    expect(isTypeOf(new Float32Array(), "string")).toBe(false);
    expect(isTypeOf(new Int16Array(), "string")).toBe(false);
  });
});
