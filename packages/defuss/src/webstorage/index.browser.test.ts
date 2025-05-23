/**
 * @vitest-environment jsdom
 */
import { webstorage } from "./index.js";
import type { MiddlewareFn } from "./types.js";

it("can save in-memory as the default (browser)", () => {
  const memoryStorage = webstorage<number>();
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can save in-memory (browser)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can delete from memory (browser)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear memory (browser)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.backendApi).toBeDefined();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can write and read from localStorage (browser)", () => {
  const memoryStorage = webstorage<number>("local");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can delete from localStorage (browser)", () => {
  const memoryStorage = webstorage<number>("local");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear localStorage (browser)", () => {
  const memoryStorage = webstorage<number>("local");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can write and read from sessionStorage (browser)", () => {
  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can delete from sessionStorage (browser)", () => {
  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear sessionStorage (browser)", () => {
  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can write and read from memory (browser)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can delete from memory (browser)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear memory (browser)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can write and read from memory using a middleware (browser)", () => {
  const getMiddleware: MiddlewareFn<number> = <T>(key: string, value: T) => {
    return value;
  };

  const setMiddleware: MiddlewareFn<number> = <T>(key: string, value: T) => {
    return value;
  };

  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123, setMiddleware);
  expect(memoryStorage.get("abc", 0, getMiddleware)).toStrictEqual(123);
});
