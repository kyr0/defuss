import { LibsqlProvider } from "defuss-db/server.js";
import { runProviderWalkthrough } from "./common.js";

const provider = new LibsqlProvider();

await provider.connect({ url: ":memory:" });

try {
	await runProviderWalkthrough({
		label: "LibsqlProvider walkthrough",
		provider,
		tableName: "example_users_libsql",
	});
} finally {
	await provider.disconnect();
}