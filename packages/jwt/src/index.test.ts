import { createAuth, getKeysFromEnv } from "./index.js";

describe("Test the exports", () => {
  it("should export createAuth", () => {
    expect(createAuth).toBeDefined();
  });

  it("should export getKeysFromEnv", () => {
    expect(getKeysFromEnv).toBeDefined();
  });
});
