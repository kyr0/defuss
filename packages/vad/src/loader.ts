import type { TenVADModule, TenVADModuleOptions } from "../models/tenvad/ten_vad.d.ts";

export type VADRuntime = "auto" | "node" | "web";
export type ForcedVADRuntime = Exclude<VADRuntime, "auto">;

/**
 * Add getValue / UTF8ToString polyfills that ten-vad's Emscripten build
 * sometimes omits from the exported module.
 */
function addHelpers(m: TenVADModule): void {
	if (!m.getValue) {
		m.getValue = (ptr: number, type: string) => {
			switch (type) {
				case "i32":
					return m.HEAP32[ptr >> 2]!;
				case "float":
					return m.HEAPF32[ptr >> 2]!;
				case "i16":
					return m.HEAP16[ptr >> 1]!;
				default:
					throw new Error(`Unsupported getValue type: ${type}`);
			}
		};
	}

	if (!m.UTF8ToString) {
		m.UTF8ToString = (ptr: number) => {
			if (!ptr) return "";
			let end = ptr;
			while (m.HEAPU8[end]) end++;
			return new TextDecoder("utf-8").decode(m.HEAPU8.subarray(ptr, end));
		};
	}
}

/** Detect whether we're running in Node.js (not browser / worker). */
function isNode(): boolean {
	return (
		typeof process !== "undefined" &&
		process.versions != null &&
		process.versions.node != null
	);
}

function useNodeRuntime(runtime: VADRuntime): boolean {
	if (runtime === "node") return true;
	if (runtime === "web") return false;
	return isNode();
}

/**
 * Load the ten-vad WASM module isomorphically.
 *
 * - **Browser**: dynamic-imports the vendored `ten_vad.js` which auto-fetches
 *   the .wasm via relative URL (or uses the provided `wasmBinary`).
 * - **Node.js**: reads the .wasm binary from disk with `fs.readFile` and passes
 *   it as `wasmBinary`, avoiding the `fetch(file://...)` limitation.
 */
export async function loadVADModule(opts?: {
	wasmBinary?: ArrayBuffer | Uint8Array;
	locateFile?: (path: string, prefix: string) => string;
	runtime?: ForcedVADRuntime;
}): Promise<TenVADModule> {
	const runtime = opts?.runtime ?? "auto";
	const moduleOpts: TenVADModuleOptions = {
		noInitialRun: false,
		noExitRuntime: true,
	};

	if (opts?.wasmBinary) {
		moduleOpts.wasmBinary = opts.wasmBinary;
	}

	if (opts?.locateFile) {
		moduleOpts.locateFile = opts.locateFile;
	}

	if (useNodeRuntime(runtime)) {
		// Node.js path: read .wasm from disk if no binary provided
		if (!moduleOpts.wasmBinary) {
			const { readFile } = await import("node:fs/promises");
			const { fileURLToPath } = await import("node:url");
			const { dirname, join } = await import("node:path");

			const thisDir = dirname(fileURLToPath(import.meta.url));
			// Resolve relative to this file => ../models/tenvad/ten_vad.wasm
			const wasmPath = join(thisDir, "..", "models", "tenvad", "ten_vad.wasm");
			const buf = await readFile(wasmPath);
			moduleOpts.wasmBinary = buf.buffer.slice(
				buf.byteOffset,
				buf.byteOffset + buf.byteLength,
			);
		}

		const mod = await import("../models/tenvad/ten_vad.js");
		const createVADModule = mod.default;

		const m: TenVADModule = await createVADModule(moduleOpts);
		addHelpers(m);
		return m;
	}

	if (!moduleOpts.locateFile) {
		const wasmUrl = new URL("../models/tenvad/ten_vad.wasm", import.meta.url).href;
		moduleOpts.locateFile = (path: string, _prefix: string) => {
			if (path.endsWith(".wasm")) return wasmUrl;
			return path;
		};
	}

	const mod = await import("../models/tenvad/ten_vad.js");
	const createVADModule = mod.default;

	const m: TenVADModule = await createVADModule(moduleOpts);
	addHelpers(m);
	return m;
}
