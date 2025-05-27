import { describe, it, expect } from "vitest";
import * as time from "./index.js";

describe("time index", () => {
  it("should export debounce function", () => {
    expect(time.debounce).toBeDefined();
    expect(typeof time.debounce).toBe("function");
  });

  it("should export throttle function", () => {
    expect(time.throttle).toBeDefined();
    expect(typeof time.throttle).toBe("function");
  });

  it("should export waitFor function", () => {
    expect(time.wait).toBeDefined();
    expect(typeof time.wait).toBe("function");
  });

  it("should export waitForWithPolling function", () => {
    expect(time.waitForWithPolling).toBeDefined();
    expect(typeof time.waitForWithPolling).toBe("function");
  });

  it("should export waitForRef function", () => {
    expect(time.waitForRef).toBeDefined();
    expect(typeof time.waitForRef).toBe("function");
  });

  it("should export createTimeoutPromise function", () => {
    expect(time.createTimeoutPromise).toBeDefined();
    expect(typeof time.createTimeoutPromise).toBe("function");
  });

  it("should re-export all time utilities", () => {
    const exportedFunctions = Object.keys(time);
    expect(exportedFunctions).toContain("debounce");
    expect(exportedFunctions).toContain("throttle");
    expect(exportedFunctions).toContain("wait");
    expect(exportedFunctions).toContain("waitForWithPolling");
    expect(exportedFunctions).toContain("waitForRef");
    expect(exportedFunctions).toContain("createTimeoutPromise");
  });
});
