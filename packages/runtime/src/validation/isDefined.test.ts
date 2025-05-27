import { isDefined } from "./index.js";

describe("isDefined", () => {
  it("returns true if value is defined", () => {
    expect(isDefined(true)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined([])).toBe(true);
    expect(isDefined({})).toBe(true);
  });

  it("returns false if value is undefined", () => {
    expect(isDefined(undefined)).toBe(false);
  });
});
