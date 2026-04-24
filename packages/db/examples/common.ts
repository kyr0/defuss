import {
	DefussTable,
	defineTable,
	type DefussProvider,
	type DefussRecord,
	type PrimaryKeyValue,
} from "defuss-db";

interface ExampleUser extends DefussRecord {
	name: string;
	age: number;
	email: string;
	profile: {
		city: string;
	};
}

interface ExampleSummary {
	adaId: PrimaryKeyValue;
	linusId: PrimaryKeyValue;
	graceInsertedId: PrimaryKeyValue;
	graceUpdatedId: PrimaryKeyValue;
	byEmail: ExampleUser | null;
	byName: ExampleUser | null;
	berlinUsers: ExampleUser[];
	exampleDotComUsers: ExampleUser[];
	updatedAda: ExampleUser | null;
	remainingUsers: ExampleUser[];
}

export interface ProviderWalkthroughOptions {
	label: string;
	provider: DefussProvider<any>;
	tableName: string;
}

export async function runProviderWalkthrough(
	options: ProviderWalkthroughOptions,
): Promise<ExampleSummary> {
	const users = new DefussTable(options.provider, defineUserTable(options.tableName));
	await users.init();

	const adaId = await users.insert({
		id: "user-ada",
		name: "Ada",
		age: 31,
		email: "ada@example.com",
		profile: { city: "Berlin" },
	});

	const linusId = await users.insert({
		name: "Linus",
		age: 28,
		email: "linus@other.dev",
		profile: { city: "Berlin" },
	});

	const graceInsertedId = await users.upsert(
		{ email: "grace@example.com" },
		{
			name: "Grace",
			age: 37,
			email: "grace@example.com",
			profile: { city: "Paris" },
		},
	);

	const graceUpdatedId = await users.upsert(
		{ email: "grace@example.com" },
		{
			name: "Grace",
			age: 38,
			email: "grace@example.com",
			profile: { city: "Paris" },
		},
	);

	const byEmail = await users.findOne({ email: "ada@example.com" });
	const byName = await users.findOne({ name: "Ada" });
	const berlinUsers = await users.find({ "profile.city": "Berlin" });
	const exampleDotComUsers = await users.find({ emailDomain: "example.com" });

	await users.update({ id: adaId }, { age: 32 });
	const updatedAda = await users.findOne({ id: adaId });

	await users.delete({ id: linusId });
	const remainingUsers = await users.find();

	const summary = {
		adaId,
		linusId,
		graceInsertedId,
		graceUpdatedId,
		byEmail,
		byName,
		berlinUsers,
		exampleDotComUsers,
		updatedAda,
		remainingUsers,
	};

	console.log(`\n${options.label}`);
	console.log(
		JSON.stringify(
			{
				adaId: summary.adaId,
				linusId: summary.linusId,
				graceInsertedId: summary.graceInsertedId,
				graceUpdatedId: summary.graceUpdatedId,
				upsertKeptSameId: summary.graceInsertedId === summary.graceUpdatedId,
				byEmail: summarizeUser(summary.byEmail),
				byName: summarizeUser(summary.byName),
				berlinUsers: summarizeUsers(summary.berlinUsers),
				exampleDotComUsers: summarizeUsers(summary.exampleDotComUsers),
				updatedAda: summarizeUser(summary.updatedAda),
				remainingUsers: summarizeUsers(summary.remainingUsers),
			},
			null,
			2,
		),
	);

	return summary;
}

function defineUserTable(tableName: string) {
	return defineTable<ExampleUser>({
		name: tableName,
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
}

function summarizeUsers(users: ExampleUser[]): Array<Record<string, unknown>> {
	return users
		.map((user) => summarizeUser(user))
		.filter((user): user is Record<string, unknown> => user !== null)
		.sort((left, right) =>
			String(left.email ?? "").localeCompare(String(right.email ?? "")),
		);
}

function summarizeUser(user: ExampleUser | null): Record<string, unknown> | null {
	if (!user) {
		return null;
	}

	return {
		id: user.id,
		name: user.name,
		age: user.age,
		email: user.email,
		city: user.profile.city,
	};
}