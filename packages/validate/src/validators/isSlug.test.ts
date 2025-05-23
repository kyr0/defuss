import { isSlug } from "./index.js";

describe("isSlug", () => {
  it("returns true if the value is a valid slug", () => {
    expect(isSlug("valid-slug")).toBe(true);
    expect(isSlug("valid-2-slug")).toBe(true);
  });

  it("returns false if the value is not a valid slug", () => {
    expect(isSlug("invalid slug")).toBe(false);
    expect(isSlug("invalid_slug")).toBe(false);
  });
});
