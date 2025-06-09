import { isEqual } from "./equals.js";
import { parse, stringify } from "./json.js";
import { deserialize } from "./deserialize.js";
import { serialize } from "./serialize.js";

/**
 * Returns an array of serialized Records.
 * @param {any} any a serializable value.
 * @param {{transfer?: any[], json?: boolean, lossy?: boolean}?} options an object with
 * a transfer option (ignored when polyfilled) and/or non standard fields that
 * fallback to the polyfill if present.
 * @returns {Record[]}
 */
const _clone =
  typeof structuredClone === "function"
    ? /* c8 ignore start */
      (
        any: any,
        options: { transfer?: any[]; json?: boolean; lossy?: boolean },
      ) =>
        options && ("json" in options || "lossy" in options)
          ? deserialize(serialize(any, options))
          : structuredClone(any)
    : (
        any: any,
        options: { transfer?: any[]; json?: boolean; lossy?: boolean },
      ) => deserialize(serialize(any, options));
/* c8 ignore stop */

export const DSON = {
  parse,
  stringify,
  isEqual,
  clone: (any: any) =>
    _clone(any, {
      json: false,
      lossy: false,
    }),
};
