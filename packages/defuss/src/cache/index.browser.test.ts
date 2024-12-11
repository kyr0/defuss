/**
 * @vitest-environment jsdom
 */
import { cache } from "./index.js"
import type { MiddlewareFn } from "./provider.js"

it('can save in-memory as the default (browser)', () => {
  
  const memoryStorage = cache<number>()
  memoryStorage.set('abc', 123)
  expect(memoryStorage.get('abc', 0)).toStrictEqual(123)
})

it('can save in-memory (browser)', () => {
  
  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123)
  expect(memoryStorage.get('abc', 0)).toStrictEqual(123)
})

it('can delete from memory (browser)', () => {
  
  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123)
  memoryStorage.remove('abc')
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can clear memory (browser)', () => {
  
  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123)
  memoryStorage.removeAll()
  expect(memoryStorage.backendApi).toBeDefined()
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can write and read from localStorage (browser)', () => {
  
  const memoryStorage = cache<number>('local')
  memoryStorage.set('abc', 123)
  expect(memoryStorage.get('abc', 0)).toStrictEqual(123)
})

it('can delete from localStorage (browser)', () => {
  
  const memoryStorage = cache<number>('local')
  memoryStorage.set('abc', 123)
  memoryStorage.remove('abc')
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can clear localStorage (browser)', () => {
  
  const memoryStorage = cache<number>('local')
  memoryStorage.set('abc', 123)
  memoryStorage.removeAll()
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can write and read from sessionStorage (browser)', () => {
  
  const memoryStorage = cache<number>('session')
  memoryStorage.set('abc', 123)
  expect(memoryStorage.get('abc', 0)).toStrictEqual(123)
})

it('can delete from sessionStorage (browser)', () => {
  
  const memoryStorage = cache<number>('session')
  memoryStorage.set('abc', 123)
  memoryStorage.remove('abc')
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can clear sessionStorage (browser)', () => {
  
  const memoryStorage = cache<number>('session')
  memoryStorage.set('abc', 123)
  memoryStorage.removeAll()
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can write and read from memory (browser)', () => {
  
  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123)
  expect(memoryStorage.get('abc', 0)).toStrictEqual(123)
})

it('can delete from memory (browser)', () => {
  
  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123)
  memoryStorage.remove('abc')
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can clear memory (browser)', () => {
  
  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123)
  memoryStorage.removeAll()
  expect(memoryStorage.get('abc', 444)).toStrictEqual(444)
})

it('can write and read from memory using a middleware (browser)', () => {
  

  const getMiddleware: MiddlewareFn<number> = <T>(key: string, value: T) => {
    return value
  }

  const setMiddleware: MiddlewareFn<number> = <T>(key: string, value: T) => {
    return value
  }

  const memoryStorage = cache<number>('memory')
  memoryStorage.set('abc', 123, setMiddleware)
  expect(memoryStorage.get('abc', 0, getMiddleware)).toStrictEqual(123)
})
