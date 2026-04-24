import type { Dexie, Table, DexieOptions, IndexableType } from "dexie";
import type {
	DefussProvider,
	DefussRecord,
	DefussSelector,
	DefussTableDefinition,
	PrimaryKeyValue,
} from "../types.js";
import {
	fromStoredRecord,
	mergeSelectorIntoValue,
	normalizeTableDefinition,
	resolveIndexedSelectorValue,
	resolveUniqueSelector,
	matchesSelector,
	toStoredRecord,
	type NormalizedDefussTableDefinition,
} from "./runtime.js";

export type DexieProviderOptions = DexieOptions;

export class DexieProvider implements DefussProvider<DexieOptions> {
	db!: Dexie;
	tables: Map<string, Table<any, IndexableType>> = new Map();
	definitions: Map<string, NormalizedDefussTableDefinition<any>> = new Map();
	databaseName: string;
	schemaVersion = 1;
	isOpen = false;

	constructor(databaseName: string) {
		this.databaseName = databaseName || "DefussDB";
	}

	async connect(options: DexieOptions = {}): Promise<void> {
		if (this.db && this.isConnected()) {
			return;
		}

		const isNode =
			typeof process !== "undefined" &&
			typeof process.versions === "object" &&
			typeof process.versions.node !== "undefined";

		if (isNode) {
			await import("fake-indexeddb/auto");
		}

		const DexieImpl: typeof Dexie = (await import("dexie"))
			.default as unknown as typeof Dexie;

		this.db = new DexieImpl(this.databaseName, options);
		this.isOpen = true;
	}

	async disconnect(): Promise<void> {
		if (this.db) {
			this.db.close();
			this.isOpen = false;
			this.tables.clear();
		}
	}

	isConnected(): boolean {
		return this.isOpen;
	}

	private buildSchemaString(
		definition: NormalizedDefussTableDefinition<any>,
	): string {
		const parts = ["id"];

		for (const index of definition.indexes) {
			if (index.selectorKey === "id") {
				continue;
			}

			parts.push(index.unique ? `&${index.storageKey}` : index.storageKey);
		}

		return parts.join(", ");
	}

	private async applySchema(): Promise<void> {
		if (this.isOpen) {
			this.db.close();
		}

		const schema: Record<string, string> = {};
		for (const definition of this.definitions.values()) {
			schema[definition.name] = this.buildSchemaString(definition);
		}

		this.schemaVersion += 1;
		this.db.version(this.schemaVersion).stores(schema);
		await this.db.open();
		this.isOpen = true;

		this.tables.clear();
		for (const definition of this.definitions.values()) {
			this.tables.set(definition.name, this.db.table(definition.name));
		}
	}

	async ensureTable<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
	): Promise<void> {
		const normalized = normalizeTableDefinition(definition);
		const existing = this.definitions.get(normalized.name);
		if (existing) {
			return;
		}

		this.definitions.set(normalized.name, normalized);
		await this.applySchema();
	}

	private getTable<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
	): {
		normalized: NormalizedDefussTableDefinition<T>;
		tableDexie: Table<any, IndexableType>;
	} {
		const normalized = normalizeTableDefinition(definition);
		const tableDexie = this.tables.get(normalized.name);

		if (!tableDexie) {
			throw new Error(`defuss-db: table '${normalized.name}' is not initialized.`);
		}

		return { normalized, tableDexie };
	}

	private async queryRecords<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
	): Promise<T[]> {
		const { normalized, tableDexie } = this.getTable(definition);
		const selectorEntries = Object.entries(selector).filter(
			(entry): entry is [string, Exclude<typeof entry[1], undefined>] =>
				entry[1] !== undefined,
		);

		if (selectorEntries.length === 0) {
			const results = await tableDexie.toArray();
			return results.map((result) => fromDexieRecord<T>(result as Record<string, unknown>));
		}

		const indexedEntry = selectorEntries.find(([key, value]) => {
			return resolveIndexedSelectorValue(normalized, key, value) !== null;
		});

		let results: any[];

		if (indexedEntry) {
			const indexedSelector = resolveIndexedSelectorValue(
				normalized,
				indexedEntry[0],
				normalizeDexieIndexableValue(indexedEntry[1]),
			)!;

			if (indexedSelector.storageKey === "id") {
				const result = await tableDexie.get(indexedSelector.value as IndexableType);
				results = result ? [result] : [];
			} else {
				results = await tableDexie
					.where(indexedSelector.storageKey)
					.equals(indexedSelector.value as IndexableType)
					.toArray();
			}
		} else {
			results = await tableDexie.toArray();
		}

		return results
			.map((result) => fromDexieRecord<T>(result as Record<string, unknown>))
			.filter((result) => matchesSelector(result, selector, normalized));
	}

	async insert<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		value: T,
	): Promise<PrimaryKeyValue> {
		await this.ensureTable(definition);
		const { normalized, tableDexie } = this.getTable(definition);
		const storedRecord = await toDexieStoredRecord(normalized, prepareDexiePrimaryKey(value));
		const insertedId = await tableDexie.add(storedRecord);

		if (typeof insertedId === "bigint" || typeof insertedId === "number") {
			return insertedId;
		}

		if (typeof insertedId === "string") {
			return insertedId;
		}

		return String(insertedId);
	}

	async find<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector = {},
	): Promise<T[]> {
		await this.ensureTable(definition);
		return this.queryRecords(definition, selector);
	}

	async findOne<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector = {},
	): Promise<T | null> {
		const results = await this.find(definition, selector);
		return results[0] ?? null;
	}

	async update<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
		update: Partial<T>,
	): Promise<void> {
		await this.ensureTable(definition);
		const { normalized, tableDexie } = this.getTable(definition);

		if (Object.keys(selector).length === 0) {
			throw new Error("defuss-db: update requires a non-empty selector.");
		}

		const records = await this.queryRecords(definition, selector);

		for (const record of records) {
			if (update.id !== undefined && update.id !== record.id) {
				throw new Error("defuss-db: id cannot be updated.");
			}

			const nextRecord = {
				...record,
				...update,
				id: record.id,
			} as T;

			const storedRecord = await toDexieStoredRecord(normalized, nextRecord);
			await tableDexie.put(storedRecord);
		}
	}

	async delete<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
	): Promise<void> {
		await this.ensureTable(definition);
		const { tableDexie } = this.getTable(definition);

		if (Object.keys(selector).length === 0) {
			throw new Error("defuss-db: delete requires a non-empty selector.");
		}

		const records = await this.queryRecords(definition, selector);
		const ids = records
			.map((record) => record.id)
			.filter((id): id is PrimaryKeyValue => id !== undefined);

		await tableDexie.bulkDelete(ids as IndexableType[]);
	}

	async upsert<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
		value: T,
	): Promise<PrimaryKeyValue> {
		await this.ensureTable(definition);
		const normalized = normalizeTableDefinition(definition);
		resolveUniqueSelector(normalized, selector);

		const mergedValue = mergeSelectorIntoValue(normalized, selector, value);
		const existing = await this.findOne(definition, selector);

		if (existing?.id !== undefined) {
			await this.update(definition, { id: existing.id }, mergedValue);
			return existing.id;
		}

		try {
			return await this.insert(definition, mergedValue);
		} catch (error) {
			const constraintName =
				error && typeof error === "object" && "name" in error
					? String((error as { name: unknown }).name)
					: "";

			if (constraintName !== "ConstraintError") {
				throw error;
			}

			const retried = await this.findOne(definition, selector);
			if (!retried?.id) {
				throw error;
			}

			await this.update(definition, { id: retried.id }, mergedValue);
			return retried.id;
		}
	}
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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	if (typeof Buffer !== "undefined") {
		const bytes = Buffer.from(base64, "base64");
		const result = new Uint8Array(new ArrayBuffer(bytes.byteLength));
		result.set(bytes);
		return result.buffer;
	}

	const binary = atob(base64);
	const result = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) {
		result[index] = binary.charCodeAt(index);
	}
	return result.buffer;
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

function isEncodedDexieValue(
	value: Record<string, unknown>,
): value is {
	__defussType: "blob";
	value: string;
	mimeType?: string;
} {
	return value.__defussType === "blob";
}

async function encodeDexieValue(value: unknown): Promise<unknown> {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint"
	) {
		return value;
	}

	if (value instanceof Date || value instanceof ArrayBuffer) {
		return value;
	}

	if (isBlobLike(value)) {
		return {
			__defussType: "blob",
			value: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
			mimeType: value.type,
		};
	}

	if (Array.isArray(value)) {
		return Promise.all(value.map((item) => encodeDexieValue(item)));
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
			result[key] = await encodeDexieValue(nestedValue);
		}
		return result;
	}

	return value;
}

function decodeDexieValue(value: unknown): unknown {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint" ||
		value instanceof Date ||
		value instanceof ArrayBuffer
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => decodeDexieValue(item));
	}

	if (typeof value === "object" && value !== null && isEncodedDexieValue(value as Record<string, unknown>)) {
		return new Blob([
			base64ToArrayBuffer(String((value as { value: unknown }).value ?? "")),
		], {
			type: String((value as { mimeType?: unknown }).mimeType ?? ""),
		});
	}

	if (typeof value === "object" && value !== null) {
		const result: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
			result[key] = decodeDexieValue(nestedValue);
		}
		return result;
	}

	return value;
}

async function toDexieStoredRecord<T extends DefussRecord>(
	definition: NormalizedDefussTableDefinition<T>,
	value: T,
): Promise<Record<string, unknown>> {
	return encodeDexieValue(toStoredRecord(definition, value)) as Promise<Record<string, unknown>>;
}

function fromDexieRecord<T extends DefussRecord>(storedRecord: Record<string, unknown>): T {
	return fromStoredRecord<T>(decodeDexieValue(storedRecord) as Record<string, unknown>);
}

function prepareDexiePrimaryKey<T extends DefussRecord>(value: T): T {
	const nextValue = { ...value } as T;

	if (nextValue.id === undefined) {
		nextValue.id = createDexiePrimaryKey();
		return nextValue;
	}

	if (typeof nextValue.id === "bigint") {
		nextValue.id = String(nextValue.id);
	}

	return nextValue;
}

function normalizeDexieIndexableValue(value: PrimaryKeyValue): PrimaryKeyValue {
	if (typeof value === "bigint") {
		return String(value);
	}

	return value;
}

function createDexiePrimaryKey(): string {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return globalThis.crypto.randomUUID();
	}

	return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
