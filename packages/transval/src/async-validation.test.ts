import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";

describe("Async custom validators", () => {
  it("should handle async validators returning single error", async () => {
    class AsyncValidators extends Rules {
      asyncEmailCheck() {
        return (async (value: string) => {
          // Simulate async validation (e.g., checking if email exists)
          await new Promise((resolve) => setTimeout(resolve, 10));

          if (value === "taken@example.com") {
            return "Email is already taken";
          }
          if (!value.includes("@")) {
            return "Invalid email format";
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(AsyncValidators);

    // Test taken email - create fresh validator instance
    const validator1 = myValidate("email").asyncEmailCheck();
    let result = await validator1.isValid({ email: "taken@example.com" });
    expect(result).toBe(false);
    expect(validator1.getMessages().map((m) => m.message)).toEqual([
      "Email is already taken",
    ]);

    // Test invalid format - create fresh validator instance
    const validator2 = myValidate("email").asyncEmailCheck();
    result = await validator2.isValid({ email: "invalid-email" });
    expect(result).toBe(false);
    expect(validator2.getMessages().map((m) => m.message)).toEqual([
      "Invalid email format",
    ]);

    // Test valid email - create fresh validator instance
    const validator3 = myValidate("email").asyncEmailCheck();
    result = await validator3.isValid({ email: "valid@example.com" });
    expect(result).toBe(true);
    expect(validator3.getMessages()).toEqual([]);
  });

  it("should handle async validators returning multiple errors", async () => {
    class AsyncValidators extends Rules {
      complexCheck() {
        return (async (value: any) => {
          // Simulate async validation with multiple checks
          await new Promise((resolve) => setTimeout(resolve, 15));

          const errors: string[] = [];

          if (!value || typeof value !== "object") {
            errors.push("Value must be an object");
          } else {
            // Simulate async database checks
            if (value.username === "admin") {
              errors.push("Username 'admin' is reserved");
            }
            if (value.email?.endsWith("@spam.com")) {
              errors.push("Email domain is blacklisted");
            }
            if (value.phone && !/^\+\d{10,}$/.test(value.phone)) {
              errors.push("Phone number must be international format");
            }
          }

          return errors.length > 0 ? errors : true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(AsyncValidators);
    const validator = myValidate("userData").complexCheck();

    const result = await validator.isValid({
      userData: {
        username: "admin",
        email: "test@spam.com",
        phone: "123456",
      },
    });

    expect(result).toBe(false);
    const messages = validator.getMessages();
    expect(messages).toHaveLength(3);
    expect(messages.map((m) => m.message)).toContain(
      "Username 'admin' is reserved",
    );
    expect(messages.map((m) => m.message)).toContain(
      "Email domain is blacklisted",
    );
    expect(messages.map((m) => m.message)).toContain(
      "Phone number must be international format",
    );
  });

  it("should handle mixed sync and async validators", async () => {
    class MixedValidators extends Rules {
      syncRequired() {
        return ((value: any) => {
          if (!value) return "Value is required";
          return true;
        }) as unknown as Rules & this;
      }

      coroutineUnique() {
        return (async (value: string) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (value === "duplicate") {
            return "Value must be unique";
          }
          return true;
        }) as unknown as Rules & this;
      }

      syncFormat() {
        return ((value: string) => {
          if (typeof value === "string" && value.length < 5) {
            return "Value must be at least 5 characters";
          }
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(MixedValidators);
    const validator = myValidate("field")
      .syncRequired()
      .coroutineUnique()
      .syncFormat();

    // Test with value that fails multiple validations
    const result = await validator.isValid({ field: "dup" });
    expect(result).toBe(false);

    const messages = validator.getMessages();
    expect(messages).toHaveLength(1); // syncFormat fails, asyncUnique not reached
    expect(messages[0].message).toBe("Value must be at least 5 characters");

    // Test with value that passes sync but fails async
    const result2 = await validator.isValid({ field: "duplicate" });
    expect(result2).toBe(false);

    const messages2 = validator.getMessages();
    expect(messages2).toHaveLength(1);
    expect(messages2[0].message).toBe("Value must be unique");
  });
});
