import {
  VOID,
  PRIMITIVE,
  ARRAY,
  OBJECT,
  DATE,
  REGEXP,
  MAP,
  SET,
  ERROR,
  BIGINT,
} from "./types.d.js";

/* c8 ignore start */
const env = typeof self === "object" ? self : globalThis;
/* c8 ignore stop */

type SerializedRecord = [string | number, any];

const deserializer = ($: Map<number, any>, _: SerializedRecord[]) => {
  const as = (out: any, index: number): any => {
    $.set(index, out);
    return out;
  };

  const unpair = (index: number): any => {
    if ($.has(index)) return $.get(index);

    const [type, value] = _[index];
    switch (type) {
      case PRIMITIVE:
      case VOID:
        return as(value, index);
      case ARRAY: {
        const arr = as([], index);
        for (const index of value) arr.push(unpair(index));
        return arr;
      }
      case OBJECT: {
        const object = as({}, index);
        for (const [key, index] of value) object[unpair(key)] = unpair(index);
        return object;
      }
      case DATE:
        return as(new Date(value), index);
      case REGEXP: {
        const { source, flags } = value;
        return as(new RegExp(source, flags), index);
      }
      case MAP: {
        const map = as(new Map(), index);
        for (const [key, index] of value) map.set(unpair(key), unpair(index));
        return map;
      }
      case SET: {
        const set = as(new Set(), index);
        for (const index of value) set.add(unpair(index));
        return set;
      }
      case ERROR: {
        const { name, message } = value;
        try {
          return as(new (env as any)[name](message), index);
        } catch (e) {
          // If the error constructor doesn't exist in the global scope,
          // create a generic Error with the original name preserved
          const error = new Error(message);
          error.name = name;
          return as(error, index);
        }
      }
      case BIGINT:
        return as(BigInt(value), index);
      case "BigInt":
        return as(Object(BigInt(value)), index);
      case "ArrayBuffer":
        return as(new Uint8Array(value).buffer, value);
      case "DataView": {
        const { buffer } = new Uint8Array(value);
        return as(new DataView(buffer), value);
      }
    }
    return as(new (env as any)[type](value), index);
  };

  return unpair;
};

/**
 * Returns a deserialized value from a serialized array of Records.
 * @param serialized a previously serialized value.
 * @returns the deserialized value
 */
export const deserialize = (serialized: SerializedRecord[]): any =>
  deserializer(new Map(), serialized)(0);
