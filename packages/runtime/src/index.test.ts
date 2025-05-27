import { describe, it, expect } from "vitest";
import * as runtime from "./index.js";

describe("runtime index", () => {
  it("should export all codec functions", () => {
    expect(runtime.binaryToBase64).toBeDefined();
    expect(runtime.base64ToBinary).toBeDefined();
    expect(runtime.hexToBinary).toBeDefined();
    expect(runtime.binaryToHex).toBeDefined();
  });

  it("should export all transform functions", () => {
    expect(runtime.asString).toBeDefined();
    expect(runtime.asNumber).toBeDefined();
    expect(runtime.asBoolean).toBeDefined();
    expect(runtime.asArray).toBeDefined();
    expect(runtime.asDate).toBeDefined();
    expect(runtime.asInteger).toBeDefined();
  });

  it("should export all time functions", () => {
    expect(runtime.debounce).toBeDefined();
    expect(runtime.throttle).toBeDefined();
    expect(runtime.wait).toBeDefined();
    expect(runtime.waitForWithPolling).toBeDefined();
    expect(runtime.waitForRef).toBeDefined();
    expect(runtime.createTimeoutPromise).toBeDefined();
  });

  it("should export all datatype functions", () => {
    expect(runtime.unique).toBeDefined();
    expect(runtime.equalsJSON).toBeDefined();
    expect(runtime.omit).toBeDefined();
    expect(runtime.pick).toBeDefined();
    expect(runtime.getAllKeysFromPath).toBeDefined();
    expect(runtime.getByPath).toBeDefined();
    expect(runtime.setByPath).toBeDefined();
    expect(runtime.ensureKey).toBeDefined();
  });

  it("should export all validation functions", () => {
    expect(runtime.isAfter).toBeDefined();
    expect(runtime.isArray).toBeDefined();
    expect(runtime.isBefore).toBeDefined();
    expect(runtime.isDate).toBeDefined();
    expect(runtime.isDefined).toBeDefined();
    expect(runtime.isEmail).toBeDefined();
    expect(runtime.isEmpty).toBeDefined();
    expect(runtime.is).toBeDefined();
    expect(runtime.isEqual).toBeDefined();
    expect(runtime.isGreaterThan).toBeDefined();
    expect(runtime.isSafeNumber).toBeDefined();
    expect(runtime.isSafeNumeric).toBeDefined();
    expect(runtime.isObject).toBeDefined();
    expect(runtime.isOneOf).toBeDefined();
    expect(runtime.isPhoneNumber).toBeDefined();
    expect(runtime.isRequired).toBeDefined();
    expect(runtime.isSlug).toBeDefined();
    expect(runtime.isLessThan).toBeDefined();
    expect(runtime.isString).toBeDefined();
    expect(runtime.isUrl).toBeDefined();
    expect(runtime.isUrlPath).toBeDefined();
    expect(runtime.getDateValue).toBeDefined();
    expect(runtime.isLongerThan).toBeDefined();
    expect(runtime.isShorterThan).toBeDefined();
    expect(runtime.hasPattern).toBeDefined();
    expect(runtime.isInteger).toBeDefined();
  });
});
