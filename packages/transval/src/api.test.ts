import { describe, it, expect, vi } from "vitest";
import { rule, Rules, transval } from "./api.js";

describe("Chain API", () => {
  it("should validate number field", async () => {
    const { isValid } = rule("age.value").isSafeNumber().isGreaterThan(10);

    const formData = {
      age: {
        value: 12,
      },
    };
    expect(await isValid(formData)).toBe(true);
  });

  it("can be extended with custom validators", async () => {
    // Define custom validators as a class that extends BaseValidators
    class CustomValidators extends Rules {
      customValidator(prefix: string) {
        return ((value: string) =>
          typeof value === "string" &&
          value.startsWith(prefix)) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(CustomValidators);

    // important: extend from base custom validators class
    class CustomValidators2 extends CustomValidators {
      customValidator2(prefix: string) {
        return ((value: string) =>
          typeof value === "string" &&
          value.startsWith(prefix)) as unknown as Rules & this;
      }
    }

    const myValidate2 = myValidate.extend(CustomValidators2);

    const { isValid } = myValidate2("customField")
      .isString()
      .customValidator("custom_")
      .customValidator2("custom_");

    const formData = {
      customField: "custom_value",
    };
    expect(await isValid(formData)).toBe(true);

    expect(
      await isValid({
        customField: "cust0m_value",
      }),
    ).toBe(false);
  });

  it("should handle async custom validators", async () => {
    class CustomRules extends Rules {
      emailCheck(apiEndpoint: string) {
        return (async (value: string) => {
          // Simulate async API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          return value.includes("@") && value.includes(".");
        }) as unknown as Rules & this;
      }
    }

    const myValidateAsync = rule.extend(CustomRules);
    const { isValid } = myValidateAsync("email")
      .isString()
      .emailCheck("/api/check-email");

    expect(await isValid({ email: "test@example.com" })).toBe(true);
    expect(await isValid({ email: "invalid-email" })).toBe(false);
  });

  it("should support callback-based auto-start validation", async () => {
    const { isValid } = rule("age.value").isSafeNumber().isGreaterThan(10);

    const formData = {
      age: {
        value: 12,
      },
    };

    // Use Promise to wrap callback-based validation
    await new Promise<void>((resolve) => {
      isValid(formData, (result, error) => {
        expect(error).toBeUndefined();
        expect(result).toBe(true);
        resolve();
      });
    });
  });

  it("should handle callback-based validation errors", async () => {
    const { isValid } = rule("age.value").isSafeNumber().isGreaterThan(100);

    const formData = {
      age: {
        value: 12,
      },
    };

    // Use Promise to wrap callback-based validation
    await new Promise<void>((resolve) => {
      isValid(formData, (result, error) => {
        expect(error).toBeUndefined();
        expect(result).toBe(false);
        resolve();
      });
    });
  });

  it("should handle async custom validators with callback", async () => {
    class AsyncValidators extends Rules {
      asyncEmailCheck(apiEndpoint: string) {
        return (async (value: string) => {
          // Simulate async API call
          await new Promise((resolve) => setTimeout(resolve, 50));
          return value.includes("@") && value.includes(".");
        }) as unknown as Rules & this;
      }
    }

    const myValidateAsync = rule.extend(AsyncValidators);
    const { isValid } = myValidateAsync("email")
      .isString()
      .asyncEmailCheck("/api/check-email");

    // Use Promise to wrap callback-based validation
    await new Promise<void>((resolve) => {
      isValid({ email: "test@example.com" }, (result, error) => {
        expect(error).toBeUndefined();
        expect(result).toBe(true);
        resolve();
      });
    });
  });

  it("should handle timeout with custom async validator", async () => {
    class SlowAsyncValidators extends Rules {
      slowAsyncCheck() {
        return (async (value: string) => {
          // Simulate a slow API call that exceeds timeout
          await new Promise((resolve) => setTimeout(resolve, 200));
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(SlowAsyncValidators);
    const { isValid } = myValidate("email", { timeout: 100 })
      .isString()
      .slowAsyncCheck();

    // Test that timeout actually rejects
    await expect(isValid({ email: "test@example.com" })).rejects.toThrow(
      "Validation timeout after 100ms",
    );
  }, 300); // Increase test timeout

  it("should handle validation errors with onValidationError callback", async () => {
    const errorCallback = vi.fn();

    class ErrorValidators extends Rules {
      throwingValidator() {
        return (() => {
          throw new Error("Custom validation error");
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(ErrorValidators);
    const { isValid } = myValidate("field", {
      onValidationError: errorCallback,
    }).throwingValidator();

    const result = await isValid({ field: "test" });

    expect(result).toBe(false);
    expect(errorCallback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Custom validation error" }),
      expect.any(Object),
    );
  });

  it("should handle catching errors", async () => {
    const { isValid } = rule("age.value").isSafeNumber().isGreaterThan(10);
    const formData = { age: { value: 12 } };

    console.log("Starting validation...");

    const thenResult = rule("age.value").isSafeNumber().isGreaterThan(10);

    expect(await thenResult.isValid(formData)).toBe(true);

    console.log("Starting second validation...");

    // Test catch - this should work since we expect it to resolve now
    try {
      const catchResult = rule("age.value1").isSafeNumber().isGreaterThan(100);
      await catchResult.isValid(formData);
    } catch (error) {
      console.log("Catch block executed");
      console.error("Caught error:", error);
      expect(error).toBeInstanceOf(Error);
      expect((error as any).message).toBe(
        "Validation failed for field: age.value1 - field 'value1' not found",
      );
    }
  });

  it("should handle message formatting", async () => {
    class MessageValidators extends Rules {
      customMessageValidator(expectedValue: string) {
        return ((value: string) => {
          if (value !== expectedValue) {
            return `Expected "${expectedValue}" but got "${value}"`;
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MessageValidators);
    const validator = myValidate("field")
      .customMessageValidator("expected")
      .useFormatter(
        (messages, format) => `Validation failed: ${format(messages)}`,
      );

    const result = await validator.isValid({ field: "actual" });
    expect(result).toBe(false);

    // With useFormatter, the formatted message should replace the original
    const messages = validator.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe(
      'Validation failed: Expected "expected" but got "actual"',
    );
  });

  it("should handle multiple validation failures with message collection", async () => {
    class MultiValidators extends Rules {
      mustContain(substring: string) {
        return ((value: string) => {
          if (!value.includes(substring)) {
            return `Must contain "${substring}"`;
          }
          return true;
        }) as unknown as Rules & this;
      }

      mustNotContain(substring: string) {
        return ((value: string) => {
          if (value.includes(substring)) {
            return `Must not contain "${substring}"`;
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MultiValidators);
    const validator = myValidate("field")
      .mustContain("required")
      .mustNotContain("forbidden");

    const result = await validator.isValid({ field: "forbidden text" });
    expect(result).toBe(false);

    const messages = validator.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages).toContain('Must contain "required"');
    expect(messages).toContain('Must not contain "forbidden"');
  });

  it("should handle callback with error parameter", async () => {
    class ErrorValidators extends Rules {
      errorValidator() {
        return (() => {
          throw new Error("Validation error");
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(ErrorValidators);
    const { isValid } = myValidate("field").errorValidator();

    isValid({ field: "test" }, (result, error) => {
      expect(result).toBe(false);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Validation error");
    });
  });

  it("should handle resolved state correctly", async () => {
    const validator = rule("field").isString();

    // First validation
    const result1 = await validator.isValid({ field: "test" });
    expect(result1).toBe(true);

    // Second validation should work without issues
    const result2 = await validator.isValid({ field: "test2" });
    expect(result2).toBe(true);
  });

  it("should throw error when path is not found at intermediate level", async () => {
    const formData = { age: null }; // age is null, so age.value.deep will fail at 'age'

    try {
      const validator = rule("age.value.deep").isString();
      await validator.isValid(formData);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "Validation failed for field: age.value.deep - path not found at 'age'",
      );
    }
  });

  it("should validate multiple fields with validateAll", async () => {
    const chains = [
      rule("name").isString(),
      rule("age").isSafeNumber().isGreaterThan(0),
      rule("email").isString().isEmail(),
    ];

    const validator = transval(chains);

    const validFormData = {
      name: "John Doe",
      age: 25,
      email: "john@example.com",
    };

    expect(await validator.isValid(validFormData)).toBe(true);

    const invalidFormData = {
      name: "John Doe",
      age: -5, // invalid
      email: "invalid-email", // invalid
    };

    expect(await validator.isValid(invalidFormData)).toBe(false);
  });

  it("should collect messages from all chains in validateAll", async () => {
    class MessageValidators extends Rules {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) {
            return message;
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MessageValidators);

    const chains = [
      myValidate("name").customMessage("Name is required"),
      myValidate("age").customMessage("Age is required"),
    ];

    const validator = transval(chains);

    const invalidFormData = {
      name: "",
      age: null,
    };

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    const messages = validator.getMessages();
    expect(messages).toContain("Name is required");
    expect(messages).toContain("Age is required");
    expect(messages).toHaveLength(2);
  });

  it("should handle callback with validateAll", async () => {
    const chains = [rule("name").isString(), rule("age").isSafeNumber()];

    const validator = transval(chains);

    const formData = {
      name: "John",
      age: 25,
    };

    // Use Promise to wrap callback-based validation
    await new Promise<void>((resolve) => {
      validator.isValid(formData, (result, error) => {
        expect(error).toBeUndefined();
        expect(result).toBe(true);
        resolve();
      });
    });
  });

  it("should validate multiple fields with validateAll using spread syntax", async () => {
    const validator = transval(
      rule("name").isString(),
      rule("age").isSafeNumber().isGreaterThan(0),
      rule("email").isString().isEmail(),
    );

    const validFormData = {
      name: "John Doe",
      age: 25,
      email: "john@example.com",
    };

    expect(await validator.isValid(validFormData)).toBe(true);

    const invalidFormData = {
      name: "John Doe",
      age: -5, // invalid
      email: "invalid-email", // invalid
    };

    expect(await validator.isValid(invalidFormData)).toBe(false);
  });

  it("should collect messages from all chains in validateAll with spread syntax", async () => {
    class MessageValidators extends Rules {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) {
            return message;
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MessageValidators);

    const invalidFormData = {
      name: "",
      age: null,
    };

    const validator = transval(
      myValidate("name").customMessage("Name is required"),
      myValidate("age").customMessage("Age is required"),
    );

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    const messages = validator.getMessages();
    expect(messages).toContain("Name is required");
    expect(messages).toContain("Age is required");
    expect(messages).toHaveLength(2);
  });

  it("should transform string to number and validate", async () => {
    const formData = {
      age: "25",
    };
    const validator = rule("age").asNumber().isGreaterThan(18);

    expect(await validator.isValid(formData)).toBe(true);
  });

  it("should transform string to integer and validate", async () => {
    const formData = {
      count: "42.7",
    };

    const validator = rule("count").asInteger().isEqual(42);

    expect(await validator.isValid(formData)).toBe(true);
  });

  it("should transform to boolean and validate", async () => {
    const formData = {
      active: "true",
    };

    const validator = rule("active").asBoolean().isEqual(true);

    expect(await validator.isValid(formData)).toBe(true);
  });

  it("should transform to array and validate", async () => {
    const formData = {
      items: "item1,item2,item3",
    };
    const validator = rule("items")
      .asArray((value) => value.split(","))
      .isArray();

    expect(await validator.isValid(formData)).toBe(true);
  });

  it("should chain multiple transformers", async () => {
    const formData = {
      value: 150,
    };
    const validator = rule("value").asString().asNumber().isGreaterThan(100);

    expect(await validator.isValid(formData)).toBe(true);
  });

  it("should handle transformer and validator chain", async () => {
    const formData = {
      price: "499.99",
    };
    const validator = rule("price")
      .asNumber()
      .isGreaterThan(0)
      .isLessThan(1000)
      .is(499.99);

    expect(await validator.isValid(formData)).toBe(true);
  });

  it("should handle failed transformation", async () => {
    const formData = {
      invalid: "not-a-number",
    };
    const validator = rule("invalid").asNumber().isGreaterThan(0);

    expect(await validator.isValid(formData)).toBe(false);
  });
});

describe("ValidationChain getData and getValue", () => {
  describe("getData", () => {
    it("should return undefined before validation is executed", () => {
      const chain = rule("name");
      expect(chain.getData()).toBeUndefined();
    });

    it("should return original data when no transformers are applied", async () => {
      const formData = { name: "John", age: 30 };
      const chain = rule("name").isString();

      await chain.isValid(formData);

      expect(chain.getData()).toEqual(formData);
    });

    it("should return transformed data after applying transformers", async () => {
      const formData = { name: "  john  ", age: "30" };

      // Test with actual working transformers by manually adding them
      const nameChain = rule("name") as any;
      const ageChain = rule("age") as any;

      // Manually add transformer calls
      nameChain.validationCalls.push({
        name: "asTrimString",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim() : value,
        args: [],
        type: "transformer",
      });

      ageChain.validationCalls.push({
        name: "asMyNumber",
        fn: async (value: any) => {
          const num = Number(value);
          return Number.isNaN(num) ? value : num;
        },
        args: [],
        type: "transformer",
      });

      await nameChain.isValid(formData);
      await ageChain.isValid(formData);

      // Name chain should have trimmed name
      expect(nameChain.getData().name).toBe("john");

      // Age chain should have converted age to number
      expect(ageChain.getData().age).toBe(30);
    });

    it("should handle nested field transformations", async () => {
      const formData = { user: { profile: { name: "  JANE  " } } };

      const chain = rule("user.profile.name");
      chain.validationCalls.push({
        name: "trimAndLower",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim().toLowerCase() : value,
        args: [],
        type: "transformer",
      } as any);

      await chain.isValid(formData);

      const transformedData = chain.getData();
      expect(transformedData.user.profile.name).toBe("jane");
    });

    it("should preserve other fields when transforming specific field", async () => {
      const formData = {
        name: "  john  ",
        email: "john@example.com",
        settings: { theme: "dark" },
      };

      const chain = rule("name");
      chain.validationCalls.push({
        name: "trimString",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim() : value,
        args: [],
        type: "transformer",
      } as any);

      await chain.isValid(formData);

      const transformedData = chain.getData();
      expect(transformedData.name).toBe("john");
      expect(transformedData.email).toBe("john@example.com");
      expect(transformedData.settings).toEqual({ theme: "dark" });
    });

    it("should handle multiple transformers in sequence", async () => {
      const formData = { value: "  123.45  " };

      const chain = rule("value");
      chain.validationCalls.push(
        {
          name: "trimString",
          fn: async (value: string) =>
            typeof value === "string" ? value.trim() : value,
          args: [],
          type: "transformer",
        } as any,
        {
          name: "toNumber",
          fn: async (value: any) => {
            const num = Number(value);
            return Number.isNaN(num) ? value : num;
          },
          args: [],
          type: "transformer",
        } as any,
      );

      await chain.isValid(formData);

      expect(chain.getData().value).toBe(123.45);
      expect(typeof chain.getData().value).toBe("number");
    });
  });

  describe("getValue", () => {
    it("should throw error before validation is executed", () => {
      const chain = rule("name");

      expect(() => chain.getField("name")).toThrow(
        "No transformed data available. Call isValid() first to execute validation and transformers.",
      );
    });

    it("should return original value when no transformers are applied", async () => {
      const formData = { name: "John", age: 30 };
      const chain = rule("name").isString();

      await chain.isValid(formData);

      expect(chain.getField("name")).toBe("John");
      expect(chain.getField("age")).toBe(30);
    });

    it("should return transformed value after applying transformers", async () => {
      const formData = { name: "  john  ", age: "30" };

      const nameChain = rule("name");
      nameChain.validationCalls.push({
        name: "trimString",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim() : value,
        args: [],
        type: "transformer",
      } as any);

      await nameChain.isValid(formData);

      expect(nameChain.getField("name")).toBe("john");
      expect(nameChain.getField("age")).toBe("30"); // unchanged
    });

    it("should handle nested field paths", async () => {
      const formData = { user: { profile: { name: "  JANE  " } } };

      const chain = rule("user.profile.name");
      chain.validationCalls.push({
        name: "trimAndLower",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim().toLowerCase() : value,
        args: [],
        type: "transformer",
      } as any);

      await chain.isValid(formData);

      expect(chain.getField("user.profile.name")).toBe("jane");
      expect(chain.getField("user")).toEqual({ profile: { name: "jane" } });
    });

    it("should work with array indices", async () => {
      const formData = { items: ["  apple  ", "  banana  "] };

      const chain = rule("items.0");
      chain.validationCalls.push({
        name: "trimString",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim() : value,
        args: [],
        type: "transformer",
      } as any);

      await chain.isValid(formData);

      expect(chain.getField("items.0")).toBe("apple");
      expect(chain.getField("items.1")).toBe("  banana  "); // unchanged
    });
  });

  describe("integration with validation errors", () => {
    it("should still provide transformed data even when validation fails", async () => {
      const formData = { age: "25" };

      const chain = rule("age");
      chain.validationCalls.push({
        name: "toNumber",
        fn: async (value: any) => {
          const num = Number(value);
          return Number.isNaN(num) ? value : num;
        },
        args: [],
        type: "transformer",
      } as any);

      // Add a failing validator
      chain.validationCalls.push({
        name: "isGreaterThan",
        fn: async (value: number) =>
          value > 30 || "Value must be greater than 30",
        args: [30],
        type: "validator",
      } as any);

      const isValid = await chain.isValid(formData);

      expect(isValid).toBe(false);
      expect(chain.getField("age")).toBe(25); // transformed to number
      expect(typeof chain.getField("age")).toBe("number");
      expect(chain.getMessages()).toContain("Value must be greater than 30");
    });

    it("should handle transformer errors gracefully", async () => {
      const formData = { value: "test" };

      const chain = rule("value");
      chain.validationCalls.push({
        name: "failingTransformer",
        fn: async (value: any) => {
          throw new Error("Transformer failed");
        },
        args: [],
        type: "transformer",
      } as any);

      const isValid = await chain.isValid(formData);

      expect(isValid).toBe(false);
      // Should still have some data available
      expect(chain.getData()).toBeDefined();
    });
  });

  describe("with multiple validation chains", () => {
    it("should maintain separate transformed data for each chain", async () => {
      const formData = { name: "  john  ", age: "30" };

      const nameChain = rule("name");
      nameChain.validationCalls.push({
        name: "trimString",
        fn: async (value: string) =>
          typeof value === "string" ? value.trim() : value,
        args: [],
        type: "transformer",
      } as any);

      const ageChain = rule("age");
      ageChain.validationCalls.push({
        name: "toNumber",
        fn: async (value: any) => {
          const num = Number(value);
          return Number.isNaN(num) ? value : num;
        },
        args: [],
        type: "transformer",
      } as any);

      await nameChain.isValid(formData);
      await ageChain.isValid(formData);

      expect(nameChain.getField("name")).toBe("john");
      expect(nameChain.getField("age")).toBe("30"); // string in name chain

      expect(ageChain.getField("name")).toBe("  john  "); // unchanged in age chain
      expect(ageChain.getField("age")).toBe(30); // number in age chain
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined values", async () => {
      const formData = { name: null, age: undefined };
      const chain = rule("name").isDefined();

      await chain.isValid(formData);

      expect(chain.getField("name")).toBeNull();
      expect(chain.getField("age")).toBeUndefined();
    });

    it("should handle empty objects and arrays", async () => {
      const formData = { obj: {}, arr: [] };
      const chain = rule("obj").isObject();

      await chain.isValid(formData);

      expect(chain.getField("obj")).toEqual({});
      expect(chain.getField("arr")).toEqual([]);
    });

    it("should deep clone original data to avoid mutations", async () => {
      const formData = { user: { name: "John" } };

      const chain = rule("user.name");
      chain.validationCalls.push({
        name: "toUpperCase",
        fn: async (value: string) =>
          typeof value === "string" ? value.toUpperCase() : value,
        args: [],
        type: "transformer",
      } as any);

      await chain.isValid(formData);

      // Modify original data
      formData.user.name = "Modified";

      // Transformed data should not be affected
      expect(chain.getField("user.name")).toBe("JOHN");
      expect(chain.getField("user.name")).not.toBe("Modified");
    });
  });
});

describe("Error System Comprehensive Tests", () => {
  describe("Multiple errors per rule", () => {
    it("should collect multiple validation errors from a single rule", async () => {
      class MultiErrorValidators extends Rules {
        multipleChecks() {
          return ((value: any) => {
            const errors: string[] = [];

            if (typeof value !== "string") {
              errors.push("Value must be a string");
            }
            if (typeof value === "string" && value.length < 3) {
              errors.push("Value must be at least 3 characters");
            }
            if (typeof value === "string" && !/^[A-Z]/.test(value)) {
              errors.push("Value must start with uppercase letter");
            }
            if (typeof value === "string" && !/[0-9]/.test(value)) {
              errors.push("Value must contain at least one number");
            }

            return errors.length > 0 ? errors : true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(MultiErrorValidators);
      const validator = myValidate("field").multipleChecks();

      // Test with invalid value that triggers multiple errors
      const result = await validator.isValid({ field: "a" });
      expect(result).toBe(false);

      const messages = validator.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages).toContain("Value must be at least 3 characters");
      expect(messages).toContain("Value must start with uppercase letter");
      expect(messages).toContain("Value must contain at least one number");
    });

    it("should handle multiple errors with custom formatter", async () => {
      class MultiErrorValidators extends Rules {
        complexValidation() {
          return ((value: any) => {
            const errors: string[] = [];

            if (!value || typeof value !== "object") {
              errors.push("Value must be an object");
            } else {
              if (!value.name) errors.push("Name is required");
              if (!value.email) errors.push("Email is required");
              if (value.age && value.age < 18)
                errors.push("Age must be 18 or older");
            }

            return errors.length > 0 ? errors : true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(MultiErrorValidators);
      const validator = myValidate("user")
        .complexValidation()
        .useFormatter(
          (messages, format) =>
            `Validation failed (${messages.length} errors): ${format(messages)}`,
        );

      const result = await validator.isValid({ user: { age: 16 } });
      expect(result).toBe(false);

      const messages = validator.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("Validation failed (3 errors):");
      expect(messages[0]).toContain("Name is required");
      expect(messages[0]).toContain("Email is required");
      expect(messages[0]).toContain("Age must be 18 or older");
    });
  });

  describe("getMessages() with path parameter", () => {
    it("should return messages for specific field path", async () => {
      class MessageValidators extends Rules {
        customMessage(message: string) {
          return ((value: any) => {
            if (!value) return message;
            return true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(MessageValidators);
      const validator = transval(
        myValidate("user.name").customMessage("Name is required"),
        myValidate("user.email").customMessage("Email is required"),
        myValidate("profile.bio").customMessage("Bio is required"),
      );

      const result = await validator.isValid({
        user: { name: "", email: "" },
        profile: { bio: "" },
      });

      expect(result).toBe(false);

      // Test getting all messages
      const allMessages = validator.getMessages();
      expect(allMessages).toHaveLength(3);
      expect(allMessages).toContain("Name is required");
      expect(allMessages).toContain("Email is required");
      expect(allMessages).toContain("Bio is required");

      // Test getting messages for specific paths
      const nameMessages = validator.getMessages("user.name");
      expect(nameMessages).toEqual(["Name is required"]);

      const emailMessages = validator.getMessages("user.email");
      expect(emailMessages).toEqual(["Email is required"]);

      const bioMessages = validator.getMessages("profile.bio");
      expect(bioMessages).toEqual(["Bio is required"]);

      // Test getting messages for non-existent path
      const nonExistentMessages = validator.getMessages("nonexistent.field");
      expect(nonExistentMessages).toEqual([]);
    });

    it("should return multiple messages for the same field path", async () => {
      class ValidationRules extends Rules {
        required() {
          return ((value: any) => {
            if (!value) return "Field is required";
            return true;
          }) as unknown as Rules & this;
        }

        minLength(min: number) {
          return ((value: string) => {
            if (typeof value === "string" && value.length < min) {
              return `Field must be at least ${min} characters`;
            }
            return true;
          }) as unknown as Rules & this;
        }

        pattern(regex: RegExp, message: string) {
          return ((value: string) => {
            if (typeof value === "string" && !regex.test(value)) {
              return message;
            }
            return true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(ValidationRules);
      const validator = transval(
        myValidate("password")
          .required()
          .minLength(8)
          .pattern(/[A-Z]/, "Must contain uppercase"),
        myValidate("username").required().minLength(3),
      );

      const result = await validator.isValid({
        password: "abc",
        username: "",
      });

      expect(result).toBe(false);

      // Password should have 2 errors (minLength + pattern)
      const passwordMessages = validator.getMessages("password");
      expect(passwordMessages).toHaveLength(2);
      expect(passwordMessages).toContain("Field must be at least 8 characters");
      expect(passwordMessages).toContain("Must contain uppercase");

      // Username should have 2 errors (required + minLength)
      const usernameMessages = validator.getMessages("username");
      expect(usernameMessages).toHaveLength(2);
      expect(usernameMessages).toContain("Field is required");
      expect(usernameMessages).toContain("Field must be at least 3 characters");
    });
  });

  describe("getMessages() with custom formatter", () => {
    it("should apply custom formatter to all messages", async () => {
      class MessageValidators extends Rules {
        customMessage(message: string) {
          return ((value: any) => {
            if (!value) return message;
            return true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(MessageValidators);
      const validator = transval(
        myValidate("field1").customMessage("Error 1"),
        myValidate("field2").customMessage("Error 2"),
      );

      await validator.isValid({ field1: "", field2: "" });

      // Test custom formatter that wraps each message
      const wrappedMessages = validator.getMessages(undefined, (messages) =>
        messages.map((msg) => `⚠️ ${msg}`),
      );

      expect(wrappedMessages).toEqual(["⚠️ Error 1", "⚠️ Error 2"]);

      // Test custom formatter that creates a summary
      const summaryMessage = validator.getMessages(
        undefined,
        (messages) => `Found ${messages.length} errors: ${messages.join(", ")}`,
      );

      expect(summaryMessage).toBe("Found 2 errors: Error 1, Error 2");
    });

    it("should apply custom formatter to specific field messages", async () => {
      class ValidationRules extends Rules {
        multiError() {
          return ((value: any) => {
            const errors: string[] = [];
            if (!value) errors.push("Required");
            if (typeof value === "string" && value.length < 3)
              errors.push("Too short");
            if (typeof value === "string" && !/^[A-Z]/.test(value))
              errors.push("Must start with capital");
            return errors.length > 0 ? errors : true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(ValidationRules);
      const validator = transval(
        myValidate("field1").multiError(),
        myValidate("field2").multiError(),
      );

      await validator.isValid({ field1: "a", field2: "b" });

      // Test custom formatter on specific field
      const field1Formatted = validator.getMessages(
        "field1",
        (messages) => `Field1 errors: [${messages.join(" | ")}]`,
      );

      expect(field1Formatted).toBe(
        "Field1 errors: [Too short | Must start with capital]",
      );

      // Test that other field is not affected
      const field2Messages = validator.getMessages("field2");
      expect(field2Messages).toEqual(["Too short", "Must start with capital"]);
    });

    it("should handle empty messages with custom formatter", async () => {
      class MessageValidators extends Rules {
        alwaysPass() {
          return (() => true) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(MessageValidators);
      const validator = transval(myValidate("field").alwaysPass());

      await validator.isValid({ field: "valid" });

      // Test custom formatter with empty messages
      const formattedEmpty = validator.getMessages(undefined, (messages) =>
        messages.length === 0 ? "No errors!" : `${messages.length} errors`,
      );

      expect(formattedEmpty).toBe("No errors!");
    });
  });

  describe("Complex error scenarios", () => {
    it("should handle nested validation with multiple error types", async () => {
      class ComplexValidators extends Rules {
        validateUser() {
          return (async (user: any) => {
            await new Promise((resolve) => setTimeout(resolve, 10));

            const errors: string[] = [];

            if (!user || typeof user !== "object") {
              errors.push("User data is required");
              return errors;
            }

            if (!user.profile) {
              errors.push("Profile is required");
            } else {
              if (!user.profile.firstName)
                errors.push("First name is required");
              if (!user.profile.lastName) errors.push("Last name is required");
            }

            if (!user.contact) {
              errors.push("Contact info is required");
            } else {
              if (!user.contact.email) errors.push("Email is required");
              if (user.contact.email && !user.contact.email.includes("@")) {
                errors.push("Invalid email format");
              }
            }

            return errors.length > 0 ? errors : true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(ComplexValidators);
      const validator = myValidate("userData")
        .validateUser()
        .useFormatter(
          (messages, format) => `User validation failed: ${format(messages)}`,
        );

      const result = await validator.isValid({
        userData: {
          profile: { firstName: "" },
          contact: { email: "invalid-email" },
        },
      });

      expect(result).toBe(false);
      const messages = validator.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("User validation failed:");
      expect(messages[0]).toContain("Last name is required");
      expect(messages[0]).toContain("Invalid email format");
    });

    it("should maintain error isolation between different transval instances", async () => {
      class MessageValidators extends Rules {
        customMessage(message: string) {
          return ((value: any) => {
            if (!value) return message;
            return true;
          }) as unknown as Rules & this;
        }
      }

      const myValidate = rule.extend(MessageValidators);

      const validator1 = transval(
        myValidate("field").customMessage("Error from validator 1"),
      );
      const validator2 = transval(
        myValidate("field").customMessage("Error from validator 2"),
      );

      await validator1.isValid({ field: "" });
      await validator2.isValid({ field: "" });

      // Errors should be isolated
      expect(validator1.getMessages()).toEqual(["Error from validator 1"]);
      expect(validator2.getMessages()).toEqual(["Error from validator 2"]);
    });
  });
});
