/**
 * @vitest-environment node
 */
import { webstorage } from "./index.js";
import type { MiddlewareFn } from "./types.js";

it("can save in-memory as the default (server)", () => {
  const memoryStorage = webstorage<number>();
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can save in-memory (server)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can delete from memory (server)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear memory (server)", () => {
  const memoryStorage = webstorage<number>("memory");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can write and read from localStorage (server)", () => {
  const memoryStorage = webstorage<number>("local");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can delete from localStorage (server)", () => {
  const memoryStorage = webstorage<number>("local");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear localStorage (server)", () => {
  const memoryStorage = webstorage<number>("local");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can write and read from sessionStorage (server)", () => {
  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123);
  expect(memoryStorage.get("abc", 0)).toStrictEqual(123);
});

it("can write and read from sessionStorage using a middleware (server)", () => {
  const getMiddleware: MiddlewareFn<number> = <T>(key: string, value: T) => {
    return value;
  };

  const setMiddleware: MiddlewareFn<number> = <T>(key: string, value: T) => {
    return value;
  };

  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123, setMiddleware);
  expect(memoryStorage.get("abc", 0, getMiddleware)).toStrictEqual(123);
});

it("can delete from sessionStorage (server)", () => {
  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123);
  memoryStorage.remove("abc");
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});

it("can clear sessionStorage (server)", () => {
  const memoryStorage = webstorage<number>("session");
  memoryStorage.set("abc", 123);
  memoryStorage.removeAll();
  expect(memoryStorage.get("abc", 444)).toStrictEqual(444);
});
