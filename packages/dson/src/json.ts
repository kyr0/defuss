import { deserialize } from "./deserialize.js";
import { serialize } from "./serialize.js";

const options = { json: true, lossy: true };

/**
 * Revive a previously stringified structured clone.
 * @param str previously stringified data as string.
 * @returns whatever was previously stringified as clone.
 */
export const parse = (str: string): any => deserialize(JSON.parse(str));

/**
 * Represent a structured clone value as string.
 * @param any some clone-able value to stringify.
 * @returns the value stringified.
 */
export const stringify = (any: any): string =>
  JSON.stringify(serialize(any, options));
