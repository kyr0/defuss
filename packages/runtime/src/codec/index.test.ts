import { describe, it, expect } from "vitest";
import * as codec from "./index.js";

describe("codec index", () => {
  it("should export base64 functions", () => {
    expect(codec.binaryToBase64).toBeDefined();
    expect(codec.base64ToBinary).toBeDefined();
  });

  it("should export binary functions", () => {
    expect(codec.hexToBinary).toBeDefined();
    expect(codec.binaryToHex).toBeDefined();
  });

  it("should re-export all codec utilities", () => {
    expect(typeof codec.binaryToBase64).toBe("function");
    expect(typeof codec.base64ToBinary).toBe("function");
    expect(typeof codec.hexToBinary).toBe("function");
    expect(typeof codec.binaryToHex).toBe("function");
  });
});
