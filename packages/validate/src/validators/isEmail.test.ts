import { isEmail } from "./index.js";

describe("isEmail", () => {
  it("returns true for valid email addresses", () => {
    expect(isEmail("user@example.com")).toBe(true);
    expect(isEmail("user+label@example.com")).toBe(true);
    expect(isEmail("user@subdomain.example.com")).toBe(true);
  });

  it("returns false for invalid email addresses", () => {
    expect(isEmail("user")).toBe(false);
    expect(isEmail("@example.com")).toBe(false);
    expect(isEmail("user@")).toBe(false);
    expect(isEmail("user@example")).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail(null)).toBe(false);
  });
});
