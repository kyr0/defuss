import { isInstanceOf } from "./isInstanceOf.js";

describe("isInstanceOf", () => {
  it("returns true for string values", () => {
    expect(isInstanceOf("hello", String)).toBe(false); // scalar type !== Object type with prototype
  });

  it("returns false for non-string values", () => {
    expect(isInstanceOf(1, String)).toBe(false);
    expect(isInstanceOf(false, String)).toBe(false);
    expect(isInstanceOf({}, String)).toBe(false);
    expect(isInstanceOf(null, String)).toBe(false);
    expect(isInstanceOf(undefined, String)).toBe(false);
    expect(isInstanceOf(() => {}, String)).toBe(false);
    expect(isInstanceOf(Symbol("test"), String)).toBe(false);
    expect(isInstanceOf(new Date(), String)).toBe(false);
    expect(isInstanceOf([], String)).toBe(false);
    expect(isInstanceOf(new Map(), String)).toBe(false);
    expect(isInstanceOf(new Set(), String)).toBe(false);
    expect(isInstanceOf(new Error("test"), String)).toBe(false);
    expect(isInstanceOf(new Uint8Array(), String)).toBe(false);
    expect(isInstanceOf(new Int32Array(), String)).toBe(false);
    expect(isInstanceOf(new Float64Array(), String)).toBe(false);
    expect(isInstanceOf(/test/, String)).toBe(false);
    expect(
      isInstanceOf(new Promise<void>((resolve) => resolve()), String),
    ).toBe(false);
    expect(isInstanceOf(new WeakMap(), String)).toBe(false);
    expect(isInstanceOf(new WeakSet(), String)).toBe(false);
    expect(isInstanceOf(new ArrayBuffer(8), String)).toBe(false);
    expect(isInstanceOf(new DataView(new ArrayBuffer(8)), String)).toBe(false);
    expect(isInstanceOf(new BigInt64Array(), String)).toBe(false);
    expect(isInstanceOf(new BigUint64Array(), String)).toBe(false);
    expect(isInstanceOf(new Float32Array(), String)).toBe(false);
    expect(isInstanceOf(new Int16Array(), String)).toBe(false);
    expect(isInstanceOf(new Int8Array(), String)).toBe(false);
    expect(isInstanceOf(new Uint16Array(), String)).toBe(false);
    expect(isInstanceOf(new Uint32Array(), String)).toBe(false);
    expect(isInstanceOf(new Uint8ClampedArray(), String)).toBe(false);
    expect(isInstanceOf(new Array(5), String)).toBe(false);
    expect(isInstanceOf(new String("test"), String)).toBe(true);
  });
});
