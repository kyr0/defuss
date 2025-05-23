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
});
