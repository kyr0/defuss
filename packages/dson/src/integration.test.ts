/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { DSON } from "./index.js";

describe("DSON Integration Tests", () => {
  describe("Basic JSON compatibility", () => {
    it("should handle standard JSON types like JSON.stringify/parse", async () => {
      const testObjects = [
        { simple: "object" },
        [1, 2, 3, "array"],
        "string",
        42,
        true,
        false,
        null,
      ];

      for (const obj of testObjects) {
        const dsonSerialized = DSON.stringify(obj);
        const dsonParsed = DSON.parse(dsonSerialized);

        // Should match JSON behavior for standard types
        const jsonSerialized = JSON.stringify(obj);
        const jsonParsed = JSON.parse(jsonSerialized);

        expect(dsonParsed).toEqual(jsonParsed);
      }
    });

    it("should handle nested JSON structures", async () => {
      const complex = {
        users: [
          { id: 1, name: "Alice", active: true },
          { id: 2, name: "Bob", active: false },
        ],
        metadata: {
          count: 2,
          lastUpdated: null,
          settings: {
            theme: "dark",
            notifications: true,
          },
        },
      };

      const serialized = DSON.stringify(complex);
      const parsed = DSON.parse(serialized);

      expect(parsed).toEqual(complex);
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0].name).toBe("Alice");
      expect(parsed.metadata.settings.theme).toBe("dark");
    });
  });

  describe("Extended JavaScript types", () => {
    it("should preserve RegExp objects", async () => {
      const regexes = {
        simple: /test/,
        withFlags: /pattern/gim,
        complex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
        escaped: /path\/to\/file\.(js|ts)$/,
      };

      const serialized = DSON.stringify(regexes);
      const parsed = DSON.parse(serialized);

      for (const [key, originalRegex] of Object.entries(regexes)) {
        const parsedRegex = parsed[key];
        expect(parsedRegex).toBeInstanceOf(RegExp);
        expect(parsedRegex.source).toBe(originalRegex.source);
        expect(parsedRegex.flags).toBe(originalRegex.flags);

        // Test that the regex actually works
        if (key === "simple") {
          expect(parsedRegex.test("test")).toBe(true);
          expect(parsedRegex.test("other")).toBe(false);
        }
      }
    });

    it("should preserve Map objects", async () => {
      const map = new Map<unknown, unknown>([
        ["string-key", "string-value"],
        [42, "number-key"],
        [true, "boolean-key"],
        [null, "null-key"],
        [{ nested: "object" }, "object-key"],
      ]);

      const serialized = DSON.stringify(map);
      const parsed = DSON.parse(serialized);

      expect(parsed).toBeInstanceOf(Map);
      expect(parsed.size).toBe(5);
      expect(parsed.get("string-key")).toBe("string-value");
      expect(parsed.get(42)).toBe("number-key");
      expect(parsed.get(true)).toBe("boolean-key");
      expect(parsed.get(null)).toBe("null-key");

      // Find the object key
      let objectKeyValue = null;
      for (const [key, value] of parsed.entries()) {
        if (
          typeof key === "object" &&
          key !== null &&
          key.nested === "object"
        ) {
          objectKeyValue = value;
          break;
        }
      }
      expect(objectKeyValue).toBe("object-key");
    });

    it("should preserve Set objects", async () => {
      const set = new Set([
        "string",
        42,
        true,
        null,
        { nested: "object" },
        [1, 2, 3],
      ]);

      const serialized = DSON.stringify(set);
      const parsed = DSON.parse(serialized);

      expect(parsed).toBeInstanceOf(Set);
      expect(parsed.size).toBe(6);
      expect(parsed.has("string")).toBe(true);
      expect(parsed.has(42)).toBe(true);
      expect(parsed.has(true)).toBe(true);
      expect(parsed.has(null)).toBe(true);

      // Check for complex objects by iterating
      let hasObject = false;
      let hasArray = false;
      for (const value of parsed.values()) {
        if (typeof value === "object" && value !== null) {
          if (Array.isArray(value) && value.length === 3) {
            hasArray = true;
          } else if (value.nested === "object") {
            hasObject = true;
          }
        }
      }
      expect(hasObject).toBe(true);
      expect(hasArray).toBe(true);
    });

    it("should preserve BigInt", async () => {
      const bigints = {
        small: BigInt(123),
        large: BigInt("9007199254740991"),
        negative: BigInt(-456),
        zero: BigInt(0),
      };

      const serialized = DSON.stringify(bigints);
      const parsed = DSON.parse(serialized);

      expect(typeof parsed.small).toBe("bigint");
      expect(typeof parsed.large).toBe("bigint");
      expect(typeof parsed.negative).toBe("bigint");
      expect(typeof parsed.zero).toBe("bigint");

      expect(parsed.small).toBe(BigInt(123));
      expect(parsed.large).toBe(BigInt("9007199254740991"));
      expect(parsed.negative).toBe(BigInt(-456));
      expect(parsed.zero).toBe(BigInt(0));
    });

    it("should preserve Error objects", async () => {
      const errors = {
        basic: new Error("Basic error message"),
        type: new TypeError("Type error message"),
        range: new RangeError("Range error message"),
        reference: new ReferenceError("Reference error message"),
        syntax: new SyntaxError("Syntax error message"),
        uri: new URIError("URI error message"),
        emptyMessage: new Error(""),
        noMessage: new Error(),
      };

      const serialized = DSON.stringify(errors);
      const parsed = DSON.parse(serialized);

      // Check basic error
      expect(parsed.basic).toBeInstanceOf(Error);
      expect(parsed.basic.name).toBe("Error");
      expect(parsed.basic.message).toBe("Basic error message");

      // Check TypeError
      expect(parsed.type).toBeInstanceOf(TypeError);
      expect(parsed.type.name).toBe("TypeError");
      expect(parsed.type.message).toBe("Type error message");

      // Check RangeError
      expect(parsed.range).toBeInstanceOf(RangeError);
      expect(parsed.range.name).toBe("RangeError");
      expect(parsed.range.message).toBe("Range error message");

      // Check ReferenceError
      expect(parsed.reference).toBeInstanceOf(ReferenceError);
      expect(parsed.reference.name).toBe("ReferenceError");
      expect(parsed.reference.message).toBe("Reference error message");

      // Check SyntaxError
      expect(parsed.syntax).toBeInstanceOf(SyntaxError);
      expect(parsed.syntax.name).toBe("SyntaxError");
      expect(parsed.syntax.message).toBe("Syntax error message");

      // Check URIError
      expect(parsed.uri).toBeInstanceOf(URIError);
      expect(parsed.uri.name).toBe("URIError");
      expect(parsed.uri.message).toBe("URI error message");

      // Check edge cases
      expect(parsed.emptyMessage).toBeInstanceOf(Error);
      expect(parsed.emptyMessage.message).toBe("");

      expect(parsed.noMessage).toBeInstanceOf(Error);
      expect(parsed.noMessage.message).toBe("");
    });

    it("should preserve BigInt objects (Object wrapped)", async () => {
      const bigintObjects = {
        wrappedSmall: Object(BigInt(123)),
        wrappedLarge: Object(BigInt("9007199254740991")),
        wrappedNegative: Object(BigInt(-456)),
        wrappedZero: Object(BigInt(0)),
      };

      const serialized = DSON.stringify(bigintObjects);
      const parsed = DSON.parse(serialized);

      // Check that they are BigInt objects (not primitive bigints)
      expect(typeof parsed.wrappedSmall).toBe("object");
      expect(parsed.wrappedSmall).toBeInstanceOf(Object);
      expect(parsed.wrappedSmall.valueOf()).toBe(BigInt(123));

      expect(typeof parsed.wrappedLarge).toBe("object");
      expect(parsed.wrappedLarge).toBeInstanceOf(Object);
      expect(parsed.wrappedLarge.valueOf()).toBe(BigInt("9007199254740991"));

      expect(typeof parsed.wrappedNegative).toBe("object");
      expect(parsed.wrappedNegative).toBeInstanceOf(Object);
      expect(parsed.wrappedNegative.valueOf()).toBe(BigInt(-456));

      expect(typeof parsed.wrappedZero).toBe("object");
      expect(parsed.wrappedZero).toBeInstanceOf(Object);
      expect(parsed.wrappedZero.valueOf()).toBe(BigInt(0));
    });
  });

  describe("Binary data", () => {
    it("should preserve ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < 16; i++) {
        view[i] = i;
      }

      const serialized = DSON.stringify(buffer);
      const parsed = DSON.parse(serialized);

      expect(parsed).toBeInstanceOf(ArrayBuffer);
      expect(parsed.byteLength).toBe(16);

      const parsedView = new Uint8Array(parsed);
      for (let i = 0; i < 16; i++) {
        expect(parsedView[i]).toBe(i);
      }
    });

    it("should preserve typed arrays", async () => {
      const arrays = {
        uint8: new Uint8Array([1, 2, 3, 255]),
        int8: new Int8Array([-128, -1, 0, 127]),
        uint16: new Uint16Array([0, 1000, 65535]),
        int16: new Int16Array([-32768, 0, 32767]),
        uint32: new Uint32Array([0, 1000000, 4294967295]),
        int32: new Int32Array([-2147483648, 0, 2147483647]),
        float32: new Float32Array([0.1, -0.1, Math.PI]),
        float64: new Float64Array([0.1, -0.1, Math.PI]),
      };

      const serialized = DSON.stringify(arrays);
      const parsed = DSON.parse(serialized);

      expect(parsed.uint8).toBeInstanceOf(Uint8Array);
      expect(parsed.int8).toBeInstanceOf(Int8Array);
      expect(parsed.uint16).toBeInstanceOf(Uint16Array);
      expect(parsed.int16).toBeInstanceOf(Int16Array);
      expect(parsed.uint32).toBeInstanceOf(Uint32Array);
      expect(parsed.int32).toBeInstanceOf(Int32Array);
      expect(parsed.float32).toBeInstanceOf(Float32Array);
      expect(parsed.float64).toBeInstanceOf(Float64Array);

      expect(Array.from(parsed.uint8)).toEqual([1, 2, 3, 255]);
      expect(Array.from(parsed.int8)).toEqual([-128, -1, 0, 127]);
      expect(Array.from(parsed.uint16)).toEqual([0, 1000, 65535]);
      expect(Array.from(parsed.int16)).toEqual([-32768, 0, 32767]);
      expect(Array.from(parsed.uint32)).toEqual([0, 1000000, 4294967295]);
      expect(Array.from(parsed.int32)).toEqual([-2147483648, 0, 2147483647]);

      // Float comparisons need tolerance
      expect(parsed.float32[0]).toBeCloseTo(0.1);
      expect(parsed.float32[1]).toBeCloseTo(-0.1);
      expect(parsed.float32[2]).toBeCloseTo(Math.PI);

      expect(parsed.float64[0]).toBeCloseTo(0.1);
      expect(parsed.float64[1]).toBeCloseTo(-0.1);
      expect(parsed.float64[2]).toBeCloseTo(Math.PI);
    });

    it("should preserve DataView", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setInt32(0, 42);
      view.setFloat32(4, 3.14);

      const serialized = DSON.stringify(view);
      const parsed = DSON.parse(serialized);

      expect(parsed).toBeInstanceOf(DataView);
      expect(parsed.byteLength).toBe(8);
      expect(parsed.getInt32(0)).toBe(42);
      expect(parsed.getFloat32(4)).toBeCloseTo(3.14);
    });
  });

  describe("Circular references", () => {
    it("should handle simple circular references", async () => {
      const obj: any = { name: "circular" };
      obj.self = obj;

      const serialized = DSON.stringify(obj);
      const parsed = DSON.parse(serialized);

      expect(parsed.name).toBe("circular");
      expect(parsed.self).toBe(parsed);
    });

    it("should handle complex circular references", async () => {
      const objA: any = { name: "A" };
      const objB: any = { name: "B" };
      const objC: any = { name: "C" };

      objA.refB = objB;
      objB.refC = objC;
      objC.refA = objA;

      const container = { objects: [objA, objB, objC] };

      const serialized = DSON.stringify(container);
      const parsed = DSON.parse(serialized);

      expect(parsed.objects).toHaveLength(3);
      expect(parsed.objects[0].name).toBe("A");
      expect(parsed.objects[1].name).toBe("B");
      expect(parsed.objects[2].name).toBe("C");

      // Check circular references are preserved
      expect(parsed.objects[0].refB).toBe(parsed.objects[1]);
      expect(parsed.objects[1].refC).toBe(parsed.objects[2]);
      expect(parsed.objects[2].refA).toBe(parsed.objects[0]);
    });

    it("should handle array circular references", async () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr);
      arr.push({ backref: arr });

      const serialized = DSON.stringify(arr);
      const parsed = DSON.parse(serialized);

      expect(parsed[0]).toBe(1);
      expect(parsed[1]).toBe(2);
      expect(parsed[2]).toBe(3);
      expect(parsed[3]).toBe(parsed); // Self reference
      expect(parsed[4].backref).toBe(parsed); // Object with reference back to array
    });
  });

  describe("isEqual functionality", () => {
    it("should correctly compare identical objects", async () => {
      const obj1 = {
        date: new Date("2023-01-01"),
        regex: /test/gi,
        map: new Map([["a", 1]]),
        set: new Set([1, 2, 3]),
        buffer: new Uint8Array([1, 2, 3]),
      };

      const obj2 = {
        date: new Date("2023-01-01"),
        regex: /test/gi,
        map: new Map([["a", 1]]),
        set: new Set([1, 2, 3]),
        buffer: new Uint8Array([1, 2, 3]),
      };

      expect(DSON.isEqual(obj1, obj2)).toBe(true);
    });

    it("should correctly identify differences", async () => {
      const obj1 = { date: new Date("2023-01-01") };
      const obj2 = { date: new Date("2023-01-02") };

      expect(DSON.isEqual(obj1, obj2)).toBe(false);
    });

    it("should handle circular references in comparison", async () => {
      const obj1: any = { name: "test" };
      obj1.self = obj1;

      const obj2: any = { name: "test" };
      obj2.self = obj2;

      expect(DSON.isEqual(obj1, obj2)).toBe(true);
    });
  });

  describe("clone functionality", () => {
    it("should create deep clones preserving types", async () => {
      const original = {
        date: new Date("2023-01-01"),
        regex: /test/gi,
        map: new Map([["key", { nested: "value" }]]),
        set: new Set([{ item: 1 }, { item: 2 }]),
        buffer: new Uint8Array([1, 2, 3]),
      };

      const cloned = DSON.clone(original);

      // Should be different references
      expect(cloned).not.toBe(original);
      expect(cloned.map).not.toBe(original.map);
      expect(cloned.set).not.toBe(original.set);

      // But should have same values and types
      expect(cloned.date).toBeInstanceOf(Date);
      expect(cloned.date.getTime()).toBe(original.date.getTime());
      expect(cloned.regex).toBeInstanceOf(RegExp);
      expect(cloned.regex.source).toBe(original.regex.source);
      expect(cloned.map).toBeInstanceOf(Map);
      expect(cloned.map.size).toBe(original.map.size);
      expect(cloned.set).toBeInstanceOf(Set);
      expect(cloned.set.size).toBe(original.set.size);
      expect(cloned.buffer).toBeInstanceOf(Uint8Array);
      expect(Array.from(cloned.buffer)).toEqual(Array.from(original.buffer));
    });

    it("should handle circular references in cloning", async () => {
      const original: any = { name: "original" };
      original.self = original;
      original.nested = { parent: original };

      const cloned = DSON.clone(original);

      expect(cloned).not.toBe(original);
      expect(cloned.name).toBe("original");
      expect(cloned.self).toBe(cloned);
      expect(cloned.nested.parent).toBe(cloned);
    });
  });

  describe("Performance and stress tests", () => {
    it("should handle large objects efficiently", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: new Array(100).fill(i),
        metadata: {
          created: new Date(),
          tags: new Set([`tag${i}`, `category${i % 10}`]),
        },
      }));

      const start = Date.now();
      const serialized = DSON.stringify(largeArray);
      const parsed = DSON.parse(serialized);
      const duration = Date.now() - start;

      expect(parsed).toHaveLength(1000);
      expect(parsed[0].id).toBe(0);
      expect(parsed[999].id).toBe(999);
      expect(parsed[0].metadata.tags).toBeInstanceOf(Set);

      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it("should handle deeply nested structures", async () => {
      const deep: any = { level: 0 };
      let current = deep;

      // Create 100 levels of nesting
      for (let i = 1; i < 100; i++) {
        current.next = { level: i };
        current = current.next;
      }

      const serialized = DSON.stringify(deep);
      const parsed = DSON.parse(serialized);

      // Verify the structure is preserved
      let currentParsed = parsed;
      for (let i = 0; i < 100; i++) {
        expect(currentParsed.level).toBe(i);
        if (i < 99) {
          expect(currentParsed.next).toBeDefined();
          currentParsed = currentParsed.next;
        }
      }
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle a complex application state", async () => {
      const appState = {
        user: {
          id: "12345",
          name: "John Doe",
          email: "john@example.com",
          lastLogin: new Date("2023-12-01T10:30:00Z"),
          preferences: new Map<string, string | boolean>([
            ["theme", "dark"],
            ["language", "en"],
            ["notifications", true],
          ]),
        },
        cart: {
          items: [
            { id: 1, name: "Product A", price: 29.99, quantity: 2 },
            { id: 2, name: "Product B", price: 15.5, quantity: 1 },
          ],
          total: 75.48,
          discountCodes: new Set(["SAVE10", "NEWUSER"]),
        },
        session: {
          id: "sess_abc123",
          created: new Date("2023-12-01T09:45:00Z"),
          expires: new Date("2023-12-01T17:45:00Z"),
          metadata: {
            userAgent: /Mozilla\/5\.0 \(.*?\) AppleWebKit/,
            ipAddress: "192.168.1.1",
          },
        },
        analytics: {
          events: new Map([
            ["page_view", { count: 15, lastSeen: new Date() }],
            ["click", { count: 42, lastSeen: new Date() }],
          ]),
          segments: new Set(["premium", "mobile"]),
        },
      };

      const serialized = DSON.stringify(appState);
      const parsed = DSON.parse(serialized);

      // Verify user data
      expect(parsed.user.name).toBe("John Doe");
      expect(parsed.user.lastLogin).toBeInstanceOf(Date);
      expect(parsed.user.preferences).toBeInstanceOf(Map);
      expect(parsed.user.preferences.get("theme")).toBe("dark");

      // Verify cart data
      expect(parsed.cart.items).toHaveLength(2);
      expect(parsed.cart.discountCodes).toBeInstanceOf(Set);
      expect(parsed.cart.discountCodes.has("SAVE10")).toBe(true);

      // Verify session data
      expect(parsed.session.metadata.userAgent).toBeInstanceOf(RegExp);
      expect(parsed.session.created).toBeInstanceOf(Date);

      // Verify analytics
      expect(parsed.analytics.events).toBeInstanceOf(Map);
      expect(parsed.analytics.segments).toBeInstanceOf(Set);
    });

    it("should handle API response with mixed data types", async () => {
      const apiResponse = {
        success: true,
        timestamp: new Date(),
        data: {
          users: [
            {
              id: new Uint8Array([1, 2, 3, 4]), // Binary ID
              profile: {
                name: "Alice",
                avatar: new ArrayBuffer(1024), // Binary avatar data
                joinDate: new Date("2023-01-15"),
                settings: new Map<string, string | boolean>([
                  ["emailNotifications", true],
                  ["privacyLevel", "public"],
                ]),
              },
              permissions: new Set(["read", "write", "admin"]),
            },
          ],
          metadata: {
            query: /^user_\d+$/,
            total: BigInt(1000000),
            cached: true,
            version: "1.2.3",
          },
        },
        errors: null,
      };

      const serialized = DSON.stringify(apiResponse);
      const parsed = DSON.parse(serialized);

      expect(parsed.success).toBe(true);
      expect(parsed.timestamp).toBeInstanceOf(Date);
      expect(parsed.data.users[0].id).toBeInstanceOf(Uint8Array);
      expect(parsed.data.users[0].profile.avatar).toBeInstanceOf(ArrayBuffer);
      expect(parsed.data.users[0].profile.settings).toBeInstanceOf(Map);
      expect(parsed.data.users[0].permissions).toBeInstanceOf(Set);
      expect(parsed.data.metadata.query).toBeInstanceOf(RegExp);
      expect(typeof parsed.data.metadata.total).toBe("bigint");
    });
  });
});
