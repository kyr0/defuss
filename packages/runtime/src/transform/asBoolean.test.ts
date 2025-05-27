import { asBoolean } from "./asBoolean.js";

describe("asBoolean", () => {
  it("should be defined", () => {
    expect(asBoolean).toBeDefined();
  });

  it("should return the same boolean for boolean input", () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean(false)).toBe(false);
  });

  it("should handle truthy string values", () => {
    expect(asBoolean("true")).toBe(true);
    expect(asBoolean("TRUE")).toBe(true);
    expect(asBoolean("True")).toBe(true);
    expect(asBoolean("TrUe")).toBe(true);

    expect(asBoolean("1")).toBe(true);
    expect(asBoolean("yes")).toBe(true);
    expect(asBoolean("YES")).toBe(true);
    expect(asBoolean("Yes")).toBe(true);

    expect(asBoolean("on")).toBe(true);
    expect(asBoolean("ON")).toBe(true);
    expect(asBoolean("On")).toBe(true);
  });

  it("should handle falsy string values", () => {
    expect(asBoolean("false")).toBe(false);
    expect(asBoolean("FALSE")).toBe(false);
    expect(asBoolean("False")).toBe(false);

    expect(asBoolean("0")).toBe(false);
    expect(asBoolean("no")).toBe(false);
    expect(asBoolean("NO")).toBe(false);
    expect(asBoolean("off")).toBe(false);
    expect(asBoolean("OFF")).toBe(false);

    expect(asBoolean("")).toBe(false);
    expect(asBoolean(" ")).toBe(false);
    expect(asBoolean("random")).toBe(false);
    expect(asBoolean("hello")).toBe(false);
  });

  it("should handle numbers", () => {
    expect(asBoolean(1)).toBe(true);
    expect(asBoolean(42)).toBe(true);
    expect(asBoolean(-1)).toBe(true);
    expect(asBoolean(3.14)).toBe(true);
    expect(asBoolean(Number.POSITIVE_INFINITY)).toBe(true);
    expect(asBoolean(Number.NEGATIVE_INFINITY)).toBe(true);

    expect(asBoolean(0)).toBe(false);
    expect(asBoolean(-0)).toBe(false);
    expect(asBoolean(Number.NaN)).toBe(true); // NaN !== 0 evaluates to true
  });

  it("should use Boolean() for other types", () => {
    expect(asBoolean(null)).toBe(false);
    expect(asBoolean(undefined)).toBe(false);
    expect(asBoolean({})).toBe(true);
    expect(asBoolean([])).toBe(true);
    expect(asBoolean(() => {})).toBe(true);
    expect(asBoolean(new Date())).toBe(true);
    expect(asBoolean(Symbol("test"))).toBe(true);
  });

  it("should handle edge cases", () => {
    expect(asBoolean("  true  ")).toBe(false); // whitespace makes it not match "true"
    expect(asBoolean("  false  ")).toBe(false);
    expect(asBoolean("\ttrue\n")).toBe(false); // whitespace makes it not match
    expect(asBoolean("2")).toBe(false); // only "1" is considered true
    expect(asBoolean("10")).toBe(false);
  });
});
