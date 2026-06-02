import { homedir } from "node:os";
import { join } from "node:path";
import {
	DefussTable,
	JsonlProvider,
	defineTable,
	type DefussRecord,
	type JsonlProviderOptions,
} from "defuss-db/server.js";

export interface StoredRpcDemoImage extends DefussRecord {
	id: string;
	fileName: string;
	mimeType: string;
	size: number;
	sha256: string;
	createdAt: Date;
	imageData: ArrayBuffer;
}

const rpcDemoImages = defineTable<StoredRpcDemoImage>({
	name: "ssg_example_rpc_demo_images_v1",
	indexes: [
		{ name: "createdAt", source: "createdAt" },
		{ name: "sha256", source: "sha256" },
		{ name: "fileName", source: "fileName" },
	],
});

// Write to user directory, not app bundle (which is read-only on macOS)
const dataDir = join(homedir(), ".config", "defuss-tauri-example", ".data", "rpc-demo");

let tablePromise: Promise<
	DefussTable<StoredRpcDemoImage, JsonlProviderOptions>
> | null = null;

export const getRpcDemoImageTable = async () => {
	if (!tablePromise) {
		tablePromise = (async () => {
			const provider = new JsonlProvider();
			await provider.connect({ baseDir: dataDir });
			const table = new DefussTable(provider, rpcDemoImages);
			await table.init();
			return table;
		})();
	}

	try {
		return await tablePromise;
	} catch (error) {
		tablePromise = null;
		throw error;
	}
};
