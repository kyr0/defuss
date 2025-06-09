import { isEqual } from "./equals.js";
import { parse, stringify } from "./json.js";
import { deserialize } from "./deserialize.js";
import { serialize } from "./serialize.js";

/**
 * Creates a deep clone of a value, using native structuredClone when available
 * and falling back to DSON serialize/deserialize for compatibility.
 * @param value The value to clone
 * @param options Clone options including transfer array and serialization flags
 * @returns A deep clone of the input value
 */
const createClone = (
  value: any,
  options: { transfer?: any[]; json?: boolean; lossy?: boolean },
): any => {
  // Use serialize/deserialize if special options are requested
  if (options.json || options.lossy) {
    /* c8 ignore next */
    return deserialize(serialize(value, options));
  }

  // Use native structuredClone if available, otherwise fallback to serialize/deserialize
  return typeof structuredClone === "function"
    ? /* c8 ignore next */ structuredClone(value)
    : deserialize(serialize(value, options));
};

/**
 * Default clone function that creates a lossless, non-JSON clone
 * @param value The value to clone
 * @returns A deep clone of the input value
 */
const clone = (value: any): any =>
  createClone(value, { json: false, lossy: false });

export const DSON = {
  parse,
  stringify,
  isEqual,
  clone,
};
