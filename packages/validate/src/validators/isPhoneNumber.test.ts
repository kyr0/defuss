import { isPhoneNumber } from "./index.js";

describe("isPhoneNumber", () => {
  it("should return true if the value is a valid phone number", () => {
    expect(isPhoneNumber("+11234567890")).toBe(true);
    expect(isPhoneNumber("+441234567890")).toBe(true);
    expect(isPhoneNumber("+919167299896")).toBe(true);
  });

  it("should return false if the value is not a valid phone number", () => {
    expect(isPhoneNumber(undefined)).toBe(false);
    expect(isPhoneNumber(null)).toBe(false);
    expect(isPhoneNumber(1)).toBe(false);
    expect(isPhoneNumber(true)).toBe(false);
    expect(isPhoneNumber("abc")).toBe(false);
    expect(isPhoneNumber("11234567890")).toBe(false);
  });
});
