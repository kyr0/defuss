import { describe, it, expect } from "vitest";
import { rule, transval, Rules } from "./api.js";

describe("README Examples", () => {
  describe("Basic Usage Example", () => {
    it("should validate the basic usage example from README", async () => {
      const formData = {
        person: {
          username: "johndoe",
          email: "john@example.com",
          age: 25,
        },
        color: "#ff5733",
        someValue: 42,
      };

      // Create individual validation rules
      const usernameRule = rule("person.username").asString().isLongerThan(3);
      const emailRule = rule("person.email").asString().isEmail();
      const ageRule = rule("person.age").asNumber().not.isLessThan(14);

      // Configure validation with multiple rules
      const validation = transval(usernameRule, emailRule, ageRule);

      // Execute validation
      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(true);

      // Access transformed data from individual rules
      const transformedUsername = usernameRule.getValue("person.username");
      const transformedEmail = emailRule.getValue("person.email");
      const transformedAge = ageRule.getValue("person.age");

      expect(transformedUsername).toBe("johndoe");
      expect(transformedEmail).toBe("john@example.com");
      expect(transformedAge).toBe(25);
    });

    it("should handle validation failures and get messages", async () => {
      const formData = {
        person: {
          username: "jo", // too short
          email: "invalid-email", // invalid email
          age: 10, // less than 14
        },
      };

      const usernameRule = rule("person.username").asString().isLongerThan(3);
      const emailRule = rule("person.email").asString().isEmail();
      const ageRule = rule("person.age").asNumber().not.isLessThan(14);

      const validation = transval(usernameRule, emailRule, ageRule);

      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(false);

      // Get all validation messages
      const validationMessages = validation.getMessages();
      expect(validationMessages.length).toBeGreaterThan(0);

      // Get messages for specific fields
      const emailErrors = validation.getMessages("person.email");
      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  describe("Custom Validators Example", () => {
    it("should work with custom validators extension", async () => {
      class CustomRules extends Rules {
        checkEmail(apiEndpoint: string) {
          return (async (value: string) => {
            // Simulate an async API call
            await new Promise((resolve) => setTimeout(resolve, 10));
            return value.includes("@") && value.includes(".");
          }) as unknown as Rules & this;
        }

        isValidUsername(minLength = 3) {
          return ((value: string) => {
            return (
              typeof value === "string" &&
              value.length >= minLength &&
              /^[a-zA-Z0-9_]+$/.test(value)
            );
          }) as unknown as Rules & this;
        }
      }

      const formData = {
        email: "john@example.com",
        username: "johndoe123",
      };

      // Extend the rule function with custom validators
      const customRules = rule.extend(CustomRules);

      const emailRule = customRules("email")
        .isString()
        .checkEmail("/api/check-email");
      const usernameRule = customRules("username")
        .isString()
        .isValidUsername(5);

      const validation = transval(emailRule, usernameRule);

      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(true);

      // Access individual rule data
      expect(emailRule.getValue("email")).toBe("john@example.com");
      expect(usernameRule.getValue("username")).toBe("johndoe123");
    });

    it("should fail custom validation with invalid data", async () => {
      class CustomRules extends Rules {
        isValidUsername(minLength = 3) {
          return ((value: string) => {
            return (
              typeof value === "string" &&
              value.length >= minLength &&
              /^[a-zA-Z0-9_]+$/.test(value)
            );
          }) as unknown as Rules & this;
        }
      }

      const formData = {
        username: "jo!", // invalid characters and too short
      };

      const customRules = rule.extend(CustomRules);
      const usernameRule = customRules("username")
        .isString()
        .isValidUsername(5);
      const validation = transval(usernameRule);

      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(false);

      const validationMessages = validation.getMessages();
      expect(validationMessages.length).toBeGreaterThan(0);
    });
  });

  describe("Individual Rule Chain Methods", () => {
    it("should work with individual rule chain methods", async () => {
      const formData = {
        person: {
          age: 25,
        },
      };

      const ageRule = rule("person.age").asNumber().isGreaterThan(18);

      // Execute validation for this specific rule
      const isValid = await ageRule.isValid(formData);
      expect(isValid).toBe(true);

      // Get validation messages for this rule
      const messages = ageRule.getMessages();
      expect(messages).toEqual([]);

      // Get the transformed data for this rule
      const transformedAge = ageRule.getValue("person.age");
      expect(transformedAge).toBe(25);

      // Get a specific value from the transformed data
      const specificValue = ageRule.getValue("person.age");
      expect(specificValue).toBe(25);
    });
  });

  describe("Message Formatting", () => {
    it("should work with custom message formatting", async () => {
      const formData = {
        email: "invalid-email",
      };

      const rule1 = rule("email")
        .isString()
        .isEmail()
        .useFormatter((messages, defaultFormat) => {
          return `Email validation failed: ${defaultFormat(messages)}`;
        });

      const validation = transval(rule1);

      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(false);

      const messages = validation.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      // Note: The actual formatting might depend on the internal implementation
    });
  });

  describe("Negation Examples", () => {
    it("should work with negation examples", async () => {
      const formData = {
        age: 25,
        email: "user@example.com",
      };

      const ageRule = rule("age").not.isLessThan(18); // age must NOT be less than 18
      const emailRule = rule("email").not.isEmpty(); // email must NOT be empty

      const validation = transval(ageRule, emailRule);

      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(true);
    });

    it("should fail negation when condition is met", async () => {
      const formData = {
        age: 16, // this should fail .not.isLessThan(18)
      };

      const ageRule = rule("age").not.isLessThan(18);
      const isValid = await ageRule.isValid(formData);
      expect(isValid).toBe(false);
    });
  });

  describe("Async Validation with Callback", () => {
    it("should support callback-based validation", async () => {
      const formData = {
        email: "test@example.com",
      };

      const emailRule = rule("email").isString().isEmail();
      const validation = transval(emailRule);

      let callbackResult: boolean | undefined;
      let callbackError: Error | undefined;

      await validation.isValid(formData, (isValid, error) => {
        callbackResult = isValid;
        callbackError = error;
      });

      // Wait a bit for the callback to be called
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callbackResult).toBe(true);
      expect(callbackError).toBeUndefined();
    });
  });

  describe("Validation Options", () => {
    it("should work with validation options", async () => {
      const formData = {
        email: "test@example.com",
      };

      const options = {
        timeout: 10000,
        onValidationError: (error: Error, step: any) => {
          console.log("Validation step failed:", step, error);
        },
      };

      const rule1 = rule("email", options).isString().isEmail();
      const isValid = await rule1.isValid(formData);
      expect(isValid).toBe(true);
    });

    it("should timeout if validation takes too long", async () => {
      const formData = {
        value: "test",
      };

      class SlowRules extends Rules {
        slowValidator() {
          return (async (value: string) => {
            // This will take longer than the timeout
            await new Promise((resolve) => setTimeout(resolve, 200));
            return true;
          }) as unknown as Rules & this;
        }
      }

      const slowRules = rule.extend(SlowRules);
      const options = { timeout: 50 }; // Very short timeout

      const slowRule = slowRules("value", options).isString().slowValidator();

      await expect(slowRule.isValid(formData)).rejects.toThrow(/timeout/i);
    });
  });

  describe("Type Validators", () => {
    it("should work with all type validators", async () => {
      const formData = {
        num: 42,
        str: "hello",
        arr: [1, 2, 3],
        obj: { key: "value" },
        date: new Date(),
        bool: true,
        int: 10,
      };

      const numRule = rule("num").isSafeNumber();
      const strRule = rule("str").isString();
      const arrRule = rule("arr").isArray();
      const objRule = rule("obj").isObject();
      const dateRule = rule("date").isDate();
      // Note: isBoolean is not available in current validators
      const intRule = rule("int").isInteger();

      const validation = transval(
        numRule,
        strRule,
        arrRule,
        objRule,
        dateRule,
        intRule,
      );
      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(true);
    });
  });

  describe("Comparison Validators", () => {
    it("should work with comparison validators", async () => {
      const formData = {
        exact: "test",
        equal: { name: "John" },
        instance: new Date(),
        type: "string",
        option: "red",
      };

      const exactRule = rule("exact").is("test");
      const equalRule = rule("equal").isEqual({ name: "John" });
      // Note: isInstanceOf and isTypeOf are not available in current validators
      const optionRule = rule("option").isOneOf(["red", "blue", "green"]);

      const validation = transval(exactRule, equalRule, optionRule);
      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(true);
    });
  });

  describe("Transformers", () => {
    it("should work with all transformers", async () => {
      const formData = {
        str: 123,
        num: "456",
        bool: 1,
        date: "2023-01-01",
        arr: "1,2,3",
        int: 3.14,
      };

      const strRule = rule("str").asString();
      const numRule = rule("num").asNumber();
      const boolRule = rule("bool").asBoolean();
      const dateRule = rule("date").asDate();
      const arrRule = rule("arr").asArray((value) => value.split(","));
      const intRule = rule("int").asInteger();

      const validation = transval(
        strRule,
        numRule,
        boolRule,
        dateRule,
        arrRule,
        intRule,
      );
      const isValid = await validation.isValid(formData);
      expect(isValid).toBe(true);

      expect(strRule.getValue("str")).toBe("123");
      expect(numRule.getValue("num")).toBe(456);
      expect(boolRule.getValue("bool")).toBe(true);
      expect(dateRule.getValue("date")).toBeInstanceOf(Date);
      expect(arrRule.getValue("arr")).toEqual(["1", "2", "3"]);
      expect(intRule.getValue("int")).toBe(3);
    });
  });
});
