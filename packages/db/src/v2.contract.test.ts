import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "fake-indexeddb/auto";
import { DefussTable } from "./table.js";
import { defineTable, type DefussProvider, type DefussRecord, type PrimaryKeyValue } from "./types.js";
import { getEnv } from "./env.js";
import { DexieProvider } from "./provider/dexie.js";
import { LibsqlProvider } from "./provider/libsql.js";
import { JsonlProvider } from "./provider/jsonl.js";
import { MongoProvider, clearMongoConnections } from "./provider/mongodb.js";

interface ContractUser extends DefussRecord {
	name: string;
	email: string;
	age: number;
	profile: {
		city: string;
	};
	createdAt: Date;
	visits: bigint;
	avatar: ArrayBuffer;
	attachment: Blob;
}

const userTable = defineTable<ContractUser>({
	name: "users_v2_contract",
	indexes: [
		{
			name: "email",
			source: "email",
			unique: true,
		},
		{
			name: "city",
			source: "profile.city",
		},
		{
			name: "emailDomain",
			source: (value) => value.email.split("@")[1] ?? undefined,
		},
	],
});

type ProviderInstance = {
	provider: DefussProvider<any>;
	cleanup?: () => Promise<void>;
};

type ProviderFactory = {
	name: string;
	create: () => Promise<ProviderInstance>;
};

function createAvatar(seed: number): ArrayBuffer {
	const bytes = new Uint8Array(new ArrayBuffer(8));
	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = (seed + index) % 255;
	}
	return bytes.buffer.slice(0);
}

function createUser(input: {
	name: string;
	email: string;
	age: number;
	city: string;
	seed: number;
	id?: PrimaryKeyValue;
}): ContractUser {
	return {
		id: input.id,
		name: input.name,
		email: input.email,
		age: input.age,
		profile: {
			city: input.city,
		},
		createdAt: new Date(`2026-01-${String((input.seed % 9) + 1).padStart(2, "0")}T12:34:56.000Z`),
		visits: BigInt(1000 + input.seed),
		avatar: createAvatar(input.seed),
		attachment: new Blob([`${input.name}:${input.email}`], {
			type: "text/plain",
		}),
	};
}

function expectArrayBufferEqual(actual: ArrayBuffer, expected: ArrayBuffer): void {
	expect([...new Uint8Array(actual)]).toEqual([...new Uint8Array(expected)]);
}

async function expectBlobLikeEqual(actual: unknown, expected: Blob): Promise<void> {
	expect(actual).toBeTruthy();
	expect(typeof (actual as Blob).text).toBe("function");
	expect(typeof (actual as Blob).arrayBuffer).toBe("function");
	expect((actual as Blob).type).toBe(expected.type);
	expect(await (actual as Blob).text()).toBe(await expected.text());
}

function nextId(id: PrimaryKeyValue): PrimaryKeyValue {
	if (typeof id === "number") {
		return id + 1;
	}

	if (typeof id === "bigint") {
		return id + 1n;
	}

	return `${id}-changed`;
}

const mongoOptions = {
	connectionString: getEnv("MONGO_CONNECTION_STRING"),
	databaseName: "test_db",
};

const factories: ProviderFactory[] = [
	{
		name: "dexie",
		create: async () => {
			const databaseName = "DefussDbV2Contract";
			const provider = new DexieProvider(databaseName);
			await provider.connect();

			return {
				provider,
				cleanup: async () => {
					await new Promise<void>((resolve) => {
						const request = indexedDB.deleteDatabase(databaseName);
						request.onsuccess = () => resolve();
						request.onerror = () => resolve();
						request.onblocked = () => resolve();
					});
				},
			};
		},
	},
	{
		name: "libsql",
		create: async () => {
			const provider = new LibsqlProvider();
			await provider.connect({ url: ":memory:" });
			return { provider };
		},
	},
	{
		name: "jsonl",
		create: async () => {
			const baseDir = await mkdtemp(path.join(os.tmpdir(), "defuss-db-jsonl-contract-"));
			const provider = new JsonlProvider();
			await provider.connect({ baseDir });

			return {
				provider,
				cleanup: async () => {
					await rm(baseDir, { recursive: true, force: true });
				},
			};
		},
	},
	{
		name: "mongo",
		create: async () => {
			clearMongoConnections();
			const provider = new MongoProvider(mongoOptions);
			await provider.connect(mongoOptions);
			if (provider.db) {
				await provider.db.collection(userTable.name).deleteMany({});
			}

			return {
				provider,
				cleanup: async () => {
					const mongoProvider = provider as MongoProvider;
					if (mongoProvider.db) {
						await mongoProvider.db.collection(userTable.name).deleteMany({});
					}
					clearMongoConnections();
				},
			};
		},
	},
];

describe("defuss-db provider contract", () => {
	for (const factory of factories) {
		describe(factory.name, () => {
			let provider: DefussProvider<any>;
			let table: DefussTable<ContractUser, any>;
			let cleanups: Array<() => Promise<void>>;

			beforeEach(async () => {
				cleanups = [];
				const created = await factory.create();
				provider = created.provider;
				if (created.cleanup) {
					cleanups.push(created.cleanup);
				}

				table = new DefussTable(provider, userTable);
				await table.init();
			});

			afterEach(async () => {
				if (provider?.isConnected()) {
					await provider.disconnect();
				}

				expect(provider?.isConnected()).toBe(false);

				while (cleanups.length > 0) {
					const cleanup = cleanups.pop();
					await cleanup?.();
				}
			});

			it("tracks connection lifecycle", async () => {
				expect(provider.isConnected()).toBe(true);

				await provider.disconnect();
				expect(provider.isConnected()).toBe(false);

				const recreated = await factory.create();
				provider = recreated.provider;
				if (recreated.cleanup) {
					cleanups.push(recreated.cleanup);
				}

				table = new DefussTable(provider, userTable);
				await table.init();

				expect(provider.isConnected()).toBe(true);
			});

			it("supports find and findOne across indexed and scanned selectors", async () => {
				await table.insert(createUser({
					name: "Alice",
					email: "alice@example.com",
					age: 30,
					city: "Berlin",
					seed: 1,
				}));
				await table.insert(createUser({
					name: "Anna",
					email: "anna@example.com",
					age: 31,
					city: "Berlin",
					seed: 2,
				}));
				await table.insert(createUser({
					name: "Bob",
					email: "bob@example.com",
					age: 32,
					city: "Hamburg",
					seed: 3,
				}));

				const allRecords = await table.find();
				const byCity = await table.find({ "profile.city": "Berlin" });
				const byName = await table.find({ name: "Alice" });
				const byEmail = await table.findOne({ email: "alice@example.com" });

				expect(allRecords).toHaveLength(3);
				expect(byCity.map((record) => record.email).sort()).toEqual([
					"alice@example.com",
					"anna@example.com",
				]);
				expect(byName).toHaveLength(1);
				expect(byName[0]?.email).toBe("alice@example.com");
				expect(byEmail?.profile.city).toBe("Berlin");
			});

			it("supports derived indexes plus id-based update and delete selectors", async () => {
				await table.insert(createUser({
					id: "user-alice",
					name: "Alice",
					email: "alice@example.com",
					age: 30,
					city: "Berlin",
					seed: 15,
				}));
				await table.insert(createUser({
					id: "user-anna",
					name: "Anna",
					email: "anna@example.com",
					age: 31,
					city: "Berlin",
					seed: 16,
				}));
				await table.insert(createUser({
					id: "user-bob",
					name: "Bob",
					email: "bob@other.dev",
					age: 32,
					city: "Hamburg",
					seed: 17,
				}));

				const byId = await table.findOne({ id: "user-alice" });
				const byDomain = await table.find({ emailDomain: "example.com" });

				expect(byId?.email).toBe("alice@example.com");
				expect(byDomain.map((record) => record.id).sort()).toEqual([
					"user-alice",
					"user-anna",
				]);

				await table.update({ id: "user-alice" }, { age: 45 });
				const updated = await table.findOne({ id: "user-alice" });
				expect(updated?.age).toBe(45);

				await table.delete({ id: "user-bob" });
				const deleted = await table.findOne({ id: "user-bob" });
				expect(deleted).toBeNull();
			});

			it("updates and deletes records selected by selectors", async () => {
				await table.insert(createUser({
					name: "Carla",
					email: "carla@example.com",
					age: 22,
					city: "Munich",
					seed: 4,
				}));
				await table.insert(createUser({
					name: "Chris",
					email: "chris@example.com",
					age: 23,
					city: "Munich",
					seed: 5,
				}));
				await table.insert(createUser({
					name: "Dora",
					email: "dora@example.com",
					age: 24,
					city: "Cologne",
					seed: 6,
				}));

				await table.update({ "profile.city": "Munich" }, { age: 50 });

				const updated = await table.find({ "profile.city": "Munich" });
				expect(updated).toHaveLength(2);
				expect(updated.every((record) => record.age === 50)).toBe(true);

				await table.delete({ "profile.city": "Munich" });

				const remaining = await table.find();
				expect(remaining).toHaveLength(1);
				expect(remaining[0]?.email).toBe("dora@example.com");
			});

			it("keeps the same id when upserting by unique selector or id", async () => {
				const insertedId = await table.insert(createUser({
					name: "Erin",
					email: "erin@example.com",
					age: 33,
					city: "Leipzig",
					seed: 7,
				}));

				const uniqueUpsertId = await table.upsert(
					{ email: "erin@example.com" },
					createUser({
						name: "Erin",
						email: "erin@example.com",
						age: 34,
						city: "Leipzig",
						seed: 8,
					}),
				);

				const idUpsertId = await table.upsert(
					{ id: insertedId },
					createUser({
						name: "Erin",
						email: "erin@example.com",
						age: 35,
						city: "Leipzig",
						seed: 9,
					}),
				);

				const updated = await table.findOne({ id: insertedId });

				expect(uniqueUpsertId).toBe(insertedId);
				expect(idUpsertId).toBe(insertedId);
				expect(updated?.id).toBe(insertedId);
				expect(updated?.age).toBe(35);
			});

			it("applies upsert selectors to inserted rows and rejects conflicts", async () => {
				const insertedId = await table.upsert(
					{ id: "user-ivy" },
					createUser({
						name: "Ivy",
						email: "ivy@example.com",
						age: 40,
						city: "Frankfurt",
						seed: 18,
					}),
				);

				const inserted = await table.findOne({ id: "user-ivy" });

				expect(insertedId).toBe("user-ivy");
				expect(inserted?.id).toBe("user-ivy");
				expect(inserted?.email).toBe("ivy@example.com");

				await expect(
					table.upsert(
						{ id: "user-jack" },
						createUser({
							id: "user-jill",
							name: "Jack",
							email: "jack@example.com",
							age: 41,
							city: "Bremen",
							seed: 19,
						}),
					),
				).rejects.toThrow();

				await expect(
					table.upsert(
						{ email: "kate@example.com" },
						createUser({
							name: "Kate",
							email: "kate+conflict@example.com",
							age: 42,
							city: "Dortmund",
							seed: 20,
						}),
					),
				).rejects.toThrow();
			});

			it("roundtrips ArrayBuffer, Blob, Date, and bigint payloads", async () => {
				const expected = createUser({
					name: "Fiona",
					email: "fiona@example.com",
					age: 36,
					city: "Berlin",
					seed: 10,
				});

				const insertedId = await table.insert(expected);
				const record = await table.findOne({ id: insertedId });

				expect(record).not.toBeNull();
				expect(record?.createdAt).toBeInstanceOf(Date);
				expect((record?.createdAt as Date).toISOString()).toBe(expected.createdAt.toISOString());
				expect(record?.visits).toBe(expected.visits);
				await expectBlobLikeEqual(record?.attachment, expected.attachment);
				expect(record?.avatar).toBeInstanceOf(ArrayBuffer);
				expectArrayBufferEqual(record?.avatar as ArrayBuffer, expected.avatar);
			});

			it("rejects duplicate unique inserts", async () => {
				await table.insert(createUser({
					name: "Gina",
					email: "gina@example.com",
					age: 37,
					city: "Bonn",
					seed: 11,
				}));

				await expect(
					table.insert(createUser({
						name: "Gina Clone",
						email: "gina@example.com",
						age: 38,
						city: "Bonn",
						seed: 12,
					})),
				).rejects.toThrow();
			});

			it("rejects empty selectors for update and delete", async () => {
				await expect(table.update({}, { age: 99 })).rejects.toThrow(/non-empty selector/i);
				await expect(table.delete({})).rejects.toThrow(/non-empty selector/i);
			});

			it("rejects id mutation during update", async () => {
				const insertedId = await table.insert(createUser({
					name: "Hank",
					email: "hank@example.com",
					age: 39,
					city: "Dresden",
					seed: 13,
				}));

				await expect(
					table.update({ id: insertedId }, { id: nextId(insertedId) } as Partial<ContractUser>),
				).rejects.toThrow(/id cannot be updated/i);
			});

			it("rejects invalid upsert selectors", async () => {
				const value = createUser({
					name: "Ivy",
					email: "ivy@example.com",
					age: 40,
					city: "Frankfurt",
					seed: 14,
				});

				await expect(table.upsert({}, value)).rejects.toThrow();
				await expect(table.upsert({ name: "Ivy" }, value)).rejects.toThrow();
				await expect(
					table.upsert({ email: "ivy@example.com", name: "Ivy" }, value),
				).rejects.toThrow();
			});
		});
	}
});
