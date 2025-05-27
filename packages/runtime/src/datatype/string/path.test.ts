import { getAllKeysFromPath, ensureKey, getByPath, setByPath } from "./path.js";

describe("getAllKeysFromPath", () => {
  it("should be defined", () => {
    expect(getAllKeysFromPath).toBeDefined();
  });

  it("should split simple dot-separated paths", () => {
    expect(getAllKeysFromPath("a.b.c")).toEqual(["a", "b", "c"]);
    expect(getAllKeysFromPath("user.name")).toEqual(["user", "name"]);
  });

  it("should handle single key paths", () => {
    expect(getAllKeysFromPath("single")).toEqual(["single"]);
    expect(getAllKeysFromPath("")).toEqual([""]);
  });

  it("should handle array indices", () => {
    expect(getAllKeysFromPath("users[0]")).toEqual(["users", 0]);
    expect(getAllKeysFromPath("data[5].name")).toEqual(["data", 5, "name"]);
    expect(getAllKeysFromPath("nested[0][1][2]")).toEqual(["nested", 0, 1, 2]);
  });

  it("should handle mixed object and array paths", () => {
    expect(getAllKeysFromPath("users[0].profile.settings[2].value")).toEqual([
      "users",
      0,
      "profile",
      "settings",
      2,
      "value",
    ]);
  });

  it("should handle multiple array indices on same level", () => {
    expect(getAllKeysFromPath("matrix[0][1]")).toEqual(["matrix", 0, 1]);
    expect(getAllKeysFromPath("grid[2][3].cell")).toEqual([
      "grid",
      2,
      3,
      "cell",
    ]);
  });

  it("should handle edge cases", () => {
    expect(getAllKeysFromPath("a[0]b")).toEqual(["a", 0]); // "b" gets lost due to regex
    expect(getAllKeysFromPath("test[999]")).toEqual(["test", 999]);
  });
});

describe("ensureKey", () => {
  it("should be defined", () => {
    expect(ensureKey).toBeDefined();
  });

  it("should create object when nextKey is not numeric", () => {
    const obj = {};
    ensureKey(obj, "test", "nextKey");
    expect(obj).toEqual({ test: {} });
  });

  it("should create array when nextKey is numeric", () => {
    const obj = {};
    ensureKey(obj, "test", "0");
    expect(obj).toEqual({ test: [] });

    ensureKey(obj, "another", "123");
    expect(obj).toEqual({ test: [], another: [] });
  });

  it("should not overwrite existing keys", () => {
    const obj = { existing: "value" };
    ensureKey(obj, "existing", "nextKey");
    expect(obj).toEqual({ existing: "value" });
  });

  it("should handle numeric keys", () => {
    const obj = {};
    ensureKey(obj, 0, "key");
    expect(obj).toEqual({ 0: {} });

    ensureKey(obj, 1, "5");
    expect(obj).toEqual({ 0: {}, 1: [] });
  });

  it("should handle undefined nextKey", () => {
    const obj = {};
    ensureKey(obj, "test", undefined);
    expect(obj).toEqual({ test: {} });
  });
});

describe("getByPath", () => {
  it("should be defined", () => {
    expect(getByPath).toBeDefined();
  });

  it("should get simple nested values", () => {
    const obj = { a: { b: { c: "value" } } };
    expect(getByPath(obj, "a.b.c")).toBe("value");
    expect(getByPath(obj, "a.b")).toEqual({ c: "value" });
    expect(getByPath(obj, "a")).toEqual({ b: { c: "value" } });
  });

  it("should get array values", () => {
    const obj = { users: ["Alice", "Bob", "Charlie"] };
    expect(getByPath(obj, "users[0]")).toBe("Alice");
    expect(getByPath(obj, "users[1]")).toBe("Bob");
    expect(getByPath(obj, "users[2]")).toBe("Charlie");
  });

  it("should get nested array and object values", () => {
    const obj = {
      users: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
    };
    expect(getByPath(obj, "users[0].name")).toBe("Alice");
    expect(getByPath(obj, "users[1].age")).toBe(25);
    expect(getByPath(obj, "users[0]")).toEqual({ name: "Alice", age: 30 });
  });

  it("should return undefined for non-existent paths", () => {
    const obj = { a: { b: "value" } };
    expect(getByPath(obj, "a.c")).toBeUndefined();
    expect(getByPath(obj, "a.b.c")).toBeUndefined();
    expect(getByPath(obj, "x.y.z")).toBeUndefined();
  });

  it("should handle null and undefined values in path", () => {
    const obj = { a: null, b: undefined };
    expect(getByPath(obj, "a.something")).toBeUndefined();
    expect(getByPath(obj, "b.something")).toBeUndefined();
  });

  it("should handle array indices out of bounds", () => {
    const obj = { arr: [1, 2, 3] };
    expect(getByPath(obj, "arr[5]")).toBeUndefined();
    expect(getByPath(obj, "arr[-1]")).toBeUndefined();
  });

  it("should handle complex nested structures", () => {
    const obj = {
      data: {
        users: [
          {
            profile: {
              settings: [
                { theme: "dark", notifications: true },
                { theme: "light", notifications: false },
              ],
            },
          },
        ],
      },
    };

    expect(getByPath(obj, "data.users[0].profile.settings[0].theme")).toBe(
      "dark",
    );
    expect(
      getByPath(obj, "data.users[0].profile.settings[1].notifications"),
    ).toBe(false);
  });

  it("should handle empty paths", () => {
    const obj = { value: "test" };
    expect(getByPath(obj, "")).toBeUndefined(); // Empty string path returns undefined
  });
});

describe("setByPath", () => {
  it("should be defined", () => {
    expect(setByPath).toBeDefined();
  });

  it("should set simple nested values", () => {
    const obj = { a: { b: { c: "old" } } };
    const result = setByPath(obj, "a.b.c", "new");

    expect(result.a.b.c).toBe("new");
    expect(obj.a.b.c).toBe("old"); // Original unchanged
  });

  it("should create new structure when setting non-existent paths", () => {
    const obj = {};
    const result = setByPath(obj, "a.b.c", "value");

    expect(result).toEqual({ a: { b: { c: "value" } } });
    expect(obj).toEqual({}); // Original unchanged
  });

  it("should handle array creation and modification", () => {
    const obj = {};
    const result = setByPath(obj, "users[0]", "Alice");

    expect(result).toEqual({ users: ["Alice"] });
  });

  it("should handle mixed object and array creation", () => {
    const obj = {};
    const result = setByPath(obj, "users[0].name", "Alice");

    expect(result).toEqual({ users: [{ name: "Alice" }] });
  });

  it("should preserve existing structure while updating", () => {
    const obj = { a: { b: "keep", c: "also keep" }, d: "preserve" };
    const result = setByPath(obj, "a.b", "updated");

    expect(result).toEqual({
      a: { b: "updated", c: "also keep" },
      d: "preserve",
    });
    expect(obj.a.b).toBe("keep"); // Original unchanged
  });

  it("should handle array modifications", () => {
    const obj = { arr: ["a", "b", "c"] };
    const result = setByPath(obj, "arr[1]", "updated");

    expect(result).toEqual({ arr: ["a", "updated", "c"] });
    expect(obj.arr[1]).toBe("b"); // Original unchanged
  });

  it("should delete values when setting undefined", () => {
    const obj = { a: { b: "value", c: "keep" } };
    const result = setByPath(obj, "a.b", undefined);

    expect(result).toEqual({ a: { c: "keep" } });
    expect(result.a.b).toBeUndefined();
  });

  it("should delete array elements when setting undefined", () => {
    const obj = { arr: ["a", "b", "c"] };
    const result = setByPath(obj, "arr[1]", undefined);

    expect(result).toEqual({ arr: ["a", "c"] });
    expect(result.arr).toHaveLength(2);
  });

  it("should handle complex nested updates", () => {
    const obj = {
      users: [
        { name: "Alice", settings: { theme: "dark" } },
        { name: "Bob", settings: { theme: "light" } },
      ],
    };

    const result = setByPath(obj, "users[0].settings.theme", "blue");

    expect(result.users[0].settings.theme).toBe("blue");
    expect(result.users[1]).toEqual({
      name: "Bob",
      settings: { theme: "light" },
    });
    expect(obj.users[0].settings.theme).toBe("dark"); // Original unchanged
  });

  it("should create arrays when path suggests array index", () => {
    const obj = {};
    const result1 = setByPath(obj, "matrix[0][1]", "value");

    expect(result1).toEqual({ matrix: [[undefined, "value"]] });
    expect(Array.isArray(result1.matrix)).toBe(true);
    expect(Array.isArray(result1.matrix[0])).toBe(true);
  });

  it("should handle single key paths", () => {
    const obj = { existing: "value" };
    const result = setByPath(obj, "new", "added");

    expect(result).toEqual({ existing: "value", new: "added" });
  });

  it("should handle empty objects and arrays properly", () => {
    const obj = { empty: {} };
    const result = setByPath(obj, "empty.new", "value");

    expect(result).toEqual({ empty: { new: "value" } });
  });

  it("should handle overwriting different types", () => {
    const obj = { value: "string" };
    const result = setByPath(obj, "value", { object: true });

    expect(result).toEqual({ value: { object: true } });
  });

  it("should maintain reference integrity for unchanged parts", () => {
    const unchanged = { keep: "this" };
    const obj = { a: unchanged, b: "modify" };
    const result = setByPath(obj, "b", "modified");

    expect(result.a).toBe(unchanged); // Same reference for unchanged parts
    expect(result.b).toBe("modified");
  });
});
