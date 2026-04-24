import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JsonlProvider } from "defuss-db/server.js";
import { runProviderWalkthrough } from "./common.js";

const baseDir = await mkdtemp(path.join(os.tmpdir(), "defuss-db-jsonl-example-"));
const provider = new JsonlProvider();

await provider.connect({ baseDir });

try {
	await runProviderWalkthrough({
		label: "JsonlProvider walkthrough",
		provider,
		tableName: "example_users_jsonl",
	});
} finally {
	await provider.disconnect();
	await rm(baseDir, { recursive: true, force: true });
}