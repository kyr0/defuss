import { describe, it, expect } from "vitest";
import * as multicore from "./index.js";

describe("defuss-multicore exports", () => {
  it("exports multicore HOF", () => {
    expect(multicore.multicore).toBeDefined();
    expect(typeof multicore.multicore).toBe("function");
  });

  it("exports getPoolSize", () => {
    expect(multicore.getPoolSize).toBeDefined();
    expect(typeof multicore.getPoolSize).toBe("function");
  });

  it("exports parallel array methods", () => {
    expect(multicore.map).toBeDefined();
    expect(multicore.filter).toBeDefined();
    expect(multicore.reduce).toBeDefined();
    expect(typeof multicore.map).toBe("function");
    expect(typeof multicore.filter).toBe("function");
    expect(typeof multicore.reduce).toBe("function");
  });

  it("exports vector/matrix ops", () => {
    expect(multicore.dotProduct).toBeDefined();
    expect(multicore.matmul).toBeDefined();
    expect(multicore.matadd).toBeDefined();
    expect(multicore.matsub).toBeDefined();
    expect(multicore.matdiv).toBeDefined();
    expect(typeof multicore.dotProduct).toBe("function");
    expect(typeof multicore.matmul).toBe("function");
    expect(typeof multicore.matadd).toBe("function");
    expect(typeof multicore.matsub).toBe("function");
    expect(typeof multicore.matdiv).toBe("function");
  });
});
