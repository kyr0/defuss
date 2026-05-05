import { DSON } from "defuss-dson";
import type {
	ClientHook,
	DsonStreamFrame,
	RpcApiClass,
	RpcApiSchema,
} from "./types.d.js";

// re-export for type / code safety
export * from "./types.d.js";
export type * from "./rpc-state.js";

/** Client-side endpoint paths - must stay in sync with server.ts `RPC_PATH`/`RPC_SCHEMA_PATH`. */
const RPC_PATH = "/rpc" as const;
const RPC_SCHEMA_PATH = "/rpc/schema" as const;

/**
 * Default RPC endpoint URL, auto-set when the `virtual:defuss-rpc` module is
 * imported anywhere in the application.  Falls back to `""` (current origin)
 * when not set.
 */
let _defaultEndpoint = "";

/**
 * Registers the default RPC endpoint used by `getRpcClient()` when no explicit
 * `baseUrl` option is provided.
 *
 * This is called automatically by the `virtual:defuss-rpc` module emitted by
 * the Vite / Astro plugin - you normally don't need to call it yourself.
 *
 * @param url - Full RPC endpoint URL (e.g. `"http://localhost:3210"`).
 */
export function _setDefaultEndpoint(url: string): void {
	_defaultEndpoint = url;
}

export interface RpcClientOptions {
	/**
	 * Base URL for the RPC server (e.g. `"http://localhost:3210"`).
	 *
	 * When omitted, falls back to the endpoint auto-registered by the
	 * `virtual:defuss-rpc` module, or `""` (current origin) if neither is set.
	 */
	baseUrl?: string;
}

/**
 * Fetches the RPC API schema from the server.
 *
 * Uses `POST` because `rpcRoute` mounts with `.all()` (accepts any HTTP method), and some
 * hosting environments strip body content from `GET` requests.
 *
 * @param baseUrl - Optional base URL for the RPC server (e.g. `"http://localhost:3210"`).
 *                  Defaults to `""` (current origin).
 * @returns The parsed `RpcApiSchema` array from the server.
 */
export async function getSchema(baseUrl = "") {
	const response = await fetch(`${baseUrl}${RPC_SCHEMA_PATH}`, {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch schema: ${response.statusText}`);
	}
	return response.json();
}

/** Cached schema - populated on the first `getSchema()` call. Invalidate with `clearSchemaCache()`. */
let schema: RpcApiSchema | null = null;

/**
 * Clears the cached schema, forcing a refetch on the next getRpcClient() call
 */
export function clearSchemaCache() {
	schema = null;
}

const hooks: ClientHook[] = [];

/**
 * Clears all registered client hooks. Useful for test isolation.
 */
export function clearHooks() {
	hooks.length = 0;
	customHeaders = null;
}

/**
 * Adds a hook function that gets called at a specific time BEFORE or AFTER each RPC method invocation.
 * Can reject calls by returning false (only for guards).
 *
 * @param hook - The hook to add
 */
export function addHook(hook: ClientHook) {
	hooks.push(hook);
}

/** Custom headers merged into every RPC fetch request. Set via `setHeaders()`, cleared via `clearHooks()`. */
let customHeaders: HeadersInit | null = null;

/**
 * Set custom headers to include in each RPC request
 * @param headers - Custom headers to include in each RPC request
 */
export function setHeaders(headers: HeadersInit) {
	customHeaders = headers;
}

/**
 * Factory that returns an async RPC caller function for a given namespace and method name.
 *
 * Each returned function, when called with positional arguments, executes the full client-side
 * hook pipeline before and after the network request:
 *
 * 1. **Guard hooks** (`"guard"` phase) - run before the fetch is dispatched.
 *    Any hook returning falsy throws an Error and aborts the call.
 * 2. **Fetch** - POST to `{baseUrl}/rpc` with JSON body `{ className, methodName, args }`.
 * 3. **Response hooks** (`"response"` phase) - run after the raw HTTP Response arrives,
 *    before the body is read. Useful for logging or early rejection based on status.
 * 4. **DSON deserialization** - response text is parsed with `DSON.parse`, which restores
 *    `Date`, `Map`, `Set`, `ArrayBuffer`, `BigInt`, and typed arrays that plain `JSON.parse` drops.
 * 5. **Result hooks** (`"result"` phase) - run after deserialization with the final `data` value.
 *
 * @param namespaceName - The registered namespace (class or module name).
 * @param methodName    - The method or function name on the namespace.
 * @param baseUrl       - Optional base URL prefix (default `""` = current origin).
 * @returns An async function `(...args) => Promise<unknown>` that dispatches the RPC call.
 */
function createRpcMethod(
	namespaceName: string,
	methodName: string,
	baseUrl = "",
) {
	return async (...args: unknown[]) => {
		const request: RequestInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(customHeaders || {}),
			},
			body: DSON.stringify({
				className: namespaceName,
				methodName,
				args,
			}),
		};

		// Call guards
		for (const guardHook of hooks.filter((h) => h.phase === "guard")) {
			const allowed = await guardHook.fn(
				namespaceName,
				methodName,
				args,
				request,
			);

			if (!allowed) {
				throw new Error(
					`RPC call to ${namespaceName}.${methodName} was blocked by a guard`,
				);
			}
		}

		const response = await fetch(`${baseUrl}${RPC_PATH}`, request);

		// Call response hooks
		for (const responseHook of hooks.filter(
			(h: ClientHook) => h.phase === "response",
		)) {
			await responseHook.fn(namespaceName, methodName, args, request, response);
		}

		if (!response.ok) {
			const body = await response.text();
			throw Object.assign(
				new Error(`RPC call failed: ${response.status} ${response.statusText}`),
				{
					status: response.status,
					body,
					namespace: namespaceName,
					method: methodName,
				},
			);
		}
		const data = DSON.parse(await response.text());

		// Call result hooks
		for (const resultHook of hooks.filter(
			(h: ClientHook) => h.phase === "result",
		)) {
			await resultHook.fn(
				namespaceName,
				methodName,
				args,
				request,
				response,
				data,
			);
		}

		return data;
	};
}

/**
 * Factory that returns an async generator RPC caller for a given namespace and method.
 *
 * When the server method is a generator, the HTTP response is an NDJSON stream of
 * `DsonStreamFrame` objects. This function reads that stream line-by-line and reconstructs
 * an async generator on the client that yields and returns exactly what the server generator did.
 *
 * Uses the same guard / response hook pipeline as `createRpcMethod`.
 *
 * @param namespaceName - The registered namespace (class or module name).
 * @param methodName    - The method or function name on the namespace.
 * @param baseUrl       - Optional base URL prefix (default `""` = current origin).
 * @returns An async generator function `(...args) => AsyncGenerator<unknown, unknown>`.
 */
function createRpcGeneratorMethod(
	namespaceName: string,
	methodName: string,
	baseUrl = "",
) {
	return async function* (...args: unknown[]) {
		const request: RequestInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(customHeaders || {}),
			},
			body: DSON.stringify({
				className: namespaceName,
				methodName,
				args,
			}),
		};

		// Call guards
		for (const guardHook of hooks.filter((h) => h.phase === "guard")) {
			const allowed = await guardHook.fn(
				namespaceName,
				methodName,
				args,
				request,
			);
			if (!allowed) {
				throw new Error(
					`RPC call to ${namespaceName}.${methodName} was blocked by a guard`,
				);
			}
		}

		const response = await fetch(`${baseUrl}${RPC_PATH}`, request);

		// Call response hooks
		for (const responseHook of hooks.filter(
			(h: ClientHook) => h.phase === "response",
		)) {
			await responseHook.fn(namespaceName, methodName, args, request, response);
		}

		if (!response.ok) {
			const body = await response.text();
			throw Object.assign(
				new Error(`RPC call failed: ${response.status} ${response.statusText}`),
				{
					status: response.status,
					body,
					namespace: namespaceName,
					method: methodName,
				},
			);
		}

		// Read the NDJSON stream line-by-line
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let returnValue: unknown = undefined;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			// Keep the last (possibly incomplete) line in the buffer
			buffer = lines.pop()!;

			for (const line of lines) {
				if (!line) continue;
				const frame: DsonStreamFrame = DSON.parse(line);

				if (frame.type === "yield") {
					yield frame.value;
				} else if (frame.type === "return") {
					returnValue = frame.value;
					// Don't break - let the read loop finish naturally
				} else if (frame.type === "error") {
					throw new Error(frame.error.message);
				}
			}
		}

		// Process any remaining data in the buffer
		if (buffer) {
			const frame: DsonStreamFrame = DSON.parse(buffer);
			if (frame.type === "yield") {
				yield frame.value;
			} else if (frame.type === "return") {
				returnValue = frame.value;
			} else if (frame.type === "error") {
				throw new Error(frame.error.message);
			}
		}

		// Call result hooks with the return value
		for (const resultHook of hooks.filter(
			(h: ClientHook) => h.phase === "result",
		)) {
			await resultHook.fn(
				namespaceName,
				methodName,
				args,
				request,
				response,
				returnValue,
			);
		}

		return returnValue;
	};
}

/**
 * Get the RPC client proxy object.
 *
 * Supports both class-based and module-based (plain object) RPC namespaces.
 *
 * - Class-based: `const user = await new rpc.UserApi().getUser("1")`
 * - Module-based: `const sum = await rpc.mathUtils.add(1, 2)`
 *
 * @typeParam T - The type of the RPC API namespace
 * @returns A proxy object that implements the RPC API
 *
 * @remarks
 * The schema is cached globally after the first fetch. If you need to connect to a different
 * server URL in the same process, call `clearSchemaCache()` before calling `getRpcClient()` again.
 */
export async function getRpcClient<T extends Record<string, unknown>>(
	options?: RpcClientOptions,
) {
	const baseUrl = options?.baseUrl ?? _defaultEndpoint;
	if (schema === null) {
		schema = await getSchema(baseUrl);
	}
	const client = {} as Record<string, unknown>;

	for (const entry of schema!) {
		if (entry.kind === "module") {
			// Module-based: create a proxy object with methods
			const moduleName = entry.moduleName;
			const methodNames = Object.keys(entry.methods);

			const moduleProxy: Record<string, unknown> = {};
			for (const methodName of methodNames) {
				moduleProxy[methodName] = entry.methods[methodName]?.generator
					? createRpcGeneratorMethod(moduleName, methodName, baseUrl)
					: createRpcMethod(moduleName, methodName, baseUrl);
			}

			client[moduleName] = new Proxy(moduleProxy, {
				get: (target, prop) => {
					if (typeof prop === "string" && prop in target) {
						return target[prop];
					}
					// For unknown methods, dynamically create an RPC caller
					if (typeof prop === "string") {
						return createRpcMethod(moduleName, prop, baseUrl);
					}
					return undefined;
				},
			});
		} else {
			// Class-based: create a constructor proxy (existing behavior)
			const className = entry.className;
			// biome-ignore lint/complexity/useArrowFunction: constructors are not arrow functions
			const Constructor = function (..._args: unknown[]) {
				return {} as unknown;
			} as unknown as RpcApiClass;

			client[className] = new Proxy(Constructor, {
				construct: (_ctorTarget, _ctorArgs) => {
					return new Proxy(
						{},
						{
							get: (_target, methodName) => {
								if (typeof methodName !== "string") return undefined;
								return entry.methods[methodName]?.generator
									? createRpcGeneratorMethod(className, methodName, baseUrl)
									: createRpcMethod(className, methodName, baseUrl);
							},
						},
					);
				},
			});
		}
	}
	return client as T;
}

/** Alias for {@link getRpcClient} */
export const createRpcClient = getRpcClient;

// -- Upload API ---------------------------------------------------------------

/** Upload endpoint path - must match server.ts `RPC_UPLOAD_PATH`. */
const RPC_UPLOAD_PATH = "/rpc/upload" as const;

/** Accepted binary source types for `upload()`. */
export type BinarySource = Uint8Array | ArrayBuffer | ArrayBufferView | Blob;

/** Compression preference for upload transfers. */
export type UploadCompression = "auto" | "gzip" | "none";

/** Options for the `upload()` function. */
export interface UploadOptions {
	/** Base URL for the RPC server. Defaults to the auto-registered endpoint. */
	baseUrl?: string;
	/** Compression preference. `"auto"` uses gzip when the browser supports `CompressionStream`. */
	compression?: UploadCompression;
	/** Chunk size in bytes for streaming the body (default 256 KiB). */
	chunkSize?: number;
	/**
	 * Upload ID. Provide this when **resuming** a previously interrupted upload.
	 * A new ID is auto-generated when omitted.
	 */
	uploadId?: string;
	/** AbortSignal to cancel the upload. */
	signal?: AbortSignal;
	/** Extra headers merged into the fetch request. */
	headers?: Record<string, string>;
	/**
	 * Open an SSE sideband for server-confirmed progress events (`"receiving"` events).
	 * @default true
	 */
	progress?: boolean;
}

/**
 * Events yielded by the `upload()` async generator.
 *
 * - `sending`   - client-tracked bytes handed to the network stack.
 * - `receiving` - server-confirmed bytes (via SSE sideband).
 * - `complete`  - upload finished; contains handler result, hashes, and stats.
 */
export type UploadEvent<T = unknown> =
	| { type: "sending"; bytesSent: number; totalBytes: number; percent: number }
	| { type: "receiving"; bytesReceived: number; totalBytes: number; percent: number }
	| {
		type: "complete";
		result: T;
		uploadId: string;
		bytesReceived: number;
		sha256: string;
		md5: string;
		durationMs: number;
	};

/**
 * The final result returned by `uploadComplete()`.
 */
export interface UploadResult<T = unknown> {
	result: T;
	uploadId: string;
	bytesReceived: number;
	sha256: string;
	md5: string;
	durationMs: number;
}

// -- Binary helpers -----------------------------------------------------------

type ArrayBufferBackedBytes = Uint8Array<ArrayBuffer>;

function toArrayBufferBackedBytes(
	source: ArrayBuffer | ArrayBufferView,
): ArrayBufferBackedBytes {
	if (source instanceof ArrayBuffer) {
		return new Uint8Array(source);
	}

	const view = new Uint8Array(
		source.buffer,
		source.byteOffset,
		source.byteLength,
	);
	const normalized = new Uint8Array(new ArrayBuffer(view.byteLength));
	normalized.set(view);
	return normalized;
}

function normalizeBinarySource(
	source: BinarySource,
): Blob | ArrayBufferBackedBytes {
	if (source instanceof Blob) return source;
	if (source instanceof ArrayBuffer) {
		return new Uint8Array(source);
	}
	return toArrayBufferBackedBytes(source);
}

function getSourceSize(source: Blob | ArrayBufferBackedBytes): number {
	return source instanceof Blob ? source.size : source.byteLength;
}

function sliceBinarySource(
	source: Blob | ArrayBufferBackedBytes,
	offset = 0,
): Blob | ArrayBufferBackedBytes {
	if (source instanceof Blob) {
		return offset > 0 ? source.slice(offset) : source;
	}

	return offset > 0 ? toArrayBufferBackedBytes(source.subarray(offset)) : source;
}

function toReadableStream(
	source: Blob | ArrayBufferBackedBytes,
	chunkSize: number,
): ReadableStream<Uint8Array> {
	if (source instanceof Blob) {
		return source.stream() as ReadableStream<Uint8Array>;
	}

	let pos = 0;
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (pos >= source.byteLength) {
				controller.close();
				return;
			}
			const end = Math.min(pos + chunkSize, source.byteLength);
			controller.enqueue(source.subarray(pos, end));
			pos = end;
		},
	});
}

async function createBufferedUploadBody(
	source: Blob | ArrayBufferBackedBytes,
	preference: UploadCompression,
): Promise<{
	body: Blob | ArrayBufferBackedBytes;
	usedCompression: "gzip" | "none";
}> {
	if (preference === "none") {
		return { body: source, usedCompression: "none" };
	}

	if (typeof CompressionStream === "function") {
		const blobSource = source instanceof Blob ? source : new Blob([source]);
		const compressedStream = blobSource
			.stream()
			.pipeThrough(
				new CompressionStream("gzip") as unknown as ReadableWritablePair<
					Uint8Array,
					Uint8Array
				>,
			);

		return {
			body: await new Response(compressedStream).blob(),
			usedCompression: "gzip",
		};
	}

	if (preference === "gzip") {
		console.warn("[defuss-rpc] CompressionStream unavailable; uploading uncompressed.");
	}

	return { body: source, usedCompression: "none" };
}

function shouldUseBufferedBrowserUpload(): boolean {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

function applyCompression(
	stream: ReadableStream<Uint8Array>,
	preference: UploadCompression,
): { stream: ReadableStream<Uint8Array>; usedCompression: "gzip" | "none" } {
	if (preference === "none") {
		return { stream, usedCompression: "none" };
	}
	if (typeof CompressionStream === "function") {
		return {
			stream: stream.pipeThrough(new CompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>) as ReadableStream<Uint8Array>,
			usedCompression: "gzip",
		};
	}
	if (preference === "gzip") {
		console.warn("[defuss-rpc] CompressionStream unavailable; uploading uncompressed.");
	}
	return { stream, usedCompression: "none" };
}

function sanitizeUploadId(value: string): string {
	const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
	return sanitized || crypto.randomUUID();
}

// -- upload() - async generator with progress ---------------------------------

/**
 * Upload binary data to a named server-side handler.
 *
 * Returns an async generator that yields:
 * - `{ type: "sending", ... }`   - client-side progress (bytes fed to the network).
 * - `{ type: "receiving", ... }` - server-confirmed progress (via SSE sideband).
 * - `{ type: "complete", ... }`  - final result with hashes and handler return value.
 *
 * Supports **resumable uploads**: pass a previously used `uploadId` in `options`.
 * The client will `HEAD` to check the server offset and resume from there.
 *
 * @typeParam T - The return type of the server-side upload handler.
 * @param handlerName - The name passed to `addUploadHandler()` on the server.
 * @param data        - Binary payload (Uint8Array, ArrayBuffer, Blob, or any ArrayBufferView).
 * @param options     - Upload options (baseUrl, compression, resume, abort, etc.).
 *
 * @example
 * ```ts
 * for await (const event of upload<MyResult>("vfs-upload", buffer)) {
 *   if (event.type === "sending")   console.log(`Client: ${event.percent}%`);
 *   if (event.type === "receiving") console.log(`Server: ${event.percent}%`);
 *   if (event.type === "complete")  console.log("Done!", event.result);
 * }
 * ```
 */
export async function* upload<T = unknown>(
	handlerName: string,
	data: BinarySource,
	options: UploadOptions = {},
): AsyncGenerator<UploadEvent<T>, void, undefined> {
	const baseUrl = options.baseUrl ?? _defaultEndpoint;
	const compression = options.compression ?? "auto";
	const chunkSize = options.chunkSize ?? 256 * 1024;
	const enableSSE = options.progress !== false;
	const uploadId = sanitizeUploadId(options.uploadId || crypto.randomUUID());

	const normalized = normalizeBinarySource(data);
	const totalBytes = getSourceSize(normalized);

	// -- Resume check -------------------------------------------------
	let offset = 0;
	if (options.uploadId) {
		try {
			const headRes = await fetch(
				`${baseUrl}${RPC_UPLOAD_PATH}/${uploadId}`,
				{ method: "HEAD", signal: options.signal },
			);
			if (headRes.ok) {
				offset = Number.parseInt(
					headRes.headers.get("x-upload-offset") || "0",
					10,
				);
			}
			// 404 => no session to resume, start fresh (offset = 0)
		} catch {
			// Network error on HEAD - start fresh
		}
	}

	// -- SSE sideband for server progress -----------------------------
	const serverProgressQueue: UploadEvent<T>[] = [];
	let eventSource: EventSource | null = null;

	if (enableSSE && typeof EventSource !== "undefined") {
		try {
			eventSource = new EventSource(
				`${baseUrl}${RPC_UPLOAD_PATH}/progress/${uploadId}`,
			);
			eventSource.onmessage = (ev) => {
				try {
					const data = JSON.parse(ev.data);
					if (data.type === "progress") {
						serverProgressQueue.push({
							type: "receiving",
							bytesReceived: data.bytesReceived,
							totalBytes: data.totalBytes,
							percent: data.percent,
						} as UploadEvent<T>);
					}
					// "complete" and "error" from SSE are informational;
					// the definitive result comes from the POST response.
				} catch { /* ignore parse errors */ }
			};
			eventSource.onerror = () => {
				// SSE failed - progress events stop but upload continues
			};
		} catch {
			// EventSource construction failed - continue without SSE
		}
	}

	// -- Build upload stream with progress tracking -------------------
	const clientProgressQueue: UploadEvent<T>[] = [];
	let bytesSent = offset;
	const sourceToUpload = sliceBinarySource(normalized, offset);
	const useBufferedBrowserUpload = shouldUseBufferedBrowserUpload();

	let requestBody: Blob | ArrayBufferBackedBytes | ReadableStream<Uint8Array>;
	let usedCompression: "gzip" | "none";

	if (useBufferedBrowserUpload) {
		const bufferedUpload = await createBufferedUploadBody(
			sourceToUpload,
			compression,
		);
		requestBody = bufferedUpload.body;
		usedCompression = bufferedUpload.usedCompression;
	} else {
		const rawStream = toReadableStream(sourceToUpload, chunkSize);
		const trackingStream = new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				controller.enqueue(chunk);
				bytesSent += chunk.byteLength;
				const percent =
					totalBytes > 0
						? Math.min(100, Math.round((bytesSent / totalBytes) * 100))
						: 0;
				clientProgressQueue.push({
					type: "sending",
					bytesSent,
					totalBytes,
					percent,
				} as UploadEvent<T>);
			},
		});

		const bodyStream = rawStream.pipeThrough(trackingStream);
		const compressedUpload = applyCompression(bodyStream, compression);
		requestBody = compressedUpload.stream;
		usedCompression = compressedUpload.usedCompression;
	}

	// -- Guard hooks --------------------------------------------------
	const reqInit: RequestInit & { duplex?: string } = {
		method: "POST",
		headers: {
			"Content-Type": "application/octet-stream",
			"X-Upload-Handler": handlerName,
			"X-Upload-Id": uploadId,
			"X-Original-Size": String(totalBytes),
			"X-Upload-Offset": String(offset),
			...(usedCompression === "gzip" ? { "Content-Encoding": "gzip" } : {}),
			...(customHeaders || {}),
			...(options.headers || {}),
		},
		body: requestBody as BodyInit,
		signal: options.signal,
	};

	if (!useBufferedBrowserUpload) {
		reqInit.duplex = "half";
	}

	for (const guardHook of hooks.filter((h) => h.phase === "guard")) {
		const allowed = await guardHook.fn(
			"__upload__",
			handlerName,
			[totalBytes],
			reqInit,
		);
		if (!allowed) {
			eventSource?.close();
			throw new Error(
				`Upload to "${handlerName}" was blocked by a guard`,
			);
		}
	}

	// -- Dispatch fetch + yield progress ------------------------------
	let fetchDone = false;
	let fetchResponse: Response | undefined;
	let fetchError: Error | undefined;

	const fetchPromise = fetch(`${baseUrl}${RPC_UPLOAD_PATH}`, reqInit)
		.then((res) => {
			fetchResponse = res;
		})
		.catch((err) => {
			fetchError = err;
		})
		.finally(() => {
			fetchDone = true;
		});

	// Yield progress events while the upload is in flight.
	while (!fetchDone) {
		// Drain queued progress events
		while (clientProgressQueue.length > 0) {
			yield clientProgressQueue.shift()!;
		}
		while (serverProgressQueue.length > 0) {
			yield serverProgressQueue.shift()!;
		}

		// Small sleep to avoid busy-waiting, then race with the fetch.
		await Promise.race([
			fetchPromise,
			new Promise<void>((r) => setTimeout(r, 50)),
		]);
	}

	// Drain remaining events after fetch completes
	while (clientProgressQueue.length > 0) {
		yield clientProgressQueue.shift()!;
	}
	while (serverProgressQueue.length > 0) {
		yield serverProgressQueue.shift()!;
	}

	// Close SSE
	eventSource?.close();

	if (fetchError) {
		throw fetchError;
	}

	if (!fetchResponse) {
		throw new Error("Upload fetch returned no response");
	}

	if (useBufferedBrowserUpload) {
		yield {
			type: "sending",
			bytesSent: totalBytes,
			totalBytes,
			percent: totalBytes > 0 ? 100 : 0,
		} as UploadEvent<T>;
	}

	// -- Response hooks -----------------------------------------------
	for (const responseHook of hooks.filter(
		(h: ClientHook) => h.phase === "response",
	)) {
		await responseHook.fn(
			"__upload__",
			handlerName,
			[totalBytes],
			reqInit,
			fetchResponse,
		);
	}

	if (!fetchResponse.ok) {
		const body = await fetchResponse.text();
		throw Object.assign(
			new Error(
				`Upload failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
			),
			{
				status: fetchResponse.status,
				body,
				handler: handlerName,
			},
		);
	}

	// -- Parse NDJSON response ----------------------------------------
	const responseText = await fetchResponse.text();
	const lines = responseText.split("\n").filter(Boolean);

	let receivedFrame: any = null;
	let resultFrame: any = null;

	for (const line of lines) {
		const frame = DSON.parse(line);
		if (frame.type === "received") {
			receivedFrame = frame;
		} else if (frame.type === "result") {
			resultFrame = frame;
		} else if (frame.type === "error") {
			throw new Error(frame.error?.message || "Upload handler error");
		}
	}

	if (!receivedFrame) {
		throw new Error("Upload response missing 'received' frame");
	}

	// -- Result hooks -------------------------------------------------
	const resultValue = resultFrame?.value as T;

	for (const resultHook of hooks.filter(
		(h: ClientHook) => h.phase === "result",
	)) {
		await resultHook.fn(
			"__upload__",
			handlerName,
			[totalBytes],
			reqInit,
			fetchResponse,
			resultValue,
		);
	}

	// yield final complete event
	yield {
		type: "complete",
		result: resultValue,
		uploadId: receivedFrame.uploadId,
		bytesReceived: receivedFrame.bytesReceived,
		sha256: receivedFrame.sha256,
		md5: receivedFrame.md5,
		durationMs: receivedFrame.durationMs,
	} as UploadEvent<T>;
}


/**
 * Upload binary data and return only the final result (no progress events).
 *
 * This is a convenience wrapper around `upload()` for fire-and-forget uploads
 * where progress tracking is not needed.
 *
 * @typeParam T - The return type of the server-side upload handler.
 * @param handlerName - The name passed to `addUploadHandler()` on the server.
 * @param data        - Binary payload.
 * @param options     - Upload options.
 * @returns The handler's return value along with hashes and upload stats.
 *
 * @example
 * ```ts
 * const result = await uploadComplete<{ files: string[] }>("vfs-upload", buffer);
 * console.log(result.sha256, result.result.files);
 * ```
 */
export async function uploadComplete<T = unknown>(
	handlerName: string,
	data: BinarySource,
	options: UploadOptions = {},
): Promise<UploadResult<T>> {
	let result: UploadResult<T> | undefined;
	for await (const event of upload<T>(handlerName, data, {
		...options,
		progress: false, // skip SSE for one-shot
	})) {
		if (event.type === "complete") {
			result = {
				result: event.result,
				uploadId: event.uploadId,
				bytesReceived: event.bytesReceived,
				sha256: event.sha256,
				md5: event.md5,
				durationMs: event.durationMs,
			};
		}
	}
	if (!result) {
		throw new Error("Upload completed without a result event");
	}
	return result;
}
