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
        const dsonSerialized = await DSON.stringify(obj);
        const dsonParsed = await DSON.parse(dsonSerialized);

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

      const serialized = await DSON.stringify(complex);
      const parsed = await DSON.parse(serialized);

      expect(parsed).toEqual(complex);
      expect(parsed.users).toHaveLength(2);
      expect(parsed.users[0].name).toBe("Alice");
      expect(parsed.metadata.settings.theme).toBe("dark");
    });
  });

  describe("Extended JavaScript types", () => {
    it("should preserve Date objects through serialize/deserialize cycle", async () => {
      const dates = {
        now: new Date(),
        epoch: new Date(0),
        specific: new Date("2023-12-25T12:30:45.123Z"),
        invalid: new Date("invalid"),
      };

      const serialized = await DSON.stringify(dates);
      const parsed = await DSON.parse(serialized);

      expect(parsed.now).toBeInstanceOf(Date);
      expect(parsed.epoch).toBeInstanceOf(Date);
      expect(parsed.specific).toBeInstanceOf(Date);
      expect(parsed.invalid).toBeInstanceOf(Date);

      expect(parsed.now.getTime()).toBe(dates.now.getTime());
      expect(parsed.epoch.getTime()).toBe(0);
      expect(parsed.specific.getTime()).toBe(dates.specific.getTime());
      expect(Number.isNaN(parsed.invalid.getTime())).toBe(true);
    });

    it("should preserve RegExp objects", async () => {
      const regexes = {
        simple: /test/,
        withFlags: /pattern/gim,
        complex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
        escaped: /path\/to\/file\.(js|ts)$/,
      };

      const serialized = await DSON.stringify(regexes);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(map);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(set);
      const parsed = await DSON.parse(serialized);

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

    it("should preserve Symbols", async () => {
      const symbols = {
        regular: Symbol("regular"),
        empty: Symbol(),
        global: Symbol.for("global-symbol"),
      };

      const serialized = await DSON.stringify(symbols);
      const parsed = await DSON.parse(serialized);

      expect(typeof parsed.regular).toBe("symbol");
      expect(typeof parsed.empty).toBe("symbol");
      expect(typeof parsed.global).toBe("symbol");

      expect(parsed.regular.description).toBe("regular");
      expect(parsed.empty.description).toBe(undefined);
      expect(parsed.global).toBe(Symbol.for("global-symbol")); // Global symbols should be identical
    });

    it("should preserve BigInt", async () => {
      const bigints = {
        small: BigInt(123),
        large: BigInt("9007199254740991"),
        negative: BigInt(-456),
        zero: BigInt(0),
      };

      const serialized = await DSON.stringify(bigints);
      const parsed = await DSON.parse(serialized);

      expect(typeof parsed.small).toBe("bigint");
      expect(typeof parsed.large).toBe("bigint");
      expect(typeof parsed.negative).toBe("bigint");
      expect(typeof parsed.zero).toBe("bigint");

      expect(parsed.small).toBe(BigInt(123));
      expect(parsed.large).toBe(BigInt("9007199254740991"));
      expect(parsed.negative).toBe(BigInt(-456));
      expect(parsed.zero).toBe(BigInt(0));
    });
  });

  describe("Binary data", () => {
    it("should preserve ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < 16; i++) {
        view[i] = i;
      }

      const serialized = await DSON.stringify(buffer);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(arrays);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(view);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(obj);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(container);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(arr);
      const parsed = await DSON.parse(serialized);

      expect(parsed[0]).toBe(1);
      expect(parsed[1]).toBe(2);
      expect(parsed[2]).toBe(3);
      expect(parsed[3]).toBe(parsed); // Self reference
      expect(parsed[4].backref).toBe(parsed); // Object with reference back to array
    });
  });

  describe("Custom classes", () => {
    class Person {
      public name: string;
      public age: number;

      constructor(name?: string, age?: number) {
        this.name = name || "";
        this.age = age || 0;
      }

      greet() {
        return `Hello, I'm ${this.name}`;
      }
    }

    class Employee extends Person {
      public department: string;

      constructor(name?: string, age?: number, department?: string) {
        super(name, age);
        this.department = department || "";
      }

      work() {
        return `${this.name} is working in ${this.department}`;
      }
    }

    it("should preserve custom class instances with constructor map", async () => {
      const person = new Person("Alice", 30);
      const employee = new Employee("Bob", 25, "Engineering");

      const data = { person, employee };
      const serialized = await DSON.stringify(data);
      const parsed = await DSON.parse(serialized, { Person, Employee });

      expect(parsed.person).toBeInstanceOf(Person);
      expect(parsed.employee).toBeInstanceOf(Employee);

      expect(parsed.person.name).toBe("Alice");
      expect(parsed.person.age).toBe(30);
      expect(parsed.person.greet()).toBe("Hello, I'm Alice");

      expect(parsed.employee.name).toBe("Bob");
      expect(parsed.employee.age).toBe(25);
      expect(parsed.employee.department).toBe("Engineering");
      expect(parsed.employee.work()).toBe("Bob is working in Engineering");
      expect(parsed.employee.greet()).toBe("Hello, I'm Bob");
    });

    it("should handle missing constructors gracefully", async () => {
      const person = new Person("Alice", 30);
      const data = { person };

      const serialized = await DSON.stringify(data);
      const parsed = await DSON.parse(serialized); // No constructor map

      expect(parsed.person).not.toBeInstanceOf(Person);
      expect(parsed.person.name).toBe("Alice");
      expect(parsed.person.age).toBe(30);
      expect(typeof parsed.person.greet).toBe("undefined");
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

      expect(await DSON.isEqual(obj1, obj2)).toBe(true);
    });

    it("should correctly identify differences", async () => {
      const obj1 = { date: new Date("2023-01-01") };
      const obj2 = { date: new Date("2023-01-02") };

      expect(await DSON.isEqual(obj1, obj2)).toBe(false);
    });

    it("should handle circular references in comparison", async () => {
      const obj1: any = { name: "test" };
      obj1.self = obj1;

      const obj2: any = { name: "test" };
      obj2.self = obj2;

      expect(await DSON.isEqual(obj1, obj2)).toBe(true);
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

      const cloned = await DSON.clone(original);

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

      const cloned = await DSON.clone(original);

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
      const serialized = await DSON.stringify(largeArray);
      const parsed = await DSON.parse(serialized);
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

      const serialized = await DSON.stringify(deep);
      const parsed = await DSON.parse(serialized);

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

  describe("Edge cases and error handling", () => {
    it("should handle empty and null inputs", async () => {
      expect(await DSON.parse("")).toBe(null);
      expect(await DSON.stringify(null)).toBe("null");
      expect(await DSON.parse("null")).toBe(null);
    });

    it("should handle functions in objects", async () => {
      const obj = {
        name: "test",
        fn: () => "hello",
        arrow: () => "world",
        data: [1, 2, 3],
      };

      const serialized = await DSON.stringify(obj);
      const parsed = await DSON.parse(serialized);

      expect(parsed.name).toBe("test");
      expect(parsed.data).toEqual([1, 2, 3]);
      expect(typeof parsed.fn).toBe("function");
      expect(typeof parsed.arrow).toBe("function");
    });

    it("should handle special numeric values", async () => {
      const obj = {
        infinity: Number.POSITIVE_INFINITY,
        negInfinity: Number.NEGATIVE_INFINITY,
        nan: Number.NaN,
        negZero: -0,
        maxSafe: Number.MAX_SAFE_INTEGER,
        minSafe: Number.MIN_SAFE_INTEGER,
      };

      const serialized = await DSON.stringify(obj);
      const parsed = await DSON.parse(serialized);

      expect(parsed.infinity).toBe(Number.POSITIVE_INFINITY);
      expect(parsed.negInfinity).toBe(Number.NEGATIVE_INFINITY);
      expect(Number.isNaN(parsed.nan)).toBe(true);
      expect(Object.is(parsed.negZero, -0)).toBe(true);
      expect(parsed.maxSafe).toBe(Number.MAX_SAFE_INTEGER);
      expect(parsed.minSafe).toBe(Number.MIN_SAFE_INTEGER);
    });

    it("should be resilient to malformed input", async () => {
      const malformedInputs = [
        "{invalid json}",
        "[unclosed array",
        "undefined",
        "function() {}",
        "",
      ];

      for (const input of malformedInputs) {
        if (input === "") {
          expect(await DSON.parse(input)).toBe(null);
        } else {
          await expect(DSON.parse(input)).rejects.toThrow();
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

      const serialized = await DSON.stringify(appState);
      const parsed = await DSON.parse(serialized);

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

      const serialized = await DSON.stringify(apiResponse);
      const parsed = await DSON.parse(serialized);

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
