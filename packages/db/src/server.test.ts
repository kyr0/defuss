import {
	MongoProvider,
	DefussTable,
	LibsqlProvider,
	defineTable,
	type MongoProviderOptions,
	type LibsqlProviderOptions,
} from "./server.js";
import { getEnv } from "./env.js";
import type { DefussRecord } from "./types.js";

interface TestUser extends DefussRecord {
	name: string;
	age: number;
	email: string;
	profile: {
		city: string;
	};
}

const serverUserTable = defineTable<TestUser>({
	name: "server_users_v2",
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

describe("defuss-db libsql table", () => {
	let provider: LibsqlProvider;
	let table: DefussTable<TestUser, LibsqlProviderOptions>;

	beforeEach(async () => {
		provider = new LibsqlProvider();
		await provider.connect({ url: ":memory:" });
		table = new DefussTable(provider, serverUserTable);
		await table.init();
	});

	afterEach(async () => {
		await provider.disconnect();
	});

	it("supports declared indexes and selector scans", async () => {
		const insertedId = await table.insert({
			name: "Alice",
			age: 30,
			email: "alice@example.com",
			profile: { city: "Berlin" },
		});

		const byEmail = await table.findOne({ email: "alice@example.com" });
		const byName = await table.findOne({ name: "Alice" });
		expect(byEmail?.id).toBe(insertedId);
		expect(byName?.email).toBe("alice@example.com");
	});

	it("upserts on a unique selector without changing id", async () => {
		const insertedId = await table.insert({
			name: "Bob",
			age: 25,
			email: "bob@example.com",
			profile: { city: "Hamburg" },
		});

		const upsertedId = await table.upsert(
			{ email: "bob@example.com" },
			{
				name: "Bob",
				age: 26,
				email: "bob@example.com",
				profile: { city: "Hamburg" },
			},
		);

		const updated = await table.findOne({ email: "bob@example.com" });
		expect(upsertedId).toBe(insertedId);
		expect(updated?.id).toBe(insertedId);
		expect(updated?.age).toBe(26);
	});
});

describe("defuss-db mongo table", () => {
	let provider: MongoProvider;
	let table: DefussTable<TestUser, MongoProviderOptions>;
	let options: MongoProviderOptions;

	beforeAll(() => {
		const connectionString = getEnv("MONGO_CONNECTION_STRING");
		options = {
			connectionString,
			databaseName: "test_db",
		};
	});

	beforeEach(async () => {
		if (!options.connectionString) {
			return;
		}

		provider = new MongoProvider(options);
		await provider.connect(options);
		table = new DefussTable(provider, serverUserTable);
		await table.init();

		if (provider.db) {
			await provider.db.collection(serverUserTable.name).deleteMany({});
		}
	});

	afterEach(async () => {
		if (!provider) {
			return;
		}

		if (provider.db) {
			await provider.db.collection(serverUserTable.name).deleteMany({});
		}
		await provider.disconnect();
	});

	it("supports declared indexes and id lookups", async () => {
		if (!options.connectionString) {
			return;
		}

		const insertedId = await table.insert({
			name: "Carla",
			age: 29,
			email: "carla@example.com",
			profile: { city: "Cologne" },
		});

		const byId = await table.findOne({ id: insertedId });
		const byCity = await table.findOne({ "profile.city": "Cologne" });
		expect(byId?.email).toBe("carla@example.com");
		expect(byCity?.id).toBe(insertedId);
	});

	it("rejects empty ids", async () => {
		if (!options.connectionString) {
			return;
		}

		await expect(
			table.insert({
				id: "",
				name: "Invalid",
				age: 10,
				email: "invalid@example.com",
				profile: { city: "Nowhere" },
			}),
		).rejects.toThrow();
	});

	it("upserts by unique selector and keeps the same id", async () => {
		if (!options.connectionString) {
			return;
		}

		const insertedId = await table.insert({
			name: "David",
			age: 38,
			email: "david@example.com",
			profile: { city: "Bonn" },
		});

		const upsertedId = await table.upsert(
			{ email: "david@example.com" },
			{
				name: "David",
				age: 39,
				email: "david@example.com",
				profile: { city: "Bonn" },
			},
		);

		const updated = await table.findOne({ email: "david@example.com" });
		expect(upsertedId).toBe(insertedId);
		expect(updated?.id).toBe(insertedId);
		expect(updated?.age).toBe(39);
	});
});
