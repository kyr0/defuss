import {
  access,
  type PathAccessor,
  type Dynamic,
  PATH_ACCESSOR_SYMBOL,
  isPathAccessor,
} from "./path.js";

// Example object structure
interface User {
  name: string;
  profile: {
    age: number;
    preferences: {
      theme: string;
      notifications: boolean;
    };
  };
  tags: string[];
}

describe("Object Path Access", () => {
  test("should generate string paths with type safety", () => {
    // Test basic property access
    expect(String(access<User>().name)).toBe("name");
    expect(String(access<User>().profile)).toBe("profile");

    // Test nested property access
    expect(String(access<User>().profile.age)).toBe("profile.age");
    expect(String(access<User>().profile.preferences)).toBe(
      "profile.preferences",
    );
    expect(String(access<User>().profile.preferences.theme)).toBe(
      "profile.preferences.theme",
    );
    expect(String(access<User>().profile.preferences.notifications)).toBe(
      "profile.preferences.notifications",
    );

    // Test array access
    expect(String(access<User>().tags)).toBe("tags");
  });

  test("should work with template literals", () => {
    const themePath = access<User>().profile.preferences.theme;
    const agePath = access<User>().profile.age;

    expect(`The path is: ${themePath}`).toBe(
      "The path is: profile.preferences.theme",
    );
    expect(`User age at: ${agePath}`).toBe("User age at: profile.age");
  });

  test("should work with string concatenation", () => {
    const basePath = access<User>().profile;
    const agePath = access<User>().profile.age;

    expect(`root.${basePath}`).toBe("root.profile");
    expect(`getValue(${agePath})`).toBe("getValue(profile.age)");
  });

  test("should handle array index access", () => {
    const arrayPath = access<User>().tags;
    // Note: Array index access would work but TypeScript doesn't know tags is an array
    // This would be: path<User>().tags[0] but we can't test it without type assertions
    expect(String(arrayPath)).toBe("tags");
  });

  test("should maintain type safety", () => {
    // These should all compile without errors due to type safety
    const userPath = access<User>();

    // Valid paths
    const name: PathAccessor<string> = userPath.name;
    const age: PathAccessor<number> = userPath.profile.age;
    const theme: PathAccessor<string> = userPath.profile.preferences.theme;
    const notifications: PathAccessor<boolean> =
      userPath.profile.preferences.notifications;
    const tags: PathAccessor<string[]> = userPath.tags;

    // Convert to strings
    expect(String(name)).toBe("name");
    expect(String(age)).toBe("profile.age");
    expect(String(theme)).toBe("profile.preferences.theme");
    expect(String(notifications)).toBe("profile.preferences.notifications");
    expect(String(tags)).toBe("tags");
  });

  test("should work with toString() method", () => {
    const themePath = access<User>().profile.preferences.theme;
    expect(themePath.toString()).toBe("profile.preferences.theme");
  });

  test("should work with valueOf() method", () => {
    const themePath = access<User>().profile.preferences.theme;
    expect(themePath.valueOf()).toBe("profile.preferences.theme");
  });

  test("should work with Symbol.toPrimitive", () => {
    const themePath = access<User>().profile.preferences.theme;
    expect((themePath as any)[Symbol.toPrimitive]()).toBe(
      "profile.preferences.theme",
    );
  });

  test("should handle deeply nested paths", () => {
    interface DeepObject {
      level1: {
        level2: {
          level3: {
            level4: {
              value: string;
            };
          };
        };
      };
    }

    const deepPath = access<DeepObject>().level1.level2.level3.level4.value;
    expect(String(deepPath)).toBe("level1.level2.level3.level4.value");
  });

  test("should work with Dynamic type for untyped usage", () => {
    const dynamicPath = access<Dynamic>().some.dynamic.path;
    expect(String(dynamicPath)).toBe("some.dynamic.path");
  });

  it("should be used like this", () => {
    const user = access<User>();
    const themePath = user.profile.preferences.theme;

    // The path accessor should work with standard equality comparisons
    // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
    expect(themePath == "profile.preferences.theme").toBe(true);
    // Strict equality won't work due to object vs string
    expect(themePath === "profile.preferences.theme").toBe(false);

    // But should convert to the expected string
    expect(String(themePath)).toEqual("profile.preferences.theme");
    expect(`${themePath}`).toEqual("profile.preferences.theme");
    expect(themePath.toString()).toEqual("profile.preferences.theme");

    // And should work in template literals and string contexts
    expect(`Getting theme from: ${themePath}`).toEqual(
      "Getting theme from: profile.preferences.theme",
    );
  });

  test("should have PATH_ACCESSOR_SYMBOL for identification", () => {
    const pathAccessor = access<User>().profile.preferences.theme;
    const dynamicPath = access<Dynamic>().some.path;

    // Path accessors should have the symbol
    expect((pathAccessor as any)[PATH_ACCESSOR_SYMBOL]).toBe(true);
    expect((dynamicPath as any)[PATH_ACCESSOR_SYMBOL]).toBe(true);

    // Regular objects/strings should not have the symbol
    const regularString = "profile.preferences.theme";
    const regularObject = { profile: { preferences: { theme: "dark" } } };

    expect((regularString as any)[PATH_ACCESSOR_SYMBOL]).toBeUndefined();
    expect((regularObject as any)[PATH_ACCESSOR_SYMBOL]).toBeUndefined();
  });

  test("isPathAccessor should correctly identify path accessors", () => {
    const pathAccessor = access<User>().profile.preferences.theme;
    const dynamicPath = access<Dynamic>().some.dynamic.path;
    const regularString = "profile.preferences.theme";
    const regularObject = { profile: { preferences: { theme: "dark" } } };
    const nullValue = null;
    const undefinedValue = undefined;

    // Should return true for path accessors
    expect(isPathAccessor(pathAccessor)).toBe(true);
    expect(isPathAccessor(dynamicPath)).toBe(true);

    // Should return false for non-path-accessor objects
    expect(isPathAccessor(regularString)).toBe(false);
    expect(isPathAccessor(regularObject)).toBe(false);
    expect(isPathAccessor(nullValue)).toBe(false);
    expect(isPathAccessor(undefinedValue)).toBe(false);
    expect(isPathAccessor(123)).toBe(false);
    expect(isPathAccessor(true)).toBe(false);
  });
  test("isPathAccessor should work as type guard", () => {
    const maybePathAccessor: unknown = access<User>().profile.preferences.theme;
    const definitelyNotPath: unknown = "regular string";

    if (isPathAccessor(maybePathAccessor)) {
      // TypeScript should now know this is a PathAccessor
      expect(String(maybePathAccessor)).toBe("profile.preferences.theme");
    }

    if (isPathAccessor(definitelyNotPath)) {
      // This block should not execute
      expect(true).toBe(false); // Force failure if this executes
    } else {
      // TypeScript should know this is not a PathAccessor
      expect(definitelyNotPath).toBe("regular string");
    }
  });
});
