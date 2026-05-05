import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
	md5: string;
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

const dataDir = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	".data",
	"rpc-demo",
);

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