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
      it("should handle circular references", async () => {
        const obj: any = {
          name: "parent",
          child: {
            name: "child",
          },
        };
        obj.child.parent = obj;
        obj.self = obj;

        const serialized = DSON.stringify(obj);
        const parsed = DSON.parse(serialized);

        expect(parsed.name).toBe("parent");
        expect(parsed.child.name).toBe("child");
        expect(parsed.child.parent).toBe(parsed);
        expect(parsed.self).toBe(parsed);
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

        const cloned = DSON.clone(original);

        // Should be deeply equal
        expect(DSON.isEqual(original, cloned)).toBe(true);

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

        const cloned = DSON.clone(original);

        expect(cloned.name).toBe("original");
        expect(cloned.self).toBe(cloned);
        expect(cloned.nested.parent).toBe(cloned);
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

        expect(DSON.isEqual(obj1, obj2)).toBe(true);
        expect(DSON.isEqual(obj1, obj3)).toBe(false);
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

        expect(DSON.isEqual(circ1, circ2)).toBe(true);
        expect(DSON.isEqual(circ1, circ3)).toBe(false);
      });

      it("should work with cloned objects", async () => {
        const original = {
          complex: new Map<unknown, unknown>([
            ["date", new Date("2023-01-01")],
            ["set", new Set([1, 2, 3])],
          ]),
        };

        const cloned = DSON.clone(original);

        expect(DSON.isEqual(original, cloned)).toBe(true);
        expect(original).not.toBe(cloned);
      });
    });

    describe("Error handling and edge cases", () => {
      it("should handle very deep nesting", async () => {
        // Create a deeply nested object
        let deep: any = { value: "bottom" };
        for (let i = 0; i < 100; i++) {
          deep = { level: i, nested: deep };
        }

        const serialized = DSON.stringify(deep);
        const parsed = DSON.parse(serialized);
        const cloned = DSON.clone(deep);

        expect(DSON.isEqual(deep, parsed)).toBe(true);
        expect(DSON.isEqual(deep, cloned)).toBe(true);
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
        const serialized = DSON.stringify(large);
        const parsed = DSON.parse(serialized);
        const duration = Date.now() - start;

        expect(DSON.isEqual(large, parsed)).toBe(true);
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

        const dsonSerialized = DSON.stringify(jsonData);
        const jsonSerialized = JSON.stringify(jsonData);

        // For basic JSON structures, DSON should produce similar results
        const dsonParsed = DSON.parse(dsonSerialized);
        const jsonParsed = JSON.parse(jsonSerialized);

        expect(dsonParsed).toEqual(jsonParsed);
      });
    });

    describe("Real-world scenarios", () => {
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

        const serialized = DSON.stringify(database);
        const restored = DSON.parse(serialized);

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
