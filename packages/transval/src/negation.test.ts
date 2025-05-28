import { describe, it, expect } from "vitest";
import { rule, Rules } from "./api.js";

describe("Negation functionality", () => {
  describe("basic negation", () => {
    it("should negate a failing validation to make it pass", async () => {
      const formData = { value: "not-a-number" };
      const validator = rule("value").not.asNumber().isGreaterThan(0);

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should negate a passing validation to make it fail", async () => {
      const formData = { value: "hello" };
      const validator = rule("value").not.isString();

      expect(await validator.isValid(formData)).toBe(false);
      expect(validator.getMessages()).toContain(
        "Validation was expected to fail but passed",
      );
    });

    it("should work with isEmpty negation", async () => {
      const formData = { value: "not empty" };
      const validator = rule("value").not.isEmpty();

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should work with isRequired negation", async () => {
      const formData = { value: undefined };
      const validator = rule("value").not.isRequired();

      expect(await validator.isValid(formData)).toBe(true);
    });
  });

  describe("negation with transformers", () => {
    it("should apply transformers normally but negate validation", async () => {
      const formData = { age: "25" };
      const validator = rule("age").asNumber().not.isGreaterThan(30);

      expect(await validator.isValid(formData)).toBe(true);
      // Check that transformation still happened
      expect(validator.getField("age")).toBe(25);
      expect(typeof validator.getField("age")).toBe("number");
    });

    it("should transform string and negate isEmpty check", async () => {
      const formData = { name: "  john  " };
      const validator = rule("name").asString().not.isEmpty();

      expect(await validator.isValid(formData)).toBe(true);
      // Transformation should still work
      expect(validator.getField("name")).toBe("  john  ");
    });
  });

  describe("multiple negation prevention", () => {
    it("should throw error when trying to use not twice", () => {
      expect(() => {
        rule("value").not.not.isString();
      }).toThrow("Multiple negations are not allowed in a validation chain");
    });

    it("should throw error when trying to use not after other validators", () => {
      const validator = rule("value").isString();
      expect(() => {
        validator.not.isEmpty();
      }).toThrow("Multiple negations are not allowed in a validation chain");
    });
  });

  describe("negation with custom validators", () => {
    class CustomRules extends Rules {
      customValidator() {
        return ((value: any) => value === "custom") as unknown as Rules & this;
      }

      asCustomTransform() {
        return ((value: any) => `custom_${value}`) as unknown as Rules & this;
      }
    }

    it("should work with custom validators", async () => {
      const customRule = rule.extend(CustomRules);
      const formData = { value: "not-custom" };
      const validator = customRule("value").not.customValidator();

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should work with custom transformers and negated validators", async () => {
      const customRule = rule.extend(CustomRules);
      const formData = { value: "test" };
      const validator = customRule("value")
        .asCustomTransform()
        .not.customValidator();

      expect(await validator.isValid(formData)).toBe(true);
      // Check transformation worked
      expect(validator.getField("value")).toBe("custom_test");
    });
  });

  describe("complex negation scenarios", () => {
    it("should work with multiple validators after negation", async () => {
      const formData = { value: 10 };
      const validator = rule("value").not.isGreaterThan(20).isLessThan(50);

      // 10 is NOT greater than 20 (true) AND 10 is less than 50 (true)
      // But negation applies to entire chain: NOT(false AND true) = NOT(false) = true
      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should work with chained transformers and negated validation", async () => {
      const formData = { value: "123" };
      const validator = rule("value").asNumber().asString().not.isEmpty();

      expect(await validator.isValid(formData)).toBe(true);
      // Check final transformation
      expect(validator.getField("value")).toBe("123");
    });
  });

  describe("negation with comparison validators", () => {
    it("should negate isEqual validation", async () => {
      const formData = { value: "hello" };
      const validator = rule("value").not.isEqual("world");

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should negate isOneOf validation", async () => {
      const formData = { value: "banana" };
      const validator = rule("value").not.isOneOf(["apple", "orange"] as const);

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should negate numeric comparison", async () => {
      const formData = { value: 5 };
      const validator = rule("value").not.isGreaterThan(10);

      expect(await validator.isValid(formData)).toBe(true);
    });
  });

  describe("practical negation examples", () => {
    it("should validate that a string is not empty", async () => {
      const formData = { message: "Hello World" };
      const validator = rule("message").not.isEmpty();

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should validate that a value is not equal to a specific value", async () => {
      const formData = { status: "active" };
      const validator = rule("status").not.isEqual("inactive");

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should validate that a number is not greater than a threshold", async () => {
      const formData = { score: 75 };
      const validator = rule("score").not.isGreaterThan(100);

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should transform and then validate negation", async () => {
      const formData = { count: "5" };
      const validator = rule("count").asNumber().not.isGreaterThan(10);

      expect(await validator.isValid(formData)).toBe(true);
      expect(validator.getField("count")).toBe(5); // Transformed to number
    });

    it("should work with required field negation", async () => {
      const formData = { optionalField: undefined };
      const validator = rule("optionalField").not.isRequired();

      expect(await validator.isValid(formData)).toBe(true);
    });
  });

  describe("negation with async validators", () => {
    class AsyncRules extends Rules {
      // Simple async validator that checks if value equals "async"
      asyncValidator() {
        return (async (value: any) => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return value === "async";
        }) as unknown as Rules & this;
      }

      // Async validator that rejects certain values
      asyncNotEqual(rejectedValue: string) {
        return (async (value: any) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return value !== rejectedValue;
        }) as unknown as Rules & this;
      }

      // Async validator that checks string length
      asyncMinLength(minLength: number) {
        return (async (value: any) => {
          await new Promise((resolve) => setTimeout(resolve, 15));
          return typeof value === "string" && value.length >= minLength;
        }) as unknown as Rules & this;
      }

      // Async transformer that adds prefix
      asAsyncTransform(prefix: string) {
        return (async (value: any) => {
          await new Promise((resolve) => setTimeout(resolve, 8));
          return `${prefix}_${value}`;
        }) as unknown as Rules & this;
      }

      // Async validator that simulates API call
      asyncApiValidator() {
        return (async (value: any) => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          // Simulate API that only accepts values starting with "api"
          return typeof value === "string" && value.startsWith("api");
        }) as unknown as Rules & this;
      }
    }

    const customRule2 = rule.extend(AsyncRules);

    it("should negate async validator that would pass", async () => {
      const formData = { value: "async" };
      const validator = customRule2("value").not.asyncValidator();

      expect(await validator.isValid(formData)).toBe(false);
      expect(validator.getMessages()).toContain(
        "Validation was expected to fail but passed",
      );
    });

    it("should negate async validator that would fail", async () => {
      const formData = { value: "not-async" };
      const validator = customRule2("value").not.asyncValidator();

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should work with async transformers and negated async validators", async () => {
      const formData = { value: "test" };
      const validator = customRule2("value")
        .asAsyncTransform("prefix")
        .not.asyncValidator();

      expect(await validator.isValid(formData)).toBe(true);
      // Check that async transformation worked
      expect(validator.getField("value")).toBe("prefix_test");
    });

    it("should negate async validator with parameters", async () => {
      const formData = { value: "forbidden" };
      const validator = customRule2("value").not.asyncNotEqual("forbidden");

      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should handle multiple async validators with negation", async () => {
      const formData = { value: "short" };
      const validator = customRule2("value").not.asyncMinLength(10);

      // "short" is NOT >= 10 chars (negated from false to true)
      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should work with chained async transformers and negated validation", async () => {
      const formData = { value: "test" };
      const validator = customRule2("value")
        .asAsyncTransform("first")
        .asAsyncTransform("second")
        .not.asyncApiValidator();

      expect(await validator.isValid(formData)).toBe(true);
      // Check final transformation
      expect(validator.getField("value")).toBe("second_first_test");
    });

    it("should handle async validator timeout with negation", async () => {
      class TimeoutRules extends Rules {
        slowAsyncValidator() {
          return (async (value: any) => {
            // This will timeout
            await new Promise((resolve) => setTimeout(resolve, 100));
            return true;
          }) as unknown as Rules & this;
        }
      }

      const timeoutRule = rule.extend(TimeoutRules);
      const formData = { value: "test" };
      const validator = timeoutRule("value", {
        timeout: 50,
      }).not.slowAsyncValidator();

      // Should timeout and throw error
      await expect(validator.isValid(formData)).rejects.toThrow(
        "Validation timeout after 50ms",
      );
    });

    it("should work with mixed sync and async validators with negation", async () => {
      const formData = { value: "test" };
      const validator = customRule2("value").not.asyncValidator();

      // "test" !== "async" (negated from false to true)
      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should handle async validator errors properly with negation", async () => {
      class ErrorRules extends Rules {
        asyncErrorValidator() {
          return (async (value: any) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            if (value === "error") {
              throw new Error("Async validation error");
            }
            return true;
          }) as unknown as Rules & this;
        }
      }

      const errorRule = rule.extend(ErrorRules);
      const formData = { value: "error" };
      const validator = errorRule("value").not.asyncErrorValidator();

      // When error is thrown, negation treats it as validation passing (error becomes true)
      expect(await validator.isValid(formData)).toBe(true);
    });

    it("should work with async validators returning custom error messages", async () => {
      class CustomErrorRules extends Rules {
        asyncCustomErrorValidator() {
          return (async (value: any) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            if (value !== "valid") {
              return "Custom async error message";
            }
            return true;
          }) as unknown as Rules & this;
        }
      }

      const customErrorRule = rule.extend(CustomErrorRules);
      const formData = { value: "invalid" };
      const validator =
        customErrorRule("value").not.asyncCustomErrorValidator();

      expect(await validator.isValid(formData)).toBe(true);
      // When negated, original validation failed (has custom message), but negation makes it pass
      // However, the original messages are preserved in the result
      expect(validator.getMessages()).toContain("Custom async error message");
    });
  });
});
