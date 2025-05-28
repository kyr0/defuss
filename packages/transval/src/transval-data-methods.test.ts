import { describe, expect, it } from "vitest";
import { access } from "defuss-runtime";
import { rule, transval } from "./api.js";

interface TestData {
  name: string;
  age: number;
  nested: {
    value: string;
  };
}

describe("transval getData() and getField() methods", () => {
  const testData: TestData = {
    name: "John",
    age: 25,
    nested: {
      value: "test",
    },
  };

  it("should return transformed data with getData()", async () => {
    const validation = transval(
      rule("name").isString().asString(),
      rule("age").isSafeNumber().asString(),
    );

    await validation.isValid(testData);
    const data = validation.getData();

    expect(data).toBeDefined();
    expect(data.name).toBe("John");
    expect(data.age).toBe("25"); // transformed to string
  });

  it("should return field value with getField() using string path", async () => {
    const validation = transval(
      rule("name").isString(),
      rule("nested.value").isString().asString(),
    );

    await validation.isValid(testData);

    expect(validation.getField("name")).toBe("John");
    expect(validation.getField("nested.value")).toBe("test");
  });

  it("should return field value with getField() using PathAccessor", async () => {
    const acc = access<TestData>();

    const validation = transval(
      rule(acc.name).isString(),
      rule(acc.nested.value).isString(),
    );

    await validation.isValid(testData);

    expect(validation.getField(acc.name)).toBe("John");
    expect(validation.getField(acc.nested.value)).toBe("test");
  });

  it("should return undefined for non-existent fields", async () => {
    const validation = transval(rule("name").isString());

    await validation.isValid(testData);

    expect(validation.getField("nonexistent")).toBeUndefined();
  });

  it("should handle transformed data correctly", async () => {
    const validation = transval(rule("age").isSafeNumber().asString());

    await validation.isValid(testData);

    // Original value should still be accessible
    expect(validation.getField("age")).toBe("25"); // transformed to string
  });

  it("should return undefined when getData() called before validation", () => {
    const validation = transval(rule("name").isString());

    // getData() called before isValid()
    const data = validation.getData();
    expect(data).toBeUndefined();
  });

  it("should return undefined when getField() called before validation", () => {
    const validation = transval(rule("name").isString());

    // getField() called before isValid()
    const value = validation.getField("name");
    expect(value).toBeUndefined();
  });
});
