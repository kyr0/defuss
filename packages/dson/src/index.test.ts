/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DSON } from "./index.js";

describe("DSON", () => {
  describe("API exports", () => {
    it("should export DSON with all required methods", () => {
      expect(DSON).toBeDefined();
      expect(DSON.clone).toBeInstanceOf(Function);
      expect(DSON.parse).toBeInstanceOf(Function);
      expect(DSON.stringify).toBeInstanceOf(Function);
      expect(DSON.isEqual).toBeInstanceOf(Function);
    });
  });

  describe("Integration tests", () => {
    describe("stringify/parse round-trip", () => {
      it("should handle primitive types", async () => {
        const primitives = [
          null,
          undefined,
          true,
          false,
          42,
          // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
          3.14159,
          "hello world",
          BigInt(123),
          Symbol("test"),
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NaN,
        ];

        for (const value of primitives) {
          const serialized = await DSON.stringify(value);
          const parsed = await DSON.parse(serialized);

          if (typeof value === "symbol") {
            expect(typeof parsed).toBe("symbol");
            expect(parsed.description).toBe(value.description);
          } else if (Number.isNaN(value)) {
            expect(Number.isNaN(parsed)).toBe(true);
          } else {
            expect(parsed).toEqual(value);
          }
        }
      });

      it("should handle complex objects", async () => {
        const complex = {
          string: "hello",
          number: 42,
          boolean: true,
          null: null,
          undefined: undefined,
          date: new Date("2023-01-01T00:00:00.000Z"),
          regex: /test/gi,
          map: new Map<unknown, unknown>([
            ["key1", "value1"],
            ["key2", { nested: true }],
          ]),
          set: new Set([1, "two", { three: 3 }]),
          array: [1, "two", { three: 3 }],
          nested: {
            deep: {
              value: "deep nested",
            },
          },
          buffer: new Uint8Array([1, 2, 3, 4, 5]),
          bigint: BigInt(9007199254740991),
          symbol: Symbol("test"),
        };

        const serialized = await DSON.stringify(complex);
        const parsed = await DSON.parse(serialized);

        expect(parsed.string).toBe("hello");
        expect(parsed.number).toBe(42);
        expect(parsed.boolean).toBe(true);
        expect(parsed.null).toBe(null);
        expect(parsed.undefined).toBe(undefined);
        expect(parsed.date).toBeInstanceOf(Date);
        expect(parsed.date.getTime()).toBe(complex.date.getTime());
        expect(parsed.regex).toBeInstanceOf(RegExp);
        expect(parsed.regex.source).toBe(complex.regex.source);
        expect(parsed.regex.flags).toBe(complex.regex.flags);
        expect(parsed.map).toBeInstanceOf(Map);
        expect(parsed.map.get("key1")).toBe("value1");
        expect(parsed.set).toBeInstanceOf(Set);
        expect(parsed.set.has(1)).toBe(true);
        expect(parsed.array).toEqual([1, "two", { three: 3 }]);
        expect(parsed.nested.deep.value).toBe("deep nested");
        expect(parsed.buffer).toBeInstanceOf(Uint8Array);
        expect(Array.from(parsed.buffer)).toEqual([1, 2, 3, 4, 5]);
        expect(typeof parsed.bigint).toBe("bigint");
        expect(parsed.bigint).toBe(BigInt(9007199254740991));
        expect(typeof parsed.symbol).toBe("symbol");
        expect(parsed.symbol.description).toBe("test");
      });

      it("should handle circular references", async () => {
        const obj: any = {
          name: "parent",
          child: {
            name: "child",
          },
        };
        obj.child.parent = obj;
        obj.self = obj;

        const serialized = await DSON.stringify(obj);
        const parsed = await DSON.parse(serialized);

        expect(parsed.name).toBe("parent");
        expect(parsed.child.name).toBe("child");
        expect(parsed.child.parent).toBe(parsed);
        expect(parsed.self).toBe(parsed);
      });

      it("should handle custom classes", async () => {
        class Person {
          constructor(
            public name: string,
            public age: number,
          ) {}

          greet() {
            return `Hello, I'm ${this.name}`;
          }
        }

        class Employee extends Person {
          constructor(
            name: string,
            age: number,
            public department: string,
          ) {
            super(name, age);
          }

          work() {
            return `${this.name} works in ${this.department}`;
          }
        }

        const data = {
          person: new Person("Alice", 30),
          employee: new Employee("Bob", 25, "Engineering"),
          team: [
            new Employee("Charlie", 35, "Design"),
            new Employee("Diana", 28, "Marketing"),
          ],
        };

        const serialized = await DSON.stringify(data);
        const parsed = await DSON.parse(serialized, {
          Person,
          Employee,
        } as any);

        expect(parsed.person).toBeInstanceOf(Person);
        expect(parsed.person.name).toBe("Alice");
        expect(parsed.person.greet()).toBe("Hello, I'm Alice");

        expect(parsed.employee).toBeInstanceOf(Employee);
        expect(parsed.employee).toBeInstanceOf(Person);
        expect(parsed.employee.name).toBe("Bob");
        expect(parsed.employee.department).toBe("Engineering");
        expect(parsed.employee.work()).toBe("Bob works in Engineering");

        expect(parsed.team[0]).toBeInstanceOf(Employee);
        expect(parsed.team[0].name).toBe("Charlie");
        expect(parsed.team[1]).toBeInstanceOf(Employee);
        expect(parsed.team[1].department).toBe("Marketing");
      });

      it("should handle arrays with mixed types", async () => {
        const mixedArray = [
          1,
          "string",
          true,
          null,
          undefined,
          new Date("2023-01-01"),
          /regex/i,
          new Map([["key", "value"]]),
          new Set([1, 2, 3]),
          { object: true },
          [1, 2, 3],
          BigInt(123),
          Symbol("array-symbol"),
          new Uint8Array([1, 2, 3]),
        ];

        const serialized = await DSON.stringify(mixedArray);
        const parsed = await DSON.parse(serialized);

        expect(parsed).toHaveLength(mixedArray.length);
        expect(parsed[0]).toBe(1);
        expect(parsed[1]).toBe("string");
        expect(parsed[2]).toBe(true);
        expect(parsed[3]).toBe(null);
        expect(parsed[4]).toBe(undefined);
        expect(parsed[5]).toBeInstanceOf(Date);
        expect(parsed[6]).toBeInstanceOf(RegExp);
        expect(parsed[7]).toBeInstanceOf(Map);
        expect(parsed[8]).toBeInstanceOf(Set);
        expect(parsed[9]).toEqual({ object: true });
        expect(parsed[10]).toEqual([1, 2, 3]);
        expect(typeof parsed[11]).toBe("bigint");
        expect(typeof parsed[12]).toBe("symbol");
        expect(parsed[13]).toBeInstanceOf(Uint8Array);
      });
    });

    describe("clone functionality", () => {
      it("should create deep clones that are equal but not identical", async () => {
        const original = {
          date: new Date("2023-01-01"),
          map: new Map([["key", { value: "nested" }]]),
          set: new Set([{ id: 1 }, { id: 2 }]),
          array: [{ item: "one" }, { item: "two" }],
        };

        const cloned = await DSON.clone(original);

        // Should be deeply equal
        expect(await DSON.isEqual(original, cloned)).toBe(true);

        // But not the same references
        expect(cloned).not.toBe(original);
        expect(cloned.date).not.toBe(original.date);
        expect(cloned.map).not.toBe(original.map);
        expect(cloned.set).not.toBe(original.set);
        expect(cloned.array).not.toBe(original.array);
        expect(cloned.array[0]).not.toBe(original.array[0]);
      });

      it("should preserve circular references in clones", async () => {
        const original: any = { name: "original" };
        original.self = original;
        original.nested = { parent: original };

        const cloned = await DSON.clone(original);

        expect(cloned.name).toBe("original");
        expect(cloned.self).toBe(cloned);
        expect(cloned.nested.parent).toBe(cloned);
        expect(cloned).not.toBe(original);
      });

      it("should clone custom classes with methods", async () => {
        class Calculator {
          constructor(public value = 0) {}

          add(n: number) {
            this.value += n;
            return this;
          }

          multiply(n: number) {
            this.value *= n;
            return this;
          }

          getValue() {
            return this.value;
          }
        }

        const original = new Calculator(10);
        original.add(5).multiply(2);

        const cloned = await DSON.clone(original);

        expect(cloned).toBeInstanceOf(Calculator);
        expect(cloned.getValue()).toBe(30);
        expect(cloned.add(10).getValue()).toBe(40);
        expect(original.getValue()).toBe(30); // Original unchanged
        expect(cloned).not.toBe(original);
      });
    });

    describe("isEqual functionality", () => {
      it("should correctly compare complex structures", async () => {
        const obj1 = {
          date: new Date("2023-01-01"),
          regex: /test/gi,
          map: new Map([
            ["a", 1],
            ["b", 2],
          ]),
          set: new Set([1, 2, 3]),
          buffer: new Uint8Array([1, 2, 3]),
        };

        const obj2 = {
          date: new Date("2023-01-01"),
          regex: /test/gi,
          map: new Map([
            ["a", 1],
            ["b", 2],
          ]),
          set: new Set([1, 2, 3]),
          buffer: new Uint8Array([1, 2, 3]),
        };

        const obj3 = {
          ...obj1,
          date: new Date("2023-01-02"), // Different date
        };

        expect(await DSON.isEqual(obj1, obj2)).toBe(true);
        expect(await DSON.isEqual(obj1, obj3)).toBe(false);
      });

      it("should handle equality with circular references", async () => {
        const createCircular = (name: string) => {
          const obj: any = { name };
          obj.self = obj;
          obj.nested = { parent: obj };
          return obj;
        };

        const circ1 = createCircular("test");
        const circ2 = createCircular("test");
        const circ3 = createCircular("different");

        expect(await DSON.isEqual(circ1, circ2)).toBe(true);
        expect(await DSON.isEqual(circ1, circ3)).toBe(false);
      });

      it("should work with cloned objects", async () => {
        const original = {
          complex: new Map<unknown, unknown>([
            ["date", new Date("2023-01-01")],
            ["set", new Set([1, 2, 3])],
          ]),
        };

        const cloned = await DSON.clone(original);

        expect(await DSON.isEqual(original, cloned)).toBe(true);
        expect(original).not.toBe(cloned);
      });
    });

    describe("Error handling and edge cases", () => {
      it("should handle empty inputs gracefully", async () => {
        expect(await DSON.parse("")).toBe(null);
        expect(await DSON.stringify(null)).toBe("null");
        expect(await DSON.clone(null)).toBe(null);
        expect(await DSON.isEqual(null, null)).toBe(true);
      });

      it("should handle malformed JSON gracefully", async () => {
        await expect(DSON.parse("{")).rejects.toThrow();
        await expect(DSON.parse("[invalid")).rejects.toThrow();
      });

      it("should handle very deep nesting", async () => {
        // Create a deeply nested object
        let deep: any = { value: "bottom" };
        for (let i = 0; i < 100; i++) {
          deep = { level: i, nested: deep };
        }

        const serialized = await DSON.stringify(deep);
        const parsed = await DSON.parse(serialized);
        const cloned = await DSON.clone(deep);

        expect(await DSON.isEqual(deep, parsed)).toBe(true);
        expect(await DSON.isEqual(deep, cloned)).toBe(true);
      });

      it("should handle objects with many properties", async () => {
        const large: any = {};
        for (let i = 0; i < 1000; i++) {
          large[`prop${i}`] = {
            id: i,
            value: `value${i}`,
            data: new Date(2023, 0, (i % 28) + 1),
          };
        }

        const start = Date.now();
        const serialized = await DSON.stringify(large);
        const parsed = await DSON.parse(serialized);
        const duration = Date.now() - start;

        expect(await DSON.isEqual(large, parsed)).toBe(true);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });

    describe("JSON compatibility", () => {
      it("should handle regular JSON structures", async () => {
        const jsonData = {
          string: "hello",
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: {
            nested: "value",
          },
        };

        const dsonSerialized = await DSON.stringify(jsonData);
        const jsonSerialized = JSON.stringify(jsonData);

        // For basic JSON structures, DSON should produce similar results
        const dsonParsed = await DSON.parse(dsonSerialized);
        const jsonParsed = JSON.parse(jsonSerialized);

        expect(dsonParsed).toEqual(jsonParsed);
      });

      it("should extend JSON with additional types", async () => {
        const extendedData = {
          // Standard JSON
          string: "hello",
          number: 42,
          // DSON extensions
          date: new Date("2023-01-01"),
          regex: /test/i,
          map: new Map([["key", "value"]]),
          undefined: undefined,
          bigint: BigInt(123),
        };

        // Standard JSON would lose type information
        const jsonString = JSON.stringify(extendedData);
        const jsonParsed = JSON.parse(jsonString);

        expect(jsonParsed.date).toBeTypeOf("string"); // Date becomes string
        expect(jsonParsed.regex).toEqual({}); // RegExp becomes empty object
        expect(jsonParsed.map).toEqual({}); // Map becomes empty object
        expect(jsonParsed.undefined).toBeUndefined(); // undefined is lost
        expect(jsonParsed.bigint).toBeUndefined(); // bigint is lost

        // DSON preserves all types
        const dsonString = await DSON.stringify(extendedData);
        const dsonParsed = await DSON.parse(dsonString);

        expect(dsonParsed.date).toBeInstanceOf(Date);
        expect(dsonParsed.regex).toBeInstanceOf(RegExp);
        expect(dsonParsed.map).toBeInstanceOf(Map);
        expect(dsonParsed.undefined).toBe(undefined);
        expect(typeof dsonParsed.bigint).toBe("bigint");
      });
    });

    describe("Real-world scenarios", () => {
      it("should handle a complete application state", async () => {
        class User {
          constructor(
            public id: string,
            public name: string,
            public email: string,
            public createdAt: Date = new Date(),
          ) {}

          toJSON() {
            return {
              id: this.id,
              name: this.name,
              email: this.email,
              createdAt: this.createdAt,
            };
          }
        }

        class Project {
          constructor(
            public id: string,
            public name: string,
            public members: Set<User> = new Set(),
            public metadata: Map<string, any> = new Map(),
          ) {}
        }

        const appState = {
          currentUser: new User("1", "Alice", "alice@example.com"),
          projects: [
            new Project("p1", "Project 1"),
            new Project("p2", "Project 2"),
          ],
          settings: {
            theme: "dark",
            lastLogin: new Date("2023-01-01T10:00:00Z"),
            preferences: new Map([
              ["notifications", true],
              ["autoSave", false],
            ]),
          },
          cache: new Map<string, User | Project>([
            ["user:1", new User("1", "Alice", "alice@example.com")],
            ["project:p1", new Project("p1", "Project 1")],
          ]),
          activeFilters: new Set(["status:active", "type:important"]),
        };

        // Add some circular references (typical in application state)
        appState.projects[0].members.add(appState.currentUser);
        appState.projects[1].members.add(appState.currentUser);

        const serialized = await DSON.stringify(appState);
        const restored = await DSON.parse(serialized, { User, Project } as any);

        expect(restored.currentUser).toBeInstanceOf(User);
        expect(restored.currentUser.name).toBe("Alice");
        expect(restored.projects[0]).toBeInstanceOf(Project);
        expect(restored.projects[0].members.has(restored.currentUser)).toBe(
          true,
        );
        expect(restored.settings.lastLogin).toBeInstanceOf(Date);
        expect(restored.settings.preferences).toBeInstanceOf(Map);
        expect(restored.cache).toBeInstanceOf(Map);
        expect(restored.activeFilters).toBeInstanceOf(Set);

        // Verify the restored state is functionally equivalent
        expect(await DSON.isEqual(appState, restored)).toBe(true);
      });

      it("should handle database-like records with relationships", async () => {
        const users = new Map();
        const posts = new Map();
        const comments = new Map();

        // Create some interconnected data
        const user1 = {
          id: "1",
          name: "Alice",
          posts: new Set(),
          comments: new Set(),
        };
        const user2 = {
          id: "2",
          name: "Bob",
          posts: new Set(),
          comments: new Set(),
        };

        const post1 = {
          id: "p1",
          title: "Post 1",
          author: user1,
          comments: new Set(),
          createdAt: new Date("2023-01-01"),
        };
        const post2 = {
          id: "p2",
          title: "Post 2",
          author: user2,
          comments: new Set(),
          createdAt: new Date("2023-01-02"),
        };

        const comment1 = {
          id: "c1",
          text: "Comment 1",
          author: user1,
          post: post1,
          createdAt: new Date("2023-01-01T12:00:00Z"),
        };
        const comment2 = {
          id: "c2",
          text: "Comment 2",
          author: user2,
          post: post1,
          createdAt: new Date("2023-01-01T13:00:00Z"),
        };

        // Set up relationships
        user1.posts.add(post1);
        user1.comments.add(comment1);
        user2.posts.add(post2);
        user2.comments.add(comment2);

        post1.comments.add(comment1);
        post1.comments.add(comment2);

        users.set("1", user1);
        users.set("2", user2);
        posts.set("p1", post1);
        posts.set("p2", post2);
        comments.set("c1", comment1);
        comments.set("c2", comment2);

        const database = { users, posts, comments };

        const serialized = await DSON.stringify(database);
        const restored = await DSON.parse(serialized);

        // Verify structure is preserved
        expect(restored.users).toBeInstanceOf(Map);
        expect(restored.posts).toBeInstanceOf(Map);
        expect(restored.comments).toBeInstanceOf(Map);

        const restoredUser1 = restored.users.get("1");
        const restoredPost1 = restored.posts.get("p1");
        const restoredComment1 = restored.comments.get("c1");

        expect(restoredUser1.name).toBe("Alice");
        expect(restoredPost1.title).toBe("Post 1");
        expect(restoredComment1.text).toBe("Comment 1");

        // Verify relationships are maintained
        expect(restoredPost1.author).toBe(restoredUser1);
        expect(restoredComment1.author).toBe(restoredUser1);
        expect(restoredComment1.post).toBe(restoredPost1);
        expect(restoredUser1.posts.has(restoredPost1)).toBe(true);
        expect(restoredPost1.comments.has(restoredComment1)).toBe(true);

        // Verify dates are preserved
        expect(restoredPost1.createdAt).toBeInstanceOf(Date);
        expect(restoredComment1.createdAt).toBeInstanceOf(Date);
      });
    });
  });
});
