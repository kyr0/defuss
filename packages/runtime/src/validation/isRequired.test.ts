import { isRequired } from "./index.js";

describe("isRequired", () => {
  it("returns true for a non-empty string", () => {
    expect(isRequired("Hello World")).toBe(true);
  });

  it("returns true for a non-zero number", () => {
    expect(isRequired(123)).toBe(true);
  });

  it("returns true for an object", () => {
    expect(isRequired({})).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(isRequired("")).toBe(false);
  });

  it("returns false for a zero number", () => {
    expect(isRequired(0)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRequired(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRequired(undefined)).toBe(false);
  });
});
