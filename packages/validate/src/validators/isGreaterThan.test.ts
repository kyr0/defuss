import { isGreaterThan } from "./index.js";

describe("isGreaterThan", () => {
  it("returns true if the value is a number and is greater than the minimum value", () => {
    expect(isGreaterThan(5, 4, false)).toBe(true);
  });

  it("returns true if the value is a number equal to the minimum value and inclusive flag is set", () => {
    expect(isGreaterThan(4, 4, true)).toBe(true);
  });

  it("returns false if the value is not a number", () => {
    expect(isGreaterThan("4", 4, true)).toBe(false);
    expect(isGreaterThan({}, 4, true)).toBe(false);
  });

  it("returns false if the value is a number but less than the minimum value", () => {
    expect(isGreaterThan(3, 4, false)).toBe(false);
  });

  it("returns false if the value is a number but equal to the minimum value and inclusive flag is not set", () => {
    expect(isGreaterThan(4, 4, false)).toBe(false);
  });
});
