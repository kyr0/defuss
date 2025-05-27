import { isEmpty } from "./index.js";

describe("isEmpty", () => {
  it("returns true for null and undefined values", () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it("returns true for empty arrays", () => {
    expect(isEmpty([])).toBe(true);
  });

  it("returns false for non-empty arrays", () => {
    expect(isEmpty([1, 2, 3])).toBe(false);
  });

  it("returns true for empty objects", () => {
    expect(isEmpty({})).toBe(true);
  });

  it("returns false for non-empty objects", () => {
    expect(isEmpty({ a: 1, b: 2 })).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(isEmpty("")).toBe(true);
  });

  it("returns false for non-empty strings", () => {
    expect(isEmpty("abc")).toBe(false);
  });

  it("returns true for dates", () => {
    expect(isEmpty(new Date())).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isEmpty(1)).toBe(false);
  });

  it("returns false for booleans", () => {
    expect(isEmpty(true)).toBe(false);
  });
});
