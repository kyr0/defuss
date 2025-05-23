import { getEnv } from "./env.js";

describe("unit: environment variables", () => {
  it("unit: get env for API_KEY", () => {
    expect(getEnv("MONGO_CONNECTION_STRING")).not.toBeUndefined();
    expect(typeof getEnv("MONGO_CONNECTION_STRING")).toBe("string"); // Fix: check for string type properly
    expect(getEnv("MONGO_CONNECTION_STRING")).not.toBeNull();
    expect(getEnv("MONGO_CONNECTION_STRING")!.length).toBeGreaterThan(0);
  });

  it("unit: get env from import.meta.env", () => {
    vi.stubEnv("VITE_API_KEY", "test");

    expect(getEnv("VITE_API_KEY")).not.toBeUndefined();
    expect(typeof getEnv("VITE_API_KEY")).toBe("string"); // Fix: check for string type properly
    expect(getEnv("VITE_API_KEY")).not.toBeNull();
    expect(getEnv("VITE_API_KEY")!.length).toBeGreaterThan(0);
  });
});
