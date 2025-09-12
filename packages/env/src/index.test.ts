import { getEnv, isValidEnvKey, load, parse, setEnv } from "./index.js";

describe("Test the exports", () => {
  it("should export getEnv", () => {
    expect(getEnv).toBeDefined();
  });

  it("should export isValidEnvKey", () => {
    expect(isValidEnvKey).toBeDefined();
  });

  it("should export load", () => {
    expect(load).toBeDefined();
  });

  it("should export parse", () => {
    expect(parse).toBeDefined();
  });

  it("should export setEnv", () => {
    expect(setEnv).toBeDefined();
  });
});
