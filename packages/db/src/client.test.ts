import "fake-indexeddb/auto";
import {
	DexieProvider,
	DefussTable,
	defineTable,
	type DexieProviderOptions,
} from "./client.js";
import type { DefussRecord } from "./types.js";

interface TestUser extends DefussRecord {
	name: string;
	age: number;
	email: string;
	profile: {
		city: string;
	};
	avatar?: ArrayBuffer;
}

const clientUserTable = defineTable<TestUser>({
	name: "client_users",
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
	],
});

describe("defuss-db client table", () => {
	let provider: DexieProvider;
	let table: DefussTable<TestUser, DexieProviderOptions>;
	const databaseName = "DefussDbClientV2";

	beforeEach(async () => {
		provider = new DexieProvider(databaseName);
		await provider.connect();
		table = new DefussTable(provider, clientUserTable);
		await table.init();
	});

	afterEach(async () => {
		await provider.disconnect();
		await new Promise<void>((resolve) => {
			const request = indexedDB.deleteDatabase(databaseName);
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
			request.onblocked = () => resolve();
		});
	});

	it("inserts and finds by declared indexes", async () => {
		const insertedId = await table.insert({
			name: "Alice",
			age: 30,
			email: "alice@example.com",
			profile: {
				city: "Berlin",
			},
		});

		const byEmail = await table.findOne({ email: "alice@example.com" });
		const byCity = await table.findOne({ "profile.city": "Berlin" });

		expect(insertedId).toBeDefined();
		expect(byEmail?.email).toBe("alice@example.com");
		expect(byCity?.profile.city).toBe("Berlin");
		expect(byEmail?.id).toBe(insertedId);
	});

	it("falls back to scan for undeclared selectors", async () => {
		await table.insert({
			name: "Bob",
			age: 31,
			email: "bob@example.com",
			profile: {
				city: "Hamburg",
			},
		});

		const record = await table.findOne({ name: "Bob" });
		expect(record?.email).toBe("bob@example.com");
	});

	it("preserves ArrayBuffer payloads", async () => {
		const bytes = new Uint8Array(new ArrayBuffer(16));
		for (let index = 0; index < bytes.length; index += 1) {
			bytes[index] = index;
		}

		await table.insert({
			name: "Binary",
			age: 32,
			email: "binary@example.com",
			profile: {
				city: "Cologne",
			},
			avatar: bytes.buffer.slice(0),
		});

		const record = await table.findOne({ email: "binary@example.com" });
		expect(record?.avatar).toBeInstanceOf(ArrayBuffer);
		expect(new Uint8Array(record!.avatar as ArrayBuffer)[10]).toBe(10);
	});

	it("updates and deletes by id", async () => {
		const insertedId = await table.insert({
			name: "Carla",
			age: 27,
			email: "carla@example.com",
			profile: {
				city: "Munich",
			},
		});

		await table.update({ id: insertedId }, { age: 28 });
		const updated = await table.findOne({ id: insertedId });
		expect(updated?.age).toBe(28);

		await table.delete({ id: insertedId });
		const deleted = await table.findOne({ id: insertedId });
		expect(deleted).toBeNull();
	});

	it("upserts by unique selector and keeps the same id", async () => {
		const insertedId = await table.insert({
			name: "David",
			age: 40,
			email: "david@example.com",
			profile: {
				city: "Leipzig",
			},
		});

		const upsertedId = await table.upsert(
			{ email: "david@example.com" },
			{
				name: "David",
				age: 41,
				email: "david@example.com",
				profile: {
					city: "Leipzig",
				},
			},
		);

		const record = await table.findOne({ email: "david@example.com" });
		expect(upsertedId).toBe(insertedId);
		expect(record?.id).toBe(insertedId);
		expect(record?.age).toBe(41);
	});
});
