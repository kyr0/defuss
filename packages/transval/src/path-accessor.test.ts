import { describe, it, expect } from "vitest";
import { rule, Rules, transval } from "./api.js";
import { access } from "defuss-runtime";

interface TestUser {
  profile: {
    name: string;
    age: number;
    preferences: {
      theme: string;
      notifications: boolean;
    };
  };
  tags: string[];
}

describe("PathAccessor Support", () => {
  it("should work with object path accessors in rule()", async () => {
    const userAccess = access<TestUser>();

    const nameValidator = rule(userAccess.profile.name)
      .isString()
      .isLongerThan(2);
    const ageValidator = rule(userAccess.profile.age)
      .isSafeNumber()
      .isGreaterThan(0);

    const formData = {
      profile: {
        name: "John",
        age: 25,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer", "typescript"],
    };

    expect(await nameValidator.isValid(formData)).toBe(true);
    expect(await ageValidator.isValid(formData)).toBe(true);
  });

  it("should work with nested path accessors", async () => {
    const userAccess = access<TestUser>();

    const themeValidator = rule(userAccess.profile.preferences.theme)
      .isString()
      .isOneOf(["dark", "light"]);

    const notificationsValidator = rule(
      userAccess.profile.preferences.notifications,
    ).isBoolean();

    const formData = {
      profile: {
        name: "John",
        age: 25,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer", "typescript"],
    };

    expect(await themeValidator.isValid(formData)).toBe(true);
    expect(await notificationsValidator.isValid(formData)).toBe(true);
  });

  it("should work with array path accessors", async () => {
    const firstTagPath = access<TestUser>().tags[0];
    const firstTagValidator = rule(firstTagPath).isString().isLongerThan(3);

    const formData = {
      profile: {
        name: "John",
        age: 25,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer", "typescript"],
    };

    expect(await firstTagValidator.isValid(formData)).toBe(true);
  });

  it("should work with PathAccessor in getValue()", async () => {
    const userAccess = access<TestUser>();
    const validator = rule(userAccess.profile.name).isString();

    const formData = {
      profile: {
        name: "John",
        age: 25,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer", "typescript"],
    };

    await validator.isValid(formData);

    expect(validator.getField(userAccess.profile.name)).toBe("John");
    expect(validator.getField(userAccess.profile.age)).toBe(25);
  });

  it("should work with PathAccessor in transval getMessages()", async () => {
    const userAccess = access<TestUser>();
    class CustomValidators extends Rules {
      customMessage(message: string) {
        return ((value: any) => {
          if (!value) return message;
          return true;
        }) as unknown as Rules & this;
      }
    }

    const myValidate = rule.extend(CustomValidators);

    const chains = [
      myValidate(userAccess.profile.name).customMessage("Name is required"),
      myValidate(userAccess.profile.age).customMessage("Age is required"),
    ];

    const validator = transval(chains);

    const invalidFormData = {
      profile: {
        name: "",
        age: 0,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer"],
    };

    const result = await validator.isValid(invalidFormData);
    expect(result).toBe(false);

    // Test getting messages for specific path using PathAccessor
    const nameMessages = validator.getMessages(userAccess.profile.name);
    const ageMessages = validator.getMessages(userAccess.profile.age);

    expect(nameMessages.map((m) => m.message)).toContain("Name is required");
    expect(ageMessages.map((m) => m.message)).toContain("Age is required");
  });

  it("should work with transformers and PathAccessor", async () => {
    const namePath = access<TestUser>().profile.name;

    const validator = rule(namePath).asString().isString().isLongerThan(2);

    const formData = {
      profile: {
        name: "  John  ", // with spaces that should be trimmed
        age: 25,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer"],
    };

    // Add a custom transformer to trim the string
    validator.validationCalls.unshift({
      name: "trimString",
      fn: async (value: any) =>
        typeof value === "string" ? value.trim() : value,
      args: [],
      type: "transformer",
    } as any);

    const result = await validator.isValid(formData);
    expect(result).toBe(true);

    // Check that the transformed value is available
    expect(validator.getField(namePath)).toBe("John");
  });

  it("should handle mixed string and PathAccessor usage", async () => {
    const namePath = access<TestUser>().profile.name;

    const stringValidator = rule("profile.age").isSafeNumber().isGreaterThan(0);
    const pathAccessorValidator = rule(namePath).isString().isLongerThan(2);

    const formData = {
      profile: {
        name: "John",
        age: 25,
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      tags: ["developer"],
    };

    expect(await stringValidator.isValid(formData)).toBe(true);
    expect(await pathAccessorValidator.isValid(formData)).toBe(true);
  });
});
