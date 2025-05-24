import { validate, BaseValidators, validateAll } from "./chain.js";

describe("Chain", () => {
  it("should validate number field", async () => {
    const { isValid } = validate("age.value").isNumber().isGreaterThan(10);

    const formData = {
      age: {
        value: 12,
      },
    };
    expect(await isValid(formData)).toBe(true);
  });

  it("can be extended with custom validators", async () => {
    // Define custom validators as a class that extends BaseValidators
    class CustomValidators extends BaseValidators {
      customValidator(prefix: string) {
        return ((value: string) =>
          typeof value === "string" &&
          value.startsWith(prefix)) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(CustomValidators);

    // important: extend from base custom validators class
    class CustomValidators2 extends CustomValidators {
      customValidator2(prefix: string) {
        return ((value: string) =>
          typeof value === "string" &&
          value.startsWith(prefix)) as unknown as BaseValidators & this;
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
    class AsyncValidators extends BaseValidators {
      asyncEmailCheck(apiEndpoint: string) {
        return (async (value: string) => {
          // Simulate async API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          return value.includes("@") && value.includes(".");
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidateAsync = validate.extend(AsyncValidators);
    const { isValid } = myValidateAsync("email")
      .isString()
      .asyncEmailCheck("/api/check-email");

    expect(await isValid({ email: "test@example.com" })).toBe(true);
    expect(await isValid({ email: "invalid-email" })).toBe(false);
  });

  it("should support callback-based auto-start validation", async () => {
    const { isValid } = validate("age.value").isNumber().isGreaterThan(10);

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
    const { isValid } = validate("age.value").isNumber().isGreaterThan(100);

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
    class AsyncValidators extends BaseValidators {
      asyncEmailCheck(apiEndpoint: string) {
        return (async (value: string) => {
          // Simulate async API call
          await new Promise((resolve) => setTimeout(resolve, 50));
          return value.includes("@") && value.includes(".");
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidateAsync = validate.extend(AsyncValidators);
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
    class SlowAsyncValidators extends BaseValidators {
      slowAsyncCheck() {
        return (async (value: string) => {
          // Simulate a slow API call that exceeds timeout
          await new Promise((resolve) => setTimeout(resolve, 200));
          return true;
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(SlowAsyncValidators);
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

    class ErrorValidators extends BaseValidators {
      throwingValidator() {
        return (() => {
          throw new Error("Custom validation error");
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(ErrorValidators);
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
    const { isValid } = validate("age.value").isNumber().isGreaterThan(10);
    const formData = { age: { value: 12 } };

    console.log("Starting validation...");

    const thenResult = validate("age.value").isNumber().isGreaterThan(10);

    expect(await thenResult.isValid(formData)).toBe(true);

    console.log("Starting second validation...");

    // Test catch - this should work since we expect it to resolve now
    try {
      const catchResult = validate("age.value1").isNumber().isGreaterThan(100);
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
    class MessageValidators extends BaseValidators {
      customMessageValidator(expectedValue: string) {
        return ((value: string) => {
          if (value !== expectedValue) {
            return `Expected "${expectedValue}" but got "${value}"`;
          }
          return true;
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(MessageValidators);
    const validator = myValidate("field")
      .customMessageValidator("expected")
      .message((messages, format) => `Validation failed: ${format(messages)}`);

    const result = await validator.isValid({ field: "actual" });
    expect(result).toBe(false);

    expect(validator.getMessages()).toContain(
      'Expected "expected" but got "actual"',
    );
    expect(validator.getFormattedMessage()).toContain("Validation failed:");
  });

  it("should handle multiple validation failures with message collection", async () => {
    class MultiValidators extends BaseValidators {
      mustContain(substring: string) {
        return ((value: string) => {
          if (!value.includes(substring)) {
            return `Must contain "${substring}"`;
          }
          return true;
        }) as unknown as BaseValidators & this;
      }

      mustNotContain(substring: string) {
        return ((value: string) => {
          if (value.includes(substring)) {
            return `Must not contain "${substring}"`;
          }
          return true;
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(MultiValidators);
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
    class ErrorValidators extends BaseValidators {
      errorValidator() {
        return (() => {
          throw new Error("Validation error");
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(ErrorValidators);
    const { isValid } = myValidate("field").errorValidator();

    isValid({ field: "test" }, (result, error) => {
      expect(result).toBe(false);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Validation error");
    });
  });

  it("should handle resolved state correctly", async () => {
    const validator = validate("field").isString();

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
      const validator = validate("age.value.deep").isString();
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
      validate("name").isString(),
      validate("age").isNumber().isGreaterThan(0),
      validate("email").isString().isEmail(),
    ];

    const validator = validateAll(chains);

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
    class MessageValidators extends BaseValidators {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) {
            return message;
          }
          return true;
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(MessageValidators);

    const chains = [
      myValidate("name").customMessage("Name is required"),
      myValidate("age").customMessage("Age is required"),
    ];

    const validator = validateAll(chains);

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
    const chains = [validate("name").isString(), validate("age").isNumber()];

    const validator = validateAll(chains);

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
    const validator = validateAll(
      validate("name").isString(),
      validate("age").isNumber().isGreaterThan(0),
      validate("email").isString().isEmail(),
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
    class MessageValidators extends BaseValidators {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) {
            return message;
          }
          return true;
        }) as unknown as BaseValidators & this;
      }
    }

    const myValidate = validate.extend(MessageValidators);

    const validator = validateAll(
      myValidate("name").customMessage("Name is required"),
      myValidate("age").customMessage("Age is required"),
    );

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
});
