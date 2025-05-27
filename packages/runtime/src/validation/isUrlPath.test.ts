import { isUrlPath } from "./index.js";

describe("isUrlPath", () => {
  it("should return true for a valid URL path", () => {
    expect(isUrlPath("abc/def")).toBe(true);
    expect(isUrlPath("abc-def")).toBe(true);
    expect(isUrlPath("abc_def")).toBe(true);
  });

  it("should return false for an invalid URL path", () => {
    expect(isUrlPath("")).toBe(false);
    expect(isUrlPath(null)).toBe(false);
    expect(isUrlPath("abc!def")).toBe(false);
    expect(isUrlPath("abc@def")).toBe(false);
    expect(isUrlPath("abc#def")).toBe(false);
  });
});
