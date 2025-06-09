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

// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
const { toString } = {};
const { keys } = Object;

type TypeResult = [number, string];

const typeOf = (value: any): TypeResult => {
  const type = typeof value;
  if (type !== "object" || !value) return [PRIMITIVE, type];

  const asString = toString.call(value).slice(8, -1);
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

const shouldSkip = ([TYPE, type]: TypeResult): boolean =>
  TYPE === PRIMITIVE && (type === "function" || type === "symbol");

type SerializedRecord = [string | number, any];

const serializer = (
  strict: boolean,
  json: boolean,
  $: Map<any, number>,
  _: SerializedRecord[],
) => {
  const as = (out: SerializedRecord, value: any): number => {
    const index = _.push(out) - 1;
    $.set(value, index);
    return index;
  };

  const pair = (value: any): number => {
    if ($.has(value)) return $.get(value)!;

    let [TYPE, type] = typeOf(value);
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
            if (strict) throw new TypeError(`unable to serialize ${type}`);
            entry = null;
            break;
          case "undefined":
            return as([VOID, undefined], value);
        }
        return as([TYPE, entry], value);
      }
      case ARRAY: {
        if (type) {
          let spread = value;
          if (type === "DataView") {
            spread = new Uint8Array(value.buffer);
          } else if (type === "ArrayBuffer") {
            spread = new Uint8Array(value);
          }
          return as([type, [...spread]], value);
        }

        const arr: number[] = [];
        const index = as([TYPE, arr], value);
        for (const entry of value) arr.push(pair(entry));
        return index;
      }
      case OBJECT: {
        if (type) {
          switch (type) {
            case "BigInt":
              return as([type, value.toString()], value);
            case "Boolean":
            case "Number":
            case "String":
              return as([type, value.valueOf()], value);
          }
        }

        if (json && "toJSON" in value) return pair(value.toJSON());

        const entries: [number, number][] = [];
        const index = as([TYPE, entries], value);
        for (const key of keys(value)) {
          if (strict || !shouldSkip(typeOf(value[key])))
            entries.push([pair(key), pair(value[key])]);
        }
        return index;
      }
      case DATE:
        return as([TYPE, value.toISOString()], value);
      case REGEXP: {
        const { source, flags } = value;
        return as([TYPE, { source, flags }], value);
      }
      case MAP: {
        const entries: [number, number][] = [];
        const index = as([TYPE, entries], value);
        for (const [key, entry] of value) {
          if (strict || !(shouldSkip(typeOf(key)) || shouldSkip(typeOf(entry))))
            entries.push([pair(key), pair(entry)]);
        }
        return index;
      }
      case SET: {
        const entries: number[] = [];
        const index = as([TYPE, entries], value);
        for (const entry of value) {
          if (strict || !shouldSkip(typeOf(entry))) entries.push(pair(entry));
        }
        return index;
      }
    }

    const { message } = value;
    return as([TYPE, { name: type, message }], value);
  };

  return pair;
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
  const _: SerializedRecord[] = [];
  serializer(!(json || lossy), !!json, new Map(), _)(value);
  return _;
};
