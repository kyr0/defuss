import type {
  DefussIndexDefinition,
  DefussRecord,
  DefussSelector,
  DefussTableDefinition,
  PrimaryKeyValue,
  RecordValue,
} from "../types.js";

export const INTERNAL_INDEX_PREFIX = "__defuss_idx_";

export interface NormalizedDefussIndexDefinition<
  T extends DefussRecord = DefussRecord,
> {
  name: string;
  selectorKey: string;
  storageKey: string;
  unique: boolean;
  source?: string | ((value: T) => RecordValue | undefined);
  resolveValue: (value: T) => RecordValue | undefined;
}

export interface NormalizedDefussTableDefinition<
  T extends DefussRecord = DefussRecord,
> {
  name: string;
  indexes: Array<NormalizedDefussIndexDefinition<T>>;
  selectorIndexMap: Map<string, NormalizedDefussIndexDefinition<T>>;
}

const normalizedTableCache = new WeakMap<
  DefussTableDefinition<any>,
  NormalizedDefussTableDefinition<any>
>();

function sanitizeIndexName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]+/g, "_");
}

export function getValueAtPath(value: unknown, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = value;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function setValueAtPath(
  value: Record<string, unknown>,
  path: string,
  nextValue: RecordValue,
): void {
  const segments = path.split(".").filter(Boolean);

  if (segments.length === 0) {
    return;
  }

  let current: Record<string, unknown> = value;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const existing = current[segment];

    if (existing === null || existing === undefined || typeof existing !== "object") {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = nextValue;
}

export function isEqualRecordValue(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (left instanceof ArrayBuffer && right instanceof ArrayBuffer) {
    if (left.byteLength !== right.byteLength) {
      return false;
    }

    const leftView = new Uint8Array(left);
    const rightView = new Uint8Array(right);
    for (let index = 0; index < leftView.length; index += 1) {
      if (leftView[index] !== rightView[index]) {
        return false;
      }
    }
    return true;
  }

  return left === right;
}

function normalizeIndexDefinition<T extends DefussRecord>(
  index: DefussIndexDefinition<T>,
): NormalizedDefussIndexDefinition<T> {
  const selectorKey = typeof index.source === "string" ? index.source : index.name;

  return {
    name: index.name,
    selectorKey,
    storageKey: `${INTERNAL_INDEX_PREFIX}${sanitizeIndexName(index.name)}`,
    unique: index.unique === true,
    source: index.source,
    resolveValue: (value: T): RecordValue | undefined => {
      if (typeof index.source === "function") {
        return index.source(value);
      }

      if (typeof index.source === "string") {
        return getValueAtPath(value, index.source) as RecordValue | undefined;
      }

      return getValueAtPath(value, index.name) as RecordValue | undefined;
    },
  };
}

export function normalizeTableDefinition<T extends DefussRecord>(
  definition: DefussTableDefinition<T>,
): NormalizedDefussTableDefinition<T> {
  const existing = normalizedTableCache.get(definition);
  if (existing) {
    return existing;
  }

  const indexes: Array<NormalizedDefussIndexDefinition<T>> = [
    {
      name: "id",
      selectorKey: "id",
      storageKey: "id",
      unique: true,
      resolveValue: (value: T) => value.id,
    },
  ];

  for (const index of definition.indexes ?? []) {
    if (index.name === "id") {
      continue;
    }

    indexes.push(normalizeIndexDefinition(index));
  }

  const selectorIndexMap = new Map<string, NormalizedDefussIndexDefinition<T>>();
  for (const index of indexes) {
    selectorIndexMap.set(index.selectorKey, index);
  }

  const normalized: NormalizedDefussTableDefinition<T> = {
    name: definition.name,
    indexes,
    selectorIndexMap,
  };

  normalizedTableCache.set(definition, normalized);
  return normalized;
}

export function assertValidId(id: PrimaryKeyValue | undefined): void {
  if (id === undefined) {
    return;
  }

  if (typeof id === "string" && id.trim().length === 0) {
    throw new Error("defuss-db: id cannot be empty.");
  }

  if (typeof id === "number" && !Number.isFinite(id)) {
    throw new Error("defuss-db: id must be a finite number.");
  }
}

export function toStoredRecord<T extends DefussRecord>(
  definition: NormalizedDefussTableDefinition<T>,
  value: T,
): Record<string, unknown> {
  assertValidId(value.id);

  const storedRecord: Record<string, unknown> = { ...value };

  for (const index of definition.indexes) {
    if (index.selectorKey === "id") {
      continue;
    }

    const indexValue = index.resolveValue(value);
    if (indexValue === undefined) {
      delete storedRecord[index.storageKey];
      continue;
    }

    storedRecord[index.storageKey] = indexValue;
  }

  return storedRecord;
}

export function fromStoredRecord<T extends DefussRecord>(
  storedRecord: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(storedRecord)) {
    if (key.startsWith(INTERNAL_INDEX_PREFIX)) {
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

export function matchesSelector<T extends DefussRecord>(
  value: T,
  selector: DefussSelector,
): boolean {
  for (const [key, expected] of Object.entries(selector)) {
    if (expected === undefined) {
      continue;
    }

    const actual = key === "id" ? value.id : getValueAtPath(value, key);
    if (!isEqualRecordValue(actual, expected)) {
      return false;
    }
  }

  return true;
}

export function mergeSelectorIntoValue<T extends DefussRecord>(
  definition: NormalizedDefussTableDefinition<T>,
  selector: DefussSelector,
  value: T,
): T {
  const merged = cloneRuntimeValue(value) as Record<string, unknown> as T;

  for (const [key, selectorValue] of Object.entries(selector)) {
    if (selectorValue === undefined) {
      continue;
    }

    if (key === "id") {
      if (merged.id !== undefined && !isEqualRecordValue(merged.id, selectorValue)) {
        throw new Error("defuss-db: upsert selector id does not match value.id.");
      }

      merged.id = selectorValue as PrimaryKeyValue;
      continue;
    }

    const index = definition.selectorIndexMap.get(key);
    if (!index) {
      setValueAtPath(merged as Record<string, unknown>, key, selectorValue);
      continue;
    }

    if (typeof index.source === "string") {
      const existing = getValueAtPath(merged, index.source);
      if (existing !== undefined && !isEqualRecordValue(existing, selectorValue)) {
        throw new Error(
          `defuss-db: upsert selector '${key}' does not match the provided value.`,
        );
      }

      setValueAtPath(merged as Record<string, unknown>, index.source, selectorValue);
    }
  }

  return merged;
}

function cloneRuntimeValue<T>(value: T): T {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value instanceof ArrayBuffer) {
    return value.slice(0) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneRuntimeValue(item)) as T;
  }

  if (isBlobLike(value)) {
    return value.slice(0, value.size, value.type) as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      result[key] = cloneRuntimeValue(nestedValue);
    }
    return result as T;
  }

  return value;
}

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).slice === "function" &&
    typeof (value as Blob).type === "string"
  );
}

export function resolveSelectorIndex<T extends DefussRecord>(
  definition: NormalizedDefussTableDefinition<T>,
  key: string,
): NormalizedDefussIndexDefinition<T> | undefined {
  return definition.selectorIndexMap.get(key);
}

export function resolveIndexedSelectorValue<T extends DefussRecord>(
  definition: NormalizedDefussTableDefinition<T>,
  key: string,
  value: RecordValue,
): { storageKey: string; value: RecordValue } | null {
  const index = resolveSelectorIndex(definition, key);
  if (!index) {
    return null;
  }

  return {
    storageKey: index.storageKey,
    value,
  };
}

export function resolveUniqueSelector<T extends DefussRecord>(
  definition: NormalizedDefussTableDefinition<T>,
  selector: DefussSelector,
): NormalizedDefussIndexDefinition<T> {
  const keys = Object.keys(selector).filter((key) => selector[key] !== undefined);

  if (keys.length === 0) {
    throw new Error("defuss-db: upsert requires a non-empty selector.");
  }

  if (keys.length !== 1) {
    throw new Error(
      "defuss-db: upsert selectors must target exactly one unique field.",
    );
  }

  const index = resolveSelectorIndex(definition, keys[0]);
  if (!index || !index.unique) {
    throw new Error(
      `defuss-db: upsert selector '${keys[0]}' must resolve to 'id' or a declared unique index.`,
    );
  }

  return index;
}

export function stripInternalFields<T extends DefussRecord>(
  values: Array<Record<string, unknown>>,
): T[] {
  return values.map((value) => fromStoredRecord<T>(value));
}