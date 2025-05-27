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
  // Add array property for testing
  items: Array<{
    id: number;
    values: number[];
  }>;
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

  test("should handle array index access properly", () => {
    // Test basic array index access
    const arrayIndexPath = access<Dynamic>().tags[0];
    expect(String(arrayIndexPath)).toBe("tags[0]");

    // Test the specific case mentioned in requirements: foo.bar[1]
    const fooBarIndexPath = access<Dynamic>().foo.bar[1];
    expect(String(fooBarIndexPath)).toBe("foo.bar[1]");

    // Test multiple array indices
    const multiIndexPath = access<Dynamic>().items[0][1];
    expect(String(multiIndexPath)).toBe("items[0][1]");

    // Test array access with subsequent property access
    const arrayThenPropertyPath = access<Dynamic>().items[0].id;
    expect(String(arrayThenPropertyPath)).toBe("items[0].id");

    // Test nested array access
    const nestedArrayPath = access<Dynamic>().items[0].values[2];
    expect(String(nestedArrayPath)).toBe("items[0].values[2]");

    // Test complex mixed access pattern
    const complexPath = access<Dynamic>().data[0].nested.array[1].property;
    expect(String(complexPath)).toBe("data[0].nested.array[1].property");
  });

  test("should handle numeric array indices correctly", () => {
    // Test various numeric indices
    expect(String(access<Dynamic>().arr[0])).toBe("arr[0]");
    expect(String(access<Dynamic>().arr[1])).toBe("arr[1]");
    expect(String(access<Dynamic>().arr[10])).toBe("arr[10]");
    expect(String(access<Dynamic>().arr[999])).toBe("arr[999]");
  });

  test("should handle string-based array access", () => {
    // Test string keys that look like array indices
    const stringKeyPath = access<Dynamic>().obj["0"];
    expect(String(stringKeyPath)).toBe("obj[0]");

    const stringKeyPath2 = access<Dynamic>().obj["123"];
    expect(String(stringKeyPath2)).toBe("obj[123]");
  });

  test("should handle edge cases in array access", () => {
    // Test accessing 'length' property (should be treated as array access for consistency)
    const lengthPath = access<Dynamic>().arr.length;
    expect(String(lengthPath)).toBe("arr.length");

    // Test mixed property and array access
    const mixedPath = access<Dynamic>().users[0].profile.tags[1];
    expect(String(mixedPath)).toBe("users[0].profile.tags[1]");
  });

  test("should handle typed array access", () => {
    // Test typed array access with User interface
    interface UserWithArrays {
      name: string;
      tags: string[];
      posts: Array<{
        id: number;
        title: string;
        comments: Array<{
          id: number;
          text: string;
        }>;
      }>;
      matrix: number[][];
    }

    // Test basic typed array access
    const tagsPath = access<UserWithArrays>().tags[0];
    expect(String(tagsPath)).toBe("tags[0]");

    // Test nested typed array access
    const postTitlePath = access<UserWithArrays>().posts[0].title;
    expect(String(postTitlePath)).toBe("posts[0].title");

    // Test deeply nested typed array access
    const commentTextPath = access<UserWithArrays>().posts[0].comments[1].text;
    expect(String(commentTextPath)).toBe("posts[0].comments[1].text");

    // Test multi-dimensional array access
    const matrixPath = access<UserWithArrays>().matrix[0][1];
    expect(String(matrixPath)).toBe("matrix[0][1]");
  });

  test("should maintain type safety with arrays", () => {
    interface TypedArrayTest {
      users: Array<{
        profile: {
          settings: {
            theme: string;
            notifications: boolean;
          };
        };
        tags: string[];
      }>;
      data: {
        items: number[];
        nested: {
          values: string[];
        };
      };
    }

    // These should all compile without errors due to type safety
    const userProfileTheme: PathAccessor<string> =
      access<TypedArrayTest>().users[0].profile.settings.theme;
    const userTag: PathAccessor<string> =
      access<TypedArrayTest>().users[0].tags[1];
    const dataItem: PathAccessor<number> =
      access<TypedArrayTest>().data.items[0];
    const nestedValue: PathAccessor<string> =
      access<TypedArrayTest>().data.nested.values[2];

    // Convert to strings and verify paths
    expect(String(userProfileTheme)).toBe("users[0].profile.settings.theme");
    expect(String(userTag)).toBe("users[0].tags[1]");
    expect(String(dataItem)).toBe("data.items[0]");
    expect(String(nestedValue)).toBe("data.nested.values[2]");
  });

  test("should handle mixed typed and dynamic access", () => {
    interface MixedTest {
      staticProp: {
        dynamicArea: Record<string, any>;
      };
      typedArray: Array<{
        id: number;
        dynamic: Record<string, any>;
      }>;
    }

    // Start with typed access, then switch to dynamic
    const mixedPath1 = access<MixedTest>().staticProp.dynamicArea;
    const mixedPath2 = access<MixedTest>().typedArray[0].dynamic;

    expect(String(mixedPath1)).toBe("staticProp.dynamicArea");
    expect(String(mixedPath2)).toBe("typedArray[0].dynamic");

    // For dynamic access within typed structures, we can use type assertion
    const dynamicAccess = (access<MixedTest>().typedArray[0].dynamic as any)
      .someKey[1].nested;
    expect(String(dynamicAccess)).toBe(
      "typedArray[0].dynamic.someKey[1].nested",
    );
  });
});
