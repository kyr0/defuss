import type {
	Collection,
	Db,
	Document,
	Filter,
	MongoClientOptions,
} from "mongodb";
import { MongoClient, ObjectId } from "mongodb";
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
	resolveSelectorIndex,
	resolveUniqueSelector,
	toStoredRecord,
	type NormalizedDefussTableDefinition,
} from "./runtime.js";

export interface MongoProviderOptions {
	connectionString: string;
	databaseName: string;
}

export type DbClientMap = {
	[clientKey: string]: MongoClient | null;
};

export type DbMap = {
	[dbName: string]: Db | null;
};

type MongoStoredId = PrimaryKeyValue | ObjectId;
type MongoStoredDocument = Document & {
	_id?: MongoStoredId;
};

const _dbClientMap = {} as DbClientMap;
const _dbMap = {} as DbMap;

export const parseMongoConnectionString = (
	connectionString: string,
): { databaseName: string; clientKey: string } => {
	try {
		if (!connectionString || !connectionString.startsWith("mongodb://")) {
			throw new Error(
				"Invalid MongoDB connection string: database name is required",
			);
		}

		const uriObj = new URL(connectionString);
		const databaseName = uriObj.pathname.substring(1);

		if (!databaseName) {
			throw new Error("No database name found in connection string");
		}

		const clientKey = `${uriObj.hostname}-${databaseName}`;
		return { databaseName, clientKey };
	} catch (error) {
		console.error("Could not parse MongoDB connection string:", String(error));
		throw new Error(
			"Invalid MongoDB connection string: database name is required",
		);
	}
};

export async function connectToMongo(
	connectionString: string,
	options: MongoClientOptions = {},
): Promise<{ client: MongoClient; db: Db }> {
	const { databaseName, clientKey } = parseMongoConnectionString(connectionString);

	if (_dbClientMap[clientKey] && _dbMap[clientKey]) {
		return { client: _dbClientMap[clientKey]!, db: _dbMap[clientKey]! };
	}

	const client = new MongoClient(connectionString, {
		serverSelectionTimeoutMS: 2000,
		socketTimeoutMS: 3000,
		connectTimeoutMS: 2000,
		...options,
	});

	await client.connect();
	const db = client.db(databaseName);
	_dbClientMap[clientKey] = client;
	_dbMap[clientKey] = db;

	return { client, db };
}

export const isConnected = (connectionString: string): boolean => {
	const { clientKey } = parseMongoConnectionString(connectionString);
	return Boolean(_dbClientMap[clientKey] && _dbMap[clientKey]);
};

export const ping = async (connectionString: string) => {
	parseMongoConnectionString(connectionString);

	const client = new MongoClient(connectionString, {
		serverSelectionTimeoutMS: 2000,
		connectTimeoutMS: 2000,
	});

	try {
		await client.connect();
		return await client.db().admin().command({ ping: 1 });
	} finally {
		await client.close(true);
	}
};

export const getCollectionByName = async <T extends Document>(
	collectionName: string,
	connectionString: string,
): Promise<Collection<T>> => {
	const { db } = await connectToMongo(connectionString);
	return db.collection<T>(collectionName);
};

export function isValidObjectId(id: string): boolean {
	return /^[0-9a-fA-F]{24}$/.test(id);
}

export const toObjectId = (id: string | ObjectId): ObjectId => {
	return id instanceof ObjectId ? id : new ObjectId(id);
};

function toMongoQueryId(id: PrimaryKeyValue): Filter<MongoStoredDocument>["_id"] {
	if (typeof id === "bigint") {
		return id.toString();
	}

	if (typeof id === "string" && isValidObjectId(id)) {
		return { $in: [id, toObjectId(id)] } as unknown as Filter<MongoStoredDocument>["_id"];
	}

	return id;
}

function toMongoStoredId(id: PrimaryKeyValue | undefined): MongoStoredDocument["_id"] | undefined {
	if (id === undefined) {
		return undefined;
	}

	if (typeof id === "bigint") {
		return id.toString();
	}

	if (typeof id === "string" && isValidObjectId(id)) {
		return toObjectId(id);
	}

	return id;
}

function fromMongoStoredId(id: MongoStoredDocument["_id"]): PrimaryKeyValue {
	if (id instanceof ObjectId) {
		return id.toString();
	}

	if (typeof id === "bigint" || typeof id === "number" || typeof id === "string") {
		return id;
	}

	return String(id);
}

function bytesToBase64(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const bytes = Buffer.from(base64, "base64");
	const result = new Uint8Array(new ArrayBuffer(bytes.byteLength));
	result.set(bytes);
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

function isEncodedMongoValue(
	value: Record<string, unknown>,
): value is {
	__defussType: "arraybuffer" | "bigint" | "blob";
	value: string;
	mimeType?: string;
} {
	const tag = value.__defussType;
	return tag === "arraybuffer" || tag === "bigint" || tag === "blob";
}

async function encodeMongoValue(value: unknown): Promise<unknown> {
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
		return value;
	}

	if (value instanceof ArrayBuffer) {
		return {
			__defussType: "arraybuffer",
			value: bytesToBase64(new Uint8Array(value)),
		};
	}

	if (isBlobLike(value)) {
		return {
			__defussType: "blob",
			value: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
			mimeType: value.type,
		};
	}

	if (Array.isArray(value)) {
		return Promise.all(value.map((item) => encodeMongoValue(item)));
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
			result[key] = await encodeMongoValue(nestedValue);
		}
		return result;
	}

	return value;
}

function decodeMongoValue(value: unknown): unknown {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint"
	) {
		return value;
	}

	if (value instanceof Date) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => decodeMongoValue(item));
	}

	if (typeof value === "object" && value !== null && isEncodedMongoValue(value as Record<string, unknown>)) {
		switch ((value as { __defussType: string }).__defussType) {
			case "bigint":
				return BigInt(String((value as { value: unknown }).value ?? "0"));
			case "arraybuffer":
				return base64ToArrayBuffer(String((value as { value: unknown }).value ?? ""));
			case "blob":
				return new Blob([
					base64ToArrayBuffer(String((value as { value: unknown }).value ?? "")),
				], {
					type: String((value as { mimeType?: unknown }).mimeType ?? ""),
				});
			default:
				return value;
		}
	}

	if (typeof value === "object" && value !== null) {
		const result: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
			result[key] = decodeMongoValue(nestedValue);
		}
		return result;
	}

	return value;
}

async function toMongoDocument(
	storedRecord: Record<string, unknown>,
): Promise<MongoStoredDocument> {
	const document: MongoStoredDocument = {};

	for (const [key, value] of Object.entries(storedRecord)) {
		if (key === "id") {
			const mongoId = toMongoStoredId(value as PrimaryKeyValue | undefined);
			if (mongoId !== undefined) {
				document._id = mongoId;
			}
			continue;
		}

		document[key] = await encodeMongoValue(value);
	}

	return document;
}

function fromMongoDocument<T extends DefussRecord>(
	document: MongoStoredDocument,
): T {
	const storedRecord: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(document)) {
		if (key === "_id") {
			storedRecord.id = fromMongoStoredId(value as MongoStoredDocument["_id"]);
			continue;
		}

		storedRecord[key] = decodeMongoValue(value);
	}

	return fromStoredRecord<T>(storedRecord);
}

export class MongoProvider implements DefussProvider<MongoProviderOptions> {
	client: MongoClient | null = null;
	db: Db | null = null;
	collections: Map<string, Collection<MongoStoredDocument>> = new Map();
	definitions: Map<string, NormalizedDefussTableDefinition<any>> = new Map();
	connectionString: string;

	constructor(options: MongoProviderOptions) {
		this.connectionString = options.connectionString;
	}

	async connect(
		options: MongoProviderOptions = {} as MongoProviderOptions,
	): Promise<void> {
		if (this.isConnected()) {
			return;
		}

		const connectionString = options.connectionString || this.connectionString;
		const { client, db } = await connectToMongo(connectionString);
		this.client = client;
		this.db = db;
	}

	async disconnect(): Promise<void> {
		if (!this.client) {
			return;
		}

		const { clientKey } = parseMongoConnectionString(this.connectionString);
		delete _dbClientMap[clientKey];
		delete _dbMap[clientKey];
		await this.client.close(true);
		this.client = null;
		this.db = null;
		this.collections.clear();
	}

	isConnected(): boolean {
		return Boolean(this.client && this.db);
	}

	private async ensureCollection(
		name: string,
	): Promise<Collection<MongoStoredDocument>> {
		if (!this.db) {
			await this.connect();
		}

		const existing = this.collections.get(name);
		if (existing) {
			return existing;
		}

		const collections = await this.db!.listCollections({ name }).toArray();
		if (collections.length === 0) {
			await this.db!.createCollection(name);
		}

		const collection = this.db!.collection<MongoStoredDocument>(name);
		this.collections.set(name, collection);
		return collection;
	}

	private buildMongoQuery<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
	): Filter<MongoStoredDocument> {
		const normalized = normalizeTableDefinition(definition);
		const query: Filter<MongoStoredDocument> = {};

		for (const [key, value] of Object.entries(selector)) {
			if (value === undefined) {
				continue;
			}

			if (key === "id") {
				query._id = toMongoQueryId(value as PrimaryKeyValue);
				continue;
			}

			const index = resolveSelectorIndex(normalized, key);
			if (index) {
				query[index.storageKey] = value;
			} else {
				query[key] = value;
			}
		}

		return query;
	}

	async ensureTable<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
	): Promise<void> {
		const normalized = normalizeTableDefinition(definition);
		const existing = this.definitions.get(normalized.name);
		const collection = await this.ensureCollection(normalized.name);

		if (existing) {
			return;
		}

		this.definitions.set(normalized.name, normalized);

		for (const index of normalized.indexes) {
			if (index.selectorKey === "id") {
				continue;
			}

			await collection.createIndex(
				{ [index.storageKey]: 1 },
				{
					name: index.storageKey,
					unique: index.unique,
					sparse: true,
				},
			);
		}
	}

	async insert<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		value: T,
	): Promise<PrimaryKeyValue> {
		await this.ensureTable(definition);
		const normalized = normalizeTableDefinition(definition);
		const collection = await this.ensureCollection(normalized.name);

		const storedRecord = toStoredRecord(normalized, value);
		const document = await toMongoDocument(storedRecord);
		const result = await collection.insertOne(document);
		return fromMongoStoredId(result.insertedId);
	}

	async find<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector = {},
	): Promise<T[]> {
		await this.ensureTable(definition);
		const normalized = normalizeTableDefinition(definition);
		const collection = await this.ensureCollection(normalized.name);

		const documents = await collection
			.find(this.buildMongoQuery(definition, selector))
			.toArray();

		return documents.map((document) => fromMongoDocument<T>(document));
	}

	async findOne<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector = {},
	): Promise<T | null> {
		await this.ensureTable(definition);
		const normalized = normalizeTableDefinition(definition);
		const collection = await this.ensureCollection(normalized.name);
		const document = await collection.findOne(this.buildMongoQuery(definition, selector));
		return document ? fromMongoDocument<T>(document) : null;
	}

	async update<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
		update: Partial<T>,
	): Promise<void> {
		if (Object.keys(selector).length === 0) {
			throw new Error("defuss-db: update requires a non-empty selector.");
		}

		await this.ensureTable(definition);
		const normalized = normalizeTableDefinition(definition);
		const collection = await this.ensureCollection(normalized.name);
		const documents = await collection
			.find(this.buildMongoQuery(definition, selector))
			.toArray();

		for (const document of documents) {
			const existingRecord = fromMongoDocument<T>(document);

			if (update.id !== undefined && update.id !== existingRecord.id) {
				throw new Error("defuss-db: id cannot be updated.");
			}

			const nextRecord = {
				...existingRecord,
				...update,
				id: existingRecord.id,
			} as T;

			const storedRecord = toStoredRecord(normalized, nextRecord);
			await collection.replaceOne({ _id: document._id }, await toMongoDocument(storedRecord));
		}
	}

	async delete<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
	): Promise<void> {
		if (Object.keys(selector).length === 0) {
			throw new Error("defuss-db: delete requires a non-empty selector.");
		}

		await this.ensureTable(definition);
		const normalized = normalizeTableDefinition(definition);
		const collection = await this.ensureCollection(normalized.name);
		await collection.deleteMany(this.buildMongoQuery(definition, selector));
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
		const existingRecord = await this.findOne(definition, selector);

		if (existingRecord?.id !== undefined) {
			await this.update(definition, { id: existingRecord.id }, mergedValue);
			return existingRecord.id;
		}

		try {
			return await this.insert(definition, mergedValue);
		} catch (error) {
			const duplicateKey =
				error && typeof error === "object" && "code" in error
					? Number((error as { code: unknown }).code) === 11000
					: false;

			if (!duplicateKey) {
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

export async function closeAllConnections(): Promise<void> {
	for (const clientKey in _dbClientMap) {
		const client = _dbClientMap[clientKey];
		if (client) {
			await client.close(true);
		}
	}

	clearMongoConnections();
}

export function clearMongoConnections(): void {
	for (const key in _dbClientMap) {
		delete _dbClientMap[key];
	}

	for (const key in _dbMap) {
		delete _dbMap[key];
	}
}
