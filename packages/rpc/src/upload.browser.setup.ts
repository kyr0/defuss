/**
 * Vitest globalSetup — runs in Node.js, before/after browser test suites.
 *
 * Starts an ExpressRpcServer with upload handlers so browser tests can hit it.
 * The chosen port is exposed via `__RPC_TEST_PORT__` which the browser tests
 * read from `globalThis` (injected by vitest's `provide` mechanism).
 */
import { ExpressRpcServer } from "./express-server.js";
import {
	createRpcServer,
	clearRpcServer,
	addUploadHandler,
	addStreamingUploadHandler,
} from "./server.js";
import { TestUserApi, TestProductApi, TestStreamModule } from "./test-api.js";

interface UploadBrowserSetupContext {
	provide(key: "rpcPort", value: number): void;
	provide(key: "rpcUrl", value: string): void;
}

let server: ExpressRpcServer | null = null;

export async function setup({ provide }: UploadBrowserSetupContext) {
	// Register standard RPC APIs
	createRpcServer({ TestUserApi, TestProductApi, TestStreamModule });

	// ── Buffered upload handler ──────────────────────────────────────
	addUploadHandler<{
		size: number;
		sha256Echo: string;
		md5Echo: string;
		handlerName: string;
	}>("test-buffered", async (data, meta) => {
		return {
			size: data.byteLength,
			sha256Echo: meta.sha256,
			md5Echo: meta.md5,
			handlerName: meta.handlerName,
		};
	});

	// ── Streaming upload handler ─────────────────────────────────────
	addStreamingUploadHandler<{
		totalBytes: number;
		chunkCount: number;
		handlerName: string;
	}>("test-streaming", async (stream, meta) => {
		let totalBytes = 0;
		let chunkCount = 0;
		const reader = stream.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			totalBytes += value.byteLength;
			chunkCount++;
		}
		return {
			totalBytes,
			chunkCount,
			handlerName: meta.handlerName,
		};
	});

	// ── Handler that returns complex data ────────────────────────────
	addUploadHandler<{
		received: boolean;
		uploadId: string;
		originalSize: number;
		offset: number;
	}>("test-echo-meta", async (_data, meta) => {
		return {
			received: true,
			uploadId: meta.uploadId,
			originalSize: meta.originalSize,
			offset: meta.offset,
		};
	});

	// ── Handler that throws an error ─────────────────────────────────
	addUploadHandler("test-error-handler", async () => {
		throw new Error("Intentional handler error");
	});

	// Start server on random port
	server = new ExpressRpcServer({ port: 0 });
	const info = await server.start();

	// `provide` injects serializable values into the browser test context
	provide("rpcPort", info.port);
	provide("rpcUrl", info.url);

	console.log(`[browser-test-setup] RPC server started on ${info.url}`);
}

export async function teardown() {
	if (server) {
		await server.stop();
		server = null;
	}
	await clearRpcServer();
	console.log("[browser-test-setup] RPC server stopped");
}

// Type-safe declarations so browser tests can `inject("rpcUrl")`
declare module "vitest" {
	export interface ProvidedContext {
		rpcPort: number;
		rpcUrl: string;
	}
}
