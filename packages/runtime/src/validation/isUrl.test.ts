import { isUrl } from "./index.js";

describe("isUrl", () => {
  it("returns true for valid URL", () => {
    expect(isUrl("http://www.example.com")).toBe(true);
    expect(isUrl("https://www.example.com")).toBe(true);
    expect(isUrl("ftp://www.example.com")).toBe(true);
  });

  it("returns false for invalid URL", () => {
    expect(isUrl("")).toBe(false);
    expect(isUrl("example.com")).toBe(false);
    expect(isUrl("www.example.com")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isUrl(null)).toBe(false);
    expect(isUrl(undefined)).toBe(false);
    expect(isUrl(123)).toBe(false);
    expect(isUrl(true)).toBe(false);
    expect(isUrl({})).toBe(false);
    expect(isUrl([])).toBe(false);
  });
});
