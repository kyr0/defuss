import type {
	DefussIndexDefinition,
	DefussRecord,
	DefussSelector,
	DefussTableDefinition,
	DefussValue,
	PrimaryKeyValue,
	RecordValue,
} from "./types.js";

export interface NormalizedDefussIndexDefinition<
	T extends DefussRecord = DefussRecord,
> extends DefussIndexDefinition<T> {
	selector: string;
	storageKey: string;
	source: string | ((value: T) => RecordValue | undefined);
	unique: boolean;
	implicit?: boolean;
}

export interface NormalizedDefussTableDefinition<
	T extends DefussRecord = DefussRecord,
> {
	name: string;
	indexes: Array<NormalizedDefussIndexDefinition<T>>;
	selectorToIndex: Map<string, NormalizedDefussIndexDefinition<T>>;
}

export interface SelectorClause<T extends DefussRecord = DefussRecord> {
	field: string;
	value: RecordValue;
	serializedValue?: string;
	index?: NormalizedDefussIndexDefinition<T>;
}

export interface SelectorPlan<T extends DefussRecord = DefussRecord> {
	id?: string;
	indexedClauses: Array<SelectorClause<T>>;
	unindexedClauses: Array<SelectorClause<T>>;
}

export interface DefussStoredRow {
	id: string;
	payload: string;
	indexValues: Record<string, string | undefined>;
}

const normalizedDefinitionCache = new WeakMap<
	DefussTableDefinition<any>,
	NormalizedDefussTableDefinition<any>
>();

const INDEX_PREFIX = "__defuss_idx_";

export function normalizeTableDefinition<T extends DefussRecord>(
	definition: DefussTableDefinition<T>,
): NormalizedDefussTableDefinition<T> {
	const cached = normalizedDefinitionCache.get(definition);
	if (cached) {
		return cached;
	}

	if (!definition?.name?.trim()) {
		throw new Error("A table definition requires a non-empty name.");
	}

	const selectorToIndex = new Map<string, NormalizedDefussIndexDefinition<T>>();
	const indexes: Array<NormalizedDefussIndexDefinition<T>> = [];

	const register = (index: NormalizedDefussIndexDefinition<T>) => {
		if (selectorToIndex.has(index.selector)) {
			throw new Error(
				`Duplicate index selector '${index.selector}' on table '${definition.name}'.`,
			);
		}

		selectorToIndex.set(index.selector, index);
		indexes.push(index);
	};

	register({
		name: "id",
		selector: "id",
		source: "id",
		storageKey: `${INDEX_PREFIX}id`,
		unique: true,
		implicit: true,
	});

	for (const candidate of definition.indexes ?? []) {
		const source = candidate.source ?? candidate.name;
		const selector = typeof source === "string" ? source : candidate.name;

		if (!selector?.trim()) {
			throw new Error(
				`Every index on table '${definition.name}' requires a selector name.`,
			);
		}

		if (selector === "id") {
			continue;
		}

		register({
			...candidate,
			selector,
			source,
			storageKey: `${INDEX_PREFIX}${sanitizeIdentifier(selector)}_${hashString(
				`${definition.name}:${candidate.name}:${selector}`,
			)}`,
			unique: candidate.unique === true,
		});
	}

	const normalized: NormalizedDefussTableDefinition<T> = {
		name: definition.name,
		indexes,
		selectorToIndex,
	};

	normalizedDefinitionCache.set(definition, normalized);
	return normalized;
}

export function planSelector<T extends DefussRecord>(
	definition: DefussTableDefinition<T>,
	selector: DefussSelector = {},
): SelectorPlan<T> {
	const normalized = normalizeTableDefinition(definition);
	const indexedClauses: Array<SelectorClause<T>> = [];
	const unindexedClauses: Array<SelectorClause<T>> = [];
	let id: string | undefined;

	for (const [field, rawValue] of Object.entries(selector)) {
		if (rawValue === undefined) {
			continue;
		}

		if (field === "id") {
			id = normalizePrimaryKey(rawValue as PrimaryKeyValue);
			continue;
		}

		const index = normalized.selectorToIndex.get(field);
		const clause: SelectorClause<T> = {
			field,
			value: rawValue,
			index,
		};

		if (index) {
			clause.serializedValue = serializeIndexValue(rawValue);
			indexedClauses.push(clause);
		} else {
			unindexedClauses.push(clause);
		}
	}

	return {
		id,
		indexedClauses,
		unindexedClauses,
	};
}

export function assertUpsertSelector<T extends DefussRecord>(
	definition: DefussTableDefinition<T>,
	selector: DefussSelector,
): void {
	const keys = Object.keys(selector).filter((key) => selector[key] !== undefined);

	if (keys.length === 0) {
		throw new Error("Upsert requires a non-empty selector.");
	}

	if (keys.length !== 1) {
		throw new Error(
			"Upsert selectors must resolve to exactly one unique field or id.",
		);
	}

	if (keys[0] === "id") {
		normalizePrimaryKey(selector.id as PrimaryKeyValue);
		return;
	}

	const normalized = normalizeTableDefinition(definition);
	const index = normalized.selectorToIndex.get(keys[0]);

	if (!index || !index.unique) {
		throw new Error(
			`Upsert selector '${keys[0]}' must target id or a declared unique index.`,
		);
	}
}

export function alignValueWithSelector<T extends DefussRecord>(
	value: T,
	selector: DefussSelector,
): T {
	const next = cloneRecord(value) as T;

	for (const [field, selectorValue] of Object.entries(selector)) {
		if (selectorValue === undefined) {
			continue;
		}

		if (field === "id") {
			const normalizedId = normalizePrimaryKey(selectorValue as PrimaryKeyValue);
			if (next.id === undefined) {
				next.id = normalizedId;
				continue;
			}

			if (normalizePrimaryKey(next.id) !== normalizedId) {
				throw new Error("The upsert value conflicts with the selector id.");
			}

			continue;
		}

		const currentValue = getValueAtPath(next, field);
		if (currentValue === undefined) {
			setValueAtPath(next as Record<string, DefussValue | undefined>, field, selectorValue);
			continue;
		}

		if (!recordValuesEqual(currentValue as RecordValue, selectorValue)) {
			throw new Error(
				`The upsert value conflicts with selector field '${field}'.`,
			);
		}
	}

	return next;
}

export async function buildStoredRow<T extends DefussRecord>(
	definition: DefussTableDefinition<T>,
	value: T,
): Promise<DefussStoredRow> {
	const normalized = normalizeTableDefinition(definition);
	const record = cloneRecord(value) as T;
	const id = ensurePrimaryKey(record.id);
	record.id = id;

	const payloadRecord = cloneRecord(record) as Record<string, DefussValue | undefined>;
	delete payloadRecord.id;

	const indexValues: Record<string, string | undefined> = {};
	for (const index of normalized.indexes) {
		indexValues[index.storageKey] = deriveIndexValue(index, record);
	}

	return {
		id,
		payload: JSON.stringify(await encodeDefussValue(payloadRecord)),
		indexValues,
	};
}

export function hydrateStoredRow<T extends DefussRecord>(
	row: Pick<DefussStoredRow, "id" | "payload">,
): T {
	const payload = decodeDefussValue(
		JSON.parse(row.payload) as EncodedDefussValue,
	) as Record<string, DefussValue | undefined>;

	return {
		...payload,
		id: row.id,
	} as T;
}

export function matchesSelector<T extends DefussRecord>(
	record: T,
	selector: DefussSelector = {},
	definition?: DefussTableDefinition<T>,
): boolean {
	const normalized = definition ? normalizeTableDefinition(definition) : undefined;

	for (const [field, expectedValue] of Object.entries(selector)) {
		if (expectedValue === undefined) {
			continue;
		}

		const index = normalized?.selectorToIndex.get(field);
		const currentValue = field === "id"
			? record.id
			: index
				? deriveIndexRuntimeValue(index, record)
				: getValueAtPath(record, field);
		if (!recordValuesEqual(currentValue as RecordValue | undefined, expectedValue)) {
			return false;
		}
	}

	return true;
}

export function quoteSqlIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

export function buildIndexName(tableName: string, storageKey: string): string {
	return `idx_${sanitizeIdentifier(tableName)}_${sanitizeIdentifier(storageKey)}`;
}

export function normalizePrimaryKey(value: PrimaryKeyValue): string {
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			throw new Error("The id field cannot be an empty string.");
		}
		return trimmed;
	}

	if (typeof value === "number" || typeof value === "bigint") {
		return String(value);
	}

	throw new Error("The id field must be a string, number, or bigint.");
}

export function ensurePrimaryKey(value?: PrimaryKeyValue): string {
	if (value === undefined) {
		return createPrimaryKey();
	}

	return normalizePrimaryKey(value);
}

function deriveIndexValue<T extends DefussRecord>(
	index: NormalizedDefussIndexDefinition<T>,
	value: T,
): string | undefined {
	const rawValue = deriveIndexRuntimeValue(index, value);

	if (rawValue === undefined) {
		return undefined;
	}

	return serializeIndexValue(rawValue);
}

function deriveIndexRuntimeValue<T extends DefussRecord>(
	index: NormalizedDefussIndexDefinition<T>,
	value: T,
): RecordValue | undefined {
	const source = index.source;
	return typeof source === "function"
		? source(value)
		: (getValueAtPath(value, source) as RecordValue | undefined);
}

function sanitizeIdentifier(value: string): string {
	return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function hashString(value: string): string {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return Math.abs(hash >>> 0).toString(36);
}

function createPrimaryKey(): string {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return globalThis.crypto.randomUUID();
	}

	return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneRecord<T>(value: T): T {
	return cloneDefussValue(value);
}

function cloneDefussValue<T>(value: T): T {
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
		return value.map((item) => cloneDefussValue(item)) as T;
	}

	if (isBlobValue(value)) {
		return value.slice(0, value.size, value.type) as T;
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
			result[key] = cloneDefussValue(nestedValue);
		}
		return result as T;
	}

	return value;
}

function getValueAtPath(target: unknown, path: string): unknown {
	if (!path) {
		return undefined;
	}

	let current: unknown = target;
	for (const segment of path.split(".")) {
		if (current === null || typeof current !== "object" || Array.isArray(current)) {
			return undefined;
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return current;
}

function setValueAtPath(
	target: Record<string, DefussValue | undefined>,
	path: string,
	value: DefussValue,
): void {
	const segments = path.split(".");
	let current = target;

	for (let index = 0; index < segments.length - 1; index += 1) {
		const segment = segments[index];
		const nextValue = current[segment];

		if (nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)) {
			current = nextValue as Record<string, DefussValue | undefined>;
			continue;
		}

		const created: Record<string, DefussValue | undefined> = {};
		current[segment] = created;
		current = created;
	}

	current[segments[segments.length - 1]] = value;
}

function serializeIndexValue(value: RecordValue): string {
	if (typeof value === "string") {
		return `s:${value}`;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error("Indexed number values must be finite.");
		}
		return `n:${value}`;
	}

	if (typeof value === "bigint") {
		return `i:${value.toString()}`;
	}

	if (typeof value === "boolean") {
		return value ? "b:1" : "b:0";
	}

	if (value === null) {
		return "z:null";
	}

	if (value instanceof Date) {
		return `d:${value.toISOString()}`;
	}

	throw new Error(
		"Only string, number, bigint, boolean, null, and Date values can be indexed.",
	);
}

function recordValuesEqual(
	left: RecordValue | undefined,
	right: RecordValue,
): boolean {
	if (left === right) {
		return true;
	}

	if (left instanceof Date && right instanceof Date) {
		return left.getTime() === right.getTime();
	}

	if (left instanceof ArrayBuffer && right instanceof ArrayBuffer) {
		return compareArrayBuffers(left, right);
	}

	return false;
}

function compareArrayBuffers(left: ArrayBuffer, right: ArrayBuffer): boolean {
	if (left.byteLength !== right.byteLength) {
		return false;
	}

	const leftBytes = new Uint8Array(left);
	const rightBytes = new Uint8Array(right);
	for (let index = 0; index < leftBytes.length; index += 1) {
		if (leftBytes[index] !== rightBytes[index]) {
			return false;
		}
	}

	return true;
}

type EncodedDefussTaggedValue =
	| { __defussType: "bigint"; value?: string }
	| { __defussType: "date"; value?: string }
	| { __defussType: "arraybuffer"; value?: string }
	| { __defussType: "blob"; value?: string; mimeType?: string };

type EncodedDefussValue =
	| null
	| string
	| number
	| boolean
	| EncodedDefussValue[]
	| { [key: string]: EncodedDefussValue }
	| EncodedDefussTaggedValue;

async function encodeDefussValue(value: DefussValue): Promise<EncodedDefussValue> {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (typeof value === "bigint") {
		return {
			__defussType: "bigint",
			value: value.toString(),
		};
	}

	if (value instanceof Date) {
		return {
			__defussType: "date",
			value: value.toISOString(),
		};
	}

	if (value instanceof ArrayBuffer) {
		return {
			__defussType: "arraybuffer",
			value: bytesToBase64(new Uint8Array(value)),
		};
	}

	if (isBlobValue(value)) {
		return {
			__defussType: "blob",
			value: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
			mimeType: value.type,
		};
	}

	if (Array.isArray(value)) {
		return Promise.all(value.map((item) => encodeDefussValue(item)));
	}

	const result: Record<string, EncodedDefussValue> = {};
	for (const [key, nestedValue] of Object.entries(value)) {
		if (nestedValue === undefined) {
			continue;
		}

		result[key] = await encodeDefussValue(nestedValue);
	}

	return result;
}

function decodeDefussValue(value: EncodedDefussValue): DefussValue {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => decodeDefussValue(item));
	}

	if (isEncodedDefussTaggedValue(value)) {
		switch (value.__defussType) {
			case "bigint":
				return BigInt(value.value ?? "0");
			case "date":
				return new Date(value.value ?? "");
			case "arraybuffer":
				return base64ToBytes(value.value ?? "").buffer;
			case "blob":
				return new Blob([base64ToBytes(value.value ?? "")], {
					type: value.mimeType ?? "",
				});
			default:
				return value as unknown as DefussValue;
		}
	}

	const result: Record<string, DefussValue | undefined> = {};
	for (const [key, nestedValue] of Object.entries(value)) {
		result[key] = decodeDefussValue(nestedValue);
	}
	return result;
}

function bytesToBase64(bytes: Uint8Array): string {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(bytes).toString("base64");
	}

	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function isBlobValue(value: unknown): value is Blob {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Blob).arrayBuffer === "function" &&
		typeof (value as Blob).slice === "function" &&
		typeof (value as Blob).type === "string"
	);
}

function isEncodedDefussTaggedValue(
	value: { [key: string]: EncodedDefussValue } | EncodedDefussTaggedValue,
): value is EncodedDefussTaggedValue {
	const tag = value.__defussType;
	return (
		tag === "bigint" ||
		tag === "date" ||
		tag === "arraybuffer" ||
		tag === "blob"
	);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
	if (typeof Buffer !== "undefined") {
		const nodeBuffer = Buffer.from(base64, "base64");
		const result = new Uint8Array(new ArrayBuffer(nodeBuffer.byteLength));
		result.set(nodeBuffer);
		return result;
	}

	const binary = atob(base64);
	const result = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) {
		result[index] = binary.charCodeAt(index);
	}
	return result;
}
