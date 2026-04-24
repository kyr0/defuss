import "fake-indexeddb/auto";
import { DexieProvider } from "defuss-db/client.js";
import { runProviderWalkthrough } from "./common.js";

const databaseName = "DefussDbExampleDexie";
const provider = new DexieProvider(databaseName);

await provider.connect();

try {
	await runProviderWalkthrough({
		label: "DexieProvider walkthrough",
		provider,
		tableName: "example_users_dexie",
	});
} finally {
	await provider.disconnect();
	await new Promise<void>((resolve) => {
		const request = indexedDB.deleteDatabase(databaseName);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
}