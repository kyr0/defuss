import { parse } from "./parse.js";
import { stringify } from "./stringify.js";
import { builtInTypes } from "./types.js";

/**
 * Creates a deep clone of an object asynchronously, preserving custom classes, symbols, and circular references
 *
 * @param original The object to clone
 * @param windowObj Optional Window object
 * @returns A promise that resolves to the cloned object
 */
export async function clone<T>(
  original: T,
  windowObj?: Window | null,
): Promise<T> {
  // Fast path for primitives, null, or undefined
  if (
    original === null ||
    original === undefined ||
    typeof original !== "object"
  ) {
    return original;
  }

  // Prepare class constructors map
  const classConstructors: Record<string, any> = {};

  const classes = new Set<string>();
  const seen = new Set();

  // Recursively scan for all custom class instances in the object graph
  const scanForClasses = (obj: any) => {
    // Skip null, primitives, and already-seen objects
    if (obj === null || typeof obj !== "object" || seen.has(obj)) {
      return;
    }
    seen.add(obj);

    const constructorName = obj.constructor?.name;

    // If this is a custom class, add its constructor
    if (
      constructorName &&
      !builtInTypes.includes(constructorName) &&
      typeof obj.constructor === "function"
    ) {
      classes.add(constructorName);
      // Save the constructor function for later use
      classConstructors[constructorName] = obj.constructor;
    }

    // Recursively scan object properties
    if (Array.isArray(obj)) {
      for (const item of obj) {
        scanForClasses(item);
      }
    } else if (obj instanceof Map) {
      obj.forEach((value, key) => {
        scanForClasses(key);
        scanForClasses(value);
      });
    } else if (obj instanceof Set) {
      obj.forEach((value) => {
        scanForClasses(value);
      });
    } else {
      // Regular object property scanning
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          scanForClasses(obj[key]);
        }
      }
      // Also check symbol properties
      const symbolProps = Object.getOwnPropertySymbols(obj);
      for (const sym of symbolProps) {
        scanForClasses(obj[sym]);
      }
    }
  };

  // Scan the original object for custom classes
  scanForClasses(original);

  // Use windowObj passed in options, or try to get from global
  windowObj =
    windowObj ||
    (typeof globalThis !== "undefined" ? globalThis.window : undefined);

  try {
    // Stringify and then parse with the discovered class constructors
    const serialized = await stringify(original, null, 0, windowObj);
    return (await parse(serialized, classConstructors, windowObj)) as T;
  } catch (e) {
    console.error("DSON clone failed:", e);
    // If serialization fails, return the original as a fallback
    return original;
  }
}
