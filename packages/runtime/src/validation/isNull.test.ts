import { isNull } from "./isNull.js";

describe("isNull", () => {
  it("returns true for null values", () => {
    expect(isNull(null)).toBe(true);
    expect(isNull(undefined)).toBe(false);
    expect(isNull("")).toBe(false);
    expect(isNull(0)).toBe(false);
    expect(isNull(false)).toBe(false);
  });
});
