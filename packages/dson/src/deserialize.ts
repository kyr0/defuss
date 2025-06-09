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

const deserializer = (input: Map<number, any>, result: SerializedRecord[]) => {
  const getValue = (out: any, index: number): any => {
    input.set(index, out);
    return out;
  };

  const decoder = (index: number): any => {
    if (input.has(index)) return input.get(index);

    const [type, value] = result[index];
    switch (type) {
      case PRIMITIVE:
      case VOID:
        return getValue(value, index);
      case ARRAY: {
        const arr = getValue([], index);
        for (const index of value) arr.push(decoder(index));
        return arr;
      }
      case OBJECT: {
        const object = getValue({}, index);
        for (const [key, index] of value) object[decoder(key)] = decoder(index);
        return object;
      }
      case DATE:
        return getValue(new Date(value), index);
      case REGEXP: {
        const { source, flags } = value;
        return getValue(new RegExp(source, flags), index);
      }
      case MAP: {
        const map = getValue(new Map(), index);
        for (const [key, index] of value) map.set(decoder(key), decoder(index));
        return map;
      }
      case SET: {
        const set = getValue(new Set(), index);
        for (const index of value) set.add(decoder(index));
        return set;
      }
      case ERROR: {
        const { name, message } = value;
        try {
          return getValue(new (env as any)[name](message), index);
        } catch (e) {
          // If the error constructor doesn't exist in the global scope,
          // create a generic Error with the original name preserved
          const error = new Error(message);
          error.name = name;
          return getValue(error, index);
        }
      }
      case BIGINT:
        return getValue(BigInt(value), index);
      case "BigInt":
        return getValue(Object(BigInt(value)), index);
      case "ArrayBuffer":
        return getValue(new Uint8Array(value).buffer, value);
      case "DataView": {
        const { buffer } = new Uint8Array(value);
        return getValue(new DataView(buffer), value);
      }
    }
    return getValue(new (env as any)[type](value), index);
  };
  return decoder;
};

/**
 * Returns a deserialized value from a serialized array of Records.
 * @param serialized a previously serialized value.
 * @returns the deserialized value
 */
export const deserialize = (serialized: SerializedRecord[]): any =>
  deserializer(new Map(), serialized)(0);
