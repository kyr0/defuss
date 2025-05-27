// i18n, transval // object access tools with type safety

/**
 * Unique symbol to identify path accessor objects
 */
export const PATH_ACCESSOR_SYMBOL = Symbol("PathAccessor");

/**
 * Type helper for access accessor that returns string paths
 * This type allows chaining property access while maintaining type safety
 * and ultimately returning a string representation of the access
 */
export type PathAccessor<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? PathAccessor<T[K]> & string
        : string;
    } & string
  : string;

/**
 * Dynamic type for untyped object property access
 * Use this with access<Dynamic>() to enable arbitrary property access
 */
export type Dynamic = {
  [key: string]: Dynamic;
};

const createProxy = (currentPath: string[] = []): any => {
  const pathString = currentPath.join(".");

  // Create a target that extends String
  const target = Object.create(String.prototype);
  target.value = pathString;

  return new Proxy(target, {
    get(target, prop: string | symbol) {
      // Handle the path accessor symbol
      if (prop === PATH_ACCESSOR_SYMBOL) {
        return true;
      }

      // Handle string conversion methods
      if (prop === "toString" || prop === "valueOf") {
        return () => pathString;
      }

      if (prop === Symbol.toPrimitive) {
        return (hint?: string) => pathString;
      }

      // Skip other symbol properties except for well-known ones
      if (typeof prop === "symbol") {
        return undefined;
      }

      // Handle array index access
      if (
        prop === "length" ||
        (typeof prop === "string" && /^\d+$/.test(prop))
      ) {
        const newPath = [...currentPath, `[${prop}]`];
        return createProxy(newPath);
      }

      // Handle property access
      const newPath = [...currentPath, prop];
      return createProxy(newPath);
    },

    // This is crucial for equality comparisons
    getPrototypeOf(target) {
      return String.prototype;
    },

    // Make the proxy appear as a primitive string
    has(target, prop) {
      if (
        prop === PATH_ACCESSOR_SYMBOL ||
        prop === Symbol.toPrimitive ||
        prop === "toString" ||
        prop === "valueOf"
      ) {
        return true;
      }
      return prop in String.prototype;
    },

    ownKeys(target) {
      return ["value"];
    },

    getOwnPropertyDescriptor(target, prop) {
      if (prop === PATH_ACCESSOR_SYMBOL) {
        return {
          configurable: true,
          enumerable: false,
          value: true,
          writable: false,
        };
      }
      if (prop === "toString" || prop === "valueOf") {
        return {
          configurable: true,
          enumerable: false,
          value: () => pathString,
          writable: false,
        };
      }
      if (prop === Symbol.toPrimitive) {
        return {
          configurable: true,
          enumerable: false,
          value: (hint?: string) => pathString,
          writable: false,
        };
      }
      if (prop === "value") {
        return {
          configurable: true,
          enumerable: false,
          value: pathString,
          writable: false,
        };
      }
      return undefined;
    },
  });
};

/**
 * Creates a type-safe access accessor that returns string representations of property paths
 *
 * @example
 * ```typescript
 * interface User {
 *   profile: {
 *     preferences: {
 *       theme: string;
 *     };
 *   };
 * }
 *
 * const themePath = access<User>().profile.preferences.theme;
 * console.log(String(themePath)); // "profile.preferences.theme"
 *
 * // For dynamic usage without types:
 * const dynamicPath = access<Dynamic>().some.dynamic.path;
 * console.log(String(dynamicPath)); // "some.dynamic.path"
 * ```
 */
export const access = <T = any>(): PathAccessor<T> => createProxy();

/**
 * Checks if an object is a path accessor created by the access() function
 *
 * @param obj - The object to check
 * @returns True if the object is a path accessor, false otherwise
 *
 * @example
 * ```typescript
 * const path = access<User>().profile.theme;
 * const regularString = "profile.theme";
 *
 * console.log(isPathAccessor(path)); // true
 * console.log(isPathAccessor(regularString)); // false
 * ```
 */
export const isPathAccessor = (obj: any): obj is PathAccessor<any> =>
  typeof obj !== "undefined" &&
  obj !== null &&
  obj[PATH_ACCESSOR_SYMBOL] === true;
