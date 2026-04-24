import { MongoProvider, clearMongoConnections } from "defuss-db/server.js";
import { runProviderWalkthrough } from "./common.js";

const tableName = "example_users_mongodb";
const options = {
	connectionString:
		process.env.MONGO_CONNECTION_STRING ??
		"mongodb://mongoadmin:defuss-db-password@localhost:27018/defuss-db?authSource=admin",
	databaseName: "defuss_db_examples",
};
const provider = new MongoProvider(options);

await provider.connect(options);

try {
	if (provider.db) {
		await provider.db.collection(tableName).deleteMany({});
	}

	await runProviderWalkthrough({
		label: "MongoProvider walkthrough",
		provider,
		tableName: tableName,
	});
} finally {
	if (provider.db) {
		await provider.db.collection(tableName).deleteMany({});
	}

	await provider.disconnect();
	clearMongoConnections();
}