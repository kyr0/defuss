import { isOneOf } from "./index.js";

describe("isOneOf", () => {
  it("returns true if the value is one of the options", () => {
    expect(isOneOf("foo", ["foo", "bar"])).toBe(true);
    expect(isOneOf(123, [123, 456])).toBe(true);
  });

  it("returns false if the value is not one of the options", () => {
    expect(isOneOf("baz", ["foo", "bar"])).toBe(false);
    expect(isOneOf(789, [123, 456])).toBe(false);
  });
});
