import { describe, it, expect } from "vitest";
import { isTypedArray, isCallOptions } from "./types.js";

// --- isTypedArray ---------------------------------------------------

describe("isTypedArray", () => {
  it("returns true for Float32Array", () => {
    expect(isTypedArray(new Float32Array(4))).toBe(true);
  });

  it("returns true for Float64Array", () => {
    expect(isTypedArray(new Float64Array(4))).toBe(true);
  });

  it("returns true for Int8Array", () => {
    expect(isTypedArray(new Int8Array(4))).toBe(true);
  });

  it("returns true for Int16Array", () => {
    expect(isTypedArray(new Int16Array(4))).toBe(true);
  });

  it("returns true for Int32Array", () => {
    expect(isTypedArray(new Int32Array(4))).toBe(true);
  });

  it("returns true for Uint8Array", () => {
    expect(isTypedArray(new Uint8Array(4))).toBe(true);
  });

  it("returns true for Uint16Array", () => {
    expect(isTypedArray(new Uint16Array(4))).toBe(true);
  });

  it("returns true for Uint32Array", () => {
    expect(isTypedArray(new Uint32Array(4))).toBe(true);
  });

  it("returns false for DataView", () => {
    expect(isTypedArray(new DataView(new ArrayBuffer(8)))).toBe(false);
  });

  it("returns false for plain Array", () => {
    expect(isTypedArray([1, 2, 3])).toBe(false);
  });

  it("returns false for ArrayBuffer", () => {
    expect(isTypedArray(new ArrayBuffer(8))).toBe(false);
  });

  it("returns false for number", () => {
    expect(isTypedArray(42)).toBe(false);
  });

  it("returns false for string", () => {
    expect(isTypedArray("hello")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTypedArray(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTypedArray(undefined)).toBe(false);
  });

  it("returns false for object", () => {
    expect(isTypedArray({ length: 4 })).toBe(false);
  });
});

// --- isCallOptions --------------------------------------------------

describe("isCallOptions", () => {
  it("returns true for { cores: 4 }", () => {
    expect(isCallOptions({ cores: 4 })).toBe(true);
  });

  it("returns true for { signal: AbortSignal }", () => {
    const controller = new AbortController();
    expect(isCallOptions({ signal: controller.signal })).toBe(true);
  });

  it("returns true for { transfer: true }", () => {
    expect(isCallOptions({ transfer: true })).toBe(true);
  });

  it("returns true for { cores: 2, signal: AbortSignal }", () => {
    const controller = new AbortController();
    expect(isCallOptions({ cores: 2, signal: controller.signal })).toBe(true);
  });

  it("returns false for plain number", () => {
    expect(isCallOptions(42)).toBe(false);
  });

  it("returns false for plain string", () => {
    expect(isCallOptions("hello")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isCallOptions(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCallOptions(undefined)).toBe(false);
  });

  it("returns false for plain Array", () => {
    expect(isCallOptions([1, 2, 3])).toBe(false);
  });

  it("returns false for TypedArray", () => {
    expect(isCallOptions(new Float32Array(4))).toBe(false);
  });

  it("returns false for empty object (no recognized keys)", () => {
    expect(isCallOptions({})).toBe(false);
  });

  it("returns false for object with unrelated keys", () => {
    expect(isCallOptions({ name: "test", value: 42 })).toBe(false);
  });
});
