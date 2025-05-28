import { describe, it, expect } from "vitest";
import { rule, transval, Rules } from "./api.js";
import { access } from "./index.js";

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
      const { isValid, getMessages } = transval(
        usernameRule,
        emailRule,
        ageRule,
      );

      // Execute validation
      const valid = await isValid(formData);
      expect(valid).toBe(true);

      // Access transformed data from individual rules
      const transformedUsername = usernameRule.getField("person.username");
      const transformedEmail = emailRule.getField("person.email");
      const transformedAge = ageRule.getField("person.age");

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

      const { isValid, getMessages } = transval(
        usernameRule,
        emailRule,
        ageRule,
      );

      const valid = await isValid(formData);
      expect(valid).toBe(false);

      // Get all validation messages
      const validationMessages = getMessages();
      expect(validationMessages.length).toBeGreaterThan(0);

      // Get messages for specific fields
      const emailErrors = getMessages("person.email");
      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  describe("PathAccessor Support Example", () => {
    it("should work with the PathAccessor support example from README", async () => {
      type UserData = {
        user: {
          profile: {
            name: string;
            email: string;
            settings: {
              theme: "light" | "dark";
              notifications: boolean;
            };
          };
          posts: Array<{
            title: string;
            published: boolean;
          }>;
        };
      };

      const userData: UserData = {
        user: {
          profile: {
            name: "John Doe",
            email: "john@example.com",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
          posts: [
            { title: "First Post", published: true },
            { title: "Draft Post", published: false },
          ],
        },
      };

      const userAccess = access<UserData>();

      // setup rules using PathAccessors for type-safe field paths
      const { isValid, getMessages, getData } = transval(
        rule(userAccess.user.profile.name).asString().isLongerThan(2),
        rule(userAccess.user.profile.email).asString().isEmail(),
        rule(userAccess.user.profile.settings.theme)
          .asString()
          .isOneOf(["light", "dark"]),
        rule(userAccess.user.posts[0].title).asString().isLongerThan(5),
      );

      const valid = await isValid(userData);
      expect(valid).toBe(true);

      expect(getData()).toEqual(userData);

      // Get specific rules for individual testing
      const nameRule = rule(userAccess.user.profile.name)
        .asString()
        .isLongerThan(2);
      const emailRule = rule(userAccess.user.profile.email)
        .asString()
        .isEmail();

      await nameRule.isValid(userData);
      await emailRule.isValid(userData);

      // Access transformed values using PathAccessor
      const transformedName = nameRule.getField(userAccess.user.profile.name);
      const transformedEmail = emailRule.getField(
        userAccess.user.profile.email,
      );

      expect(transformedName).toBe("John Doe");
      expect(transformedEmail).toBe("john@example.com");
    });

    it("should handle validation failures and get messages with PathAccessors", async () => {
      type UserData = {
        user: {
          profile: {
            name: string;
            email: string;
            settings: {
              theme: "light" | "dark";
              notifications: boolean;
            };
          };
          posts: Array<{
            title: string;
            published: boolean;
          }>;
        };
      };

      const userData: UserData = {
        user: {
          profile: {
            name: "Jo", // too short
            email: "invalid-email", // invalid email
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
          posts: [
            { title: "Short", published: true }, // too short title
          ],
        },
      };

      const userAccess = access<UserData>();

      const { isValid, getMessages } = transval(
        rule(userAccess.user.profile.name).asString().isLongerThan(2),
        rule(userAccess.user.profile.email).asString().isEmail(),
        rule(userAccess.user.posts[0].title).asString().isLongerThan(5),
      );

      const valid = await isValid(userData);
      expect(valid).toBe(false);

      // Get validation messages for specific PathAccessor fields
      const nameErrors = getMessages(userAccess.user.profile.name);
      const emailErrors = getMessages(userAccess.user.profile.email);

      expect(nameErrors.length).toBeGreaterThan(0);
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    it("should work with mixed string and PathAccessor usage", async () => {
      type UserData = {
        user: {
          profile: {
            name: string;
            email: string;
          };
          posts: Array<{
            title: string;
          }>;
        };
      };

      const userData: UserData = {
        user: {
          profile: {
            name: "John Doe",
            email: "john@example.com",
          },
          posts: [{ title: "My First Post" }],
        },
      };

      const userAccess = access<UserData>();

      // Mix string and PathAccessor approaches
      const { isValid } = transval(
        rule("user.profile.name")
          .asString()
          .isRequired(), // String path
        rule(userAccess.user.profile.email)
          .asString()
          .isEmail(), // PathAccessor
        rule("user.posts.0.title")
          .asString()
          .isLongerThan(3), // String path with array index
      );

      const valid = await isValid(userData);
      expect(valid).toBe(true);
    });
  });

  describe("Custom Validators Example", () => {
    it("should work with custom validators extension using PathAccessors", async () => {
      type FormData = {
        user: {
          email: string;
          username: string;
          preferences: {
            newsletter: boolean;
          };
        };
      };

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

      const formData: FormData = {
        user: {
          email: "john@example.com",
          username: "johndoe123",
          preferences: {
            newsletter: true,
          },
        },
      };

      const userAccess = access<FormData>();

      // Extend the rule function with custom validators
      const customRules = rule.extend(CustomRules);

      // Use PathAccessors with custom validators
      const emailRule = customRules(userAccess.user.email)
        .isString()
        .checkEmail("/api/check-email");

      const usernameRule = customRules(userAccess.user.username)
        .isString()
        .isValidUsername(5);

      // Mix with regular string paths
      const newsletterRule = customRules("user.preferences.newsletter")
        .asBoolean()
        .isDefined();

      const { isValid } = transval(emailRule, usernameRule, newsletterRule);

      const valid = await isValid(formData);
      expect(valid).toBe(true);

      // Access individual rule data using PathAccessors
      expect(emailRule.getField(userAccess.user.email)).toBe(
        "john@example.com",
      );
      expect(usernameRule.getField(userAccess.user.username)).toBe(
        "johndoe123",
      );
      expect(newsletterRule.getField("user.preferences.newsletter")).toBe(true);
    });

    it("should fail custom validation with invalid data and get PathAccessor messages", async () => {
      type FormData = {
        user: {
          email: string;
          username: string;
        };
      };

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

      const formData: FormData = {
        user: {
          email: "invalid-email",
          username: "jo!", // invalid characters and too short
        },
      };

      const userAccess = access<FormData>();
      const customRules = rule.extend(CustomRules);

      const emailRule = customRules(userAccess.user.email).isString().isEmail();
      const usernameRule = customRules(userAccess.user.username)
        .isString()
        .isValidUsername(5);

      const { isValid, getMessages } = transval(emailRule, usernameRule);

      const valid = await isValid(formData);
      expect(valid).toBe(false);

      // Get validation messages using PathAccessors
      const emailErrors = getMessages(userAccess.user.email);
      const usernameErrors = getMessages(userAccess.user.username);

      expect(emailErrors.length).toBeGreaterThan(0);
      expect(usernameErrors.length).toBeGreaterThan(0);
    });

    it("should work with legacy string-based custom validators", async () => {
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

      const { isValid } = transval(emailRule, usernameRule);

      const valid = await isValid(formData);
      expect(valid).toBe(true);

      // Access individual rule data
      expect(emailRule.getField("email")).toBe("john@example.com");
      expect(usernameRule.getField("username")).toBe("johndoe123");
    });
  });

  describe("Individual Rule Chain Methods", () => {
    it("should work with individual rule chain methods using PathAccessors", async () => {
      type PersonData = {
        person: {
          age: number;
          name: string;
        };
      };

      const formData: PersonData = {
        person: {
          age: 25,
          name: "John Doe",
        },
      };

      const personAccess = access<PersonData>();

      // Create rule with PathAccessor
      const ageRule = rule(personAccess.person.age)
        .asNumber()
        .isGreaterThan(18);

      // Execute validation for this specific rule
      const isValid = await ageRule.isValid(formData);
      expect(isValid).toBe(true);

      // Get validation messages for this rule
      const messages = ageRule.getMessages();
      expect(messages).toEqual([]);

      // Get the entire transformed form data (includes all fields)
      const allData = ageRule.getData();
      expect(allData).toEqual(formData);

      // Get a specific value using PathAccessor
      const specificAge = ageRule.getField(personAccess.person.age);
      expect(specificAge).toBe(25);

      // Or using string path
      const specificName = ageRule.getField("person.name");
      expect(specificName).toBe("John Doe");
    });

    it("should work with legacy string-based individual rule chain methods", async () => {
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
      const transformedAge = ageRule.getField("person.age");
      expect(transformedAge).toBe(25);

      // Get a specific value from the transformed data
      const specificValue = ageRule.getField("person.age");
      expect(specificValue).toBe(25);
    });
  });

  describe("Message Formatting", () => {
    it("should work with custom message formatting using getMessages formatter", async () => {
      const formData = {
        email: "invalid-email",
      };

      const emailRule = rule("email").isString().isEmail();
      const { isValid, getMessages } = transval(emailRule);

      const valid = await isValid(formData);
      expect(valid).toBe(false);

      // Get messages with custom formatter (simulating JSX return)
      const formattedMessages = getMessages(undefined, (messages) => {
        return {
          type: "error-container",
          content: `Email validation failed: ${messages.join(", ")}`,
          items: messages.map((msg, index) => ({
            key: index,
            message: msg,
            icon: "⚠️",
          })),
        };
      });

      expect(formattedMessages).toBeDefined();
      expect(formattedMessages.type).toBe("error-container");
      expect(formattedMessages.items.length).toBeGreaterThan(0);

      // Test field-specific formatting
      const fieldErrors = getMessages("email", (messages) => {
        return messages.map((msg) => `Field error: ${msg}`);
      });

      expect(fieldErrors.length).toBeGreaterThan(0);
      expect(fieldErrors[0]).toContain("Field error:");
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

      const { isValid } = transval(ageRule, emailRule);

      const valid = await isValid(formData);
      expect(valid).toBe(true);
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
      const { isValid } = transval(emailRule);

      let callbackResult: boolean | undefined;
      let callbackError: Error | undefined;

      isValid(formData, (isValidResult, error) => {
        callbackResult = isValidResult;
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

      const { isValid } = transval(
        numRule,
        strRule,
        arrRule,
        objRule,
        dateRule,
        intRule,
      );
      const valid = await isValid(formData);
      expect(valid).toBe(true);
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

      const { isValid } = transval(exactRule, equalRule, optionRule);
      const valid = await isValid(formData);
      expect(valid).toBe(true);
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

      const { isValid } = transval(
        strRule,
        numRule,
        boolRule,
        dateRule,
        arrRule,
        intRule,
      );
      const valid = await isValid(formData);
      expect(valid).toBe(true);

      expect(strRule.getField("str")).toBe("123");
      expect(numRule.getField("num")).toBe(456);
      expect(boolRule.getField("bool")).toBe(true);
      expect(dateRule.getField("date")).toBeInstanceOf(Date);
      expect(arrRule.getField("arr")).toEqual(["1", "2", "3"]);
      expect(intRule.getField("int")).toBe(3);
    });
  });

  describe("Data Access Methods Example", () => {
    it("should demonstrate getData() and getField() methods from README", async () => {
      interface FormData {
        name: string;
        age: string; // Input as string
        email: string;
        preferences: {
          newsletter: string; // "true" or "false"
        };
      }

      const acc = access<FormData>();

      const validation = transval(
        rule(acc.name).isString(),
        rule(acc.age)
          .isString()
          .asNumber(), // Changed: First check it's a string, then transform
        rule(acc.email).isEmail(),
        rule(acc.preferences.newsletter)
          .isString()
          .asBoolean(), // Transform to boolean
      );

      const formData: FormData = {
        name: "John Doe",
        age: "25", // String input
        email: "john@example.com",
        preferences: {
          newsletter: "true", // String input
        },
      };

      const { isValid, getMessages, getData, getField } = validation;

      const isFormValid = await isValid(formData);
      expect(isFormValid).toBe(true);

      // Get the entire transformed data object
      const transformedData = getData();
      expect(transformedData).toBeDefined();
      expect(transformedData.age).toBe(25); // number, not string
      expect(transformedData.preferences.newsletter).toBe(true); // boolean, not string

      // Get specific field values using string paths
      const userAge = getField("age");
      expect(userAge).toBe(25); // transformed to number

      const newsletter = getField("preferences.newsletter");
      expect(newsletter).toBe(true); // transformed to boolean

      // Get specific field values using PathAccessor (type-safe)
      const userName = getField(acc.name);
      expect(userName).toBe("John Doe"); // original string

      const userEmail = getField(acc.email);
      expect(userEmail).toBe("john@example.com");
    });

    it("should return undefined when getData() and getField() called before validation", () => {
      const validation = transval(rule("name").isString());

      // Called before validation
      expect(validation.getData()).toBeUndefined();
      expect(validation.getField("name")).toBeUndefined();
    });
  });
});
