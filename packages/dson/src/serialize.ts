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

const EMPTY = "";

const { toString: objectToString } = {};
const { keys: objectKeys } = Object;

type TypeResult = [number, string];

const getType = (value: any): TypeResult => {
  const type = typeof value;
  if (type !== "object" || !value) return [PRIMITIVE, type];

  const asString = objectToString.call(value).slice(8, -1);
  switch (asString) {
    case "Array":
      return [ARRAY, EMPTY];
    case "Object":
      return [OBJECT, EMPTY];
    case "Date":
      return [DATE, EMPTY];
    case "RegExp":
      return [REGEXP, EMPTY];
    case "Map":
      return [MAP, EMPTY];
    case "Set":
      return [SET, EMPTY];
    case "DataView":
      return [ARRAY, asString];
  }

  if (asString.includes("Array")) return [ARRAY, asString];

  if (asString.includes("Error")) return [ERROR, asString];

  return [OBJECT, asString];
};

const isIgnoredType = ([TYPE, type]: TypeResult): boolean =>
  TYPE === PRIMITIVE && (type === "function" || type === "symbol");

type SerializedRecord = [string | number, any];

const serializer = (
  strict: boolean,
  json: boolean,
  input: Map<any, number>,
  result: SerializedRecord[],
) => {
  const getIndex = (out: SerializedRecord, value: any): number => {
    const index = result.push(out) - 1;
    input.set(value, index);
    return index;
  };

  const encoder = (value: any): number => {
    if (input.has(value)) return input.get(value)!;

    let [TYPE, type] = getType(value);
    switch (TYPE) {
      case PRIMITIVE: {
        let entry = value;
        switch (type) {
          case "bigint":
            TYPE = BIGINT;
            entry = value.toString();
            break;
          case "function":
          case "symbol":
            /* c8 ignore start */
            if (strict) throw new TypeError(`unable to serialize ${type}`);
            entry = null;
            break;
          /* c8 ignore stop */
          case "undefined":
            return getIndex([VOID, undefined], value);
        }
        return getIndex([TYPE, entry], value);
      }
      case ARRAY: {
        if (type) {
          let spread = value;
          if (type === "DataView") {
            spread = new Uint8Array(value.buffer);
          } else if (type === "ArrayBuffer") {
            spread = new Uint8Array(value);
          }
          return getIndex([type, [...spread]], value);
        }

        const arr: number[] = [];
        const index = getIndex([TYPE, arr], value);
        for (const entry of value) arr.push(encoder(entry));
        return index;
      }
      case OBJECT: {
        if (type) {
          switch (type) {
            case "BigInt":
              return getIndex([type, value.toString()], value);
            case "Boolean":
            case "Number":
            case "String":
              return getIndex([type, value.valueOf()], value);
          }
        }

        if (json && "toJSON" in value) return encoder(value.toJSON());

        const entries: [number, number][] = [];
        const index = getIndex([TYPE, entries], value);
        for (const key of objectKeys(value)) {
          if (strict || !isIgnoredType(getType(value[key])))
            entries.push([encoder(key), encoder(value[key])]);
        }
        return index;
      }
      case DATE:
        return getIndex([TYPE, value.toISOString()], value);
      case REGEXP: {
        const { source, flags } = value;
        return getIndex([TYPE, { source, flags }], value);
      }
      case MAP: {
        const entries: [number, number][] = [];
        const index = getIndex([TYPE, entries], value);
        for (const [key, entry] of value) {
          if (
            strict ||
            !(isIgnoredType(getType(key)) || isIgnoredType(getType(entry)))
          )
            entries.push([encoder(key), encoder(entry)]);
        }
        return index;
      }
      case SET: {
        const entries: number[] = [];
        const index = getIndex([TYPE, entries], value);
        for (const entry of value) {
          if (strict || !isIgnoredType(getType(entry)))
            entries.push(encoder(entry));
        }
        return index;
      }
      case ERROR: {
        const { name, message } = value;
        return getIndex([TYPE, { name, message }], value);
      }
    }
    /* c8 ignore next */
    const { message } = value;
    /* c8 ignore next */
    return getIndex([TYPE, { name: type, message }], value);
  };
  return encoder;
};

interface SerializeOptions {
  json?: boolean;
  lossy?: boolean;
}

/**
 * Returns an array of serialized Records.
 * @param value a serializable value.
 * @param options an object with a `lossy` or `json` property that,
 *  if `true`, will not throw errors on incompatible types, and behave more
 *  like JSON stringify would behave. Symbol and Function will be discarded.
 * @returns the serialized records array
 */
export const serialize = (
  value: any,
  options: SerializeOptions = {},
): SerializedRecord[] => {
  const { json, lossy } = options;
  const result: SerializedRecord[] = [];
  serializer(!(json || lossy), !!json, new Map(), result)(value);
  return result;
};
