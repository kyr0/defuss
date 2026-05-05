import {
	addUploadHandler,
	type UploadMeta,
} from "defuss-rpc/server.js";
import {
	getRpcDemoImageTable,
	type StoredRpcDemoImage,
} from "./lib/rpc-image-store.js";

export interface MathApi {
	add(a: number, b: number): Promise<number>;
	multiply(a: number, b: number): Promise<number>;
}

const mathApi: MathApi = {
	add: async (a, b) => a + b,
	multiply: async (a, b) => a * b,
};

export interface GreetApi {
	hello(name: string): Promise<string>;
}

const greetApi: GreetApi = {
	hello: async (name) => `Hello, ${name}!`,
};

export interface RpcDemoUploadResult {
	uploadId: string;
	size: number;
	sha256: string;
	md5: string;
}

export interface RpcDemoImageSummary {
	id: string;
	fileName: string;
	mimeType: string;
	size: number;
	sha256: string;
	md5: string;
	createdAt: Date;
}

export interface RpcDemoImage extends RpcDemoImageSummary {
	imageData: ArrayBuffer;
}

export interface ImageDemoApi {
	finalizeUpload(
		uploadId: string,
		fileName: string,
		mimeType: string,
	): Promise<RpcDemoImageSummary>;
	getUpload(uploadId: string): Promise<RpcDemoImage | null>;
	getLatestUpload(): Promise<RpcDemoImageSummary | null>;
}

const uploadHandlerName = "image-canvas-demo";

const toOwnedArrayBuffer = (data: Uint8Array) => {
	const copy = new Uint8Array(new ArrayBuffer(data.byteLength));
	copy.set(data);
	return copy.buffer;
};

const toSummary = (record: StoredRpcDemoImage): RpcDemoImageSummary => ({
	id: record.id,
	fileName: record.fileName,
	mimeType: record.mimeType,
	size: record.size,
	sha256: record.sha256,
	md5: record.md5,
	createdAt: record.createdAt,
});

const toImage = (record: StoredRpcDemoImage): RpcDemoImage => ({
	...toSummary(record),
	imageData: record.imageData,
});

addUploadHandler<RpcDemoUploadResult>(
	uploadHandlerName,
	async (data: Uint8Array, meta: UploadMeta) => {
	const table = await getRpcDemoImageTable();
	const existing = await table.findOne({ id: meta.uploadId });

	await table.upsert(
		{ id: meta.uploadId },
		{
			id: meta.uploadId,
			fileName: existing?.fileName ?? `${meta.uploadId}.bin`,
			mimeType: existing?.mimeType ?? "application/octet-stream",
			size: meta.bytesReceived,
			sha256: meta.sha256,
			md5: meta.md5,
			createdAt: existing?.createdAt ?? new Date(),
			imageData: toOwnedArrayBuffer(data),
		},
	);

	return {
		uploadId: meta.uploadId,
		size: meta.bytesReceived,
		sha256: meta.sha256,
		md5: meta.md5,
	};
	},
);

const imageDemoApi: ImageDemoApi = {
	finalizeUpload: async (uploadId, fileName, mimeType) => {
		const normalizedFileName = fileName.trim();
		const normalizedMimeType = mimeType.trim() || "application/octet-stream";

		if (!normalizedFileName) {
			throw new Error("A file name is required to finalize the upload.");
		}
		if (!normalizedMimeType.startsWith("image/")) {
			throw new Error("The RPC demo currently accepts image uploads only.");
		}

		const table = await getRpcDemoImageTable();
		const existing = await table.findOne({ id: uploadId });
		if (!existing) {
			throw new Error(`Upload ${uploadId} was not found.`);
		}

		await table.update(
			{ id: uploadId },
			{ fileName: normalizedFileName, mimeType: normalizedMimeType },
		);

		const updated = await table.findOne({ id: uploadId });
		if (!updated) {
			throw new Error(`Upload ${uploadId} disappeared during finalization.`);
		}

		return toSummary(updated);
	},
	getUpload: async (uploadId) => {
		const table = await getRpcDemoImageTable();
		const record = await table.findOne({ id: uploadId });
		return record ? toImage(record) : null;
	},
	getLatestUpload: async () => {
		const table = await getRpcDemoImageTable();
		const records = await table.find({});
		const latest = records.sort(
			(a: StoredRpcDemoImage, b: StoredRpcDemoImage) =>
				b.createdAt.getTime() - a.createdAt.getTime(),
		)[0];
		return latest ? toSummary(latest) : null;
	},
};

export default { mathApi, greetApi, imageDemoApi };
