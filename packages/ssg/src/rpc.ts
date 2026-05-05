import { join, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { build as rolldownBuild } from "rolldown";
import type { SsgConfig } from "./types.js";

/**
 * Discover the RPC file in the project root.
 * Looks for `rpc.ts` or `rpc.js`.
 *
 * @param projectDir The project root directory
 * @returns The absolute path to the RPC file, or null if not found
 */
export const discoverRpcFile = (projectDir: string): string | null => {
	const candidates = ["rpc.ts", "rpc.js"];
	for (const candidate of candidates) {
		const filePath = join(projectDir, candidate);
		if (existsSync(filePath)) {
			return filePath;
		}
	}
	return null;
};

/**
 * Compile the RPC module source file with Rolldown into the `.rpc/` directory.
 *
 * @param rpcFilePath Absolute path to the rpc.ts / rpc.js source file
 * @param projectDir The project root directory
 * @param debug Enable verbose logging
 * @returns Absolute path to the compiled .mjs file
 */
export const compileRpcModule = async (
	rpcFilePath: string,
	projectDir: string,
	debug = false,
): Promise<string> => {
	const resolvedProjectDir = resolve(projectDir);
	const resolvedRpcFilePath = resolve(rpcFilePath);
	const outDir = join(resolvedProjectDir, ".rpc");
	const tsconfigPath = join(resolvedProjectDir, "tsconfig.json");
	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	if (debug) {
		console.log(`Compiling RPC module: ${resolvedRpcFilePath}`);
	}

	const compileLabel = "[rpc] rolldown-compile";
	console.time(compileLabel);
	try {
		await rolldownBuild({
			input: resolvedRpcFilePath,
			cwd: resolvedProjectDir,
			platform: "node",
			tsconfig: existsSync(tsconfigPath) ? tsconfigPath : false,
			// Mark defuss-rpc as external so it uses the installed version.
			external: ["defuss-rpc", /^defuss-rpc(?:\/.*)?$/],
			output: {
				dir: outDir,
				format: "esm",
				entryFileNames: "rpc.mjs",
				chunkFileNames: "chunks/[name]-[hash].mjs",
				sourcemap: false,
			},
		});
	} finally {
		console.timeEnd(compileLabel);
	}

	const compiledPath = join(outDir, "rpc.mjs");
	if (debug) {
		console.log(`RPC module compiled to: ${compiledPath}`);
	}
	return compiledPath;
};

/**
 * Dynamically import a compiled RPC module.
 * Uses a cache-busting file URL while keeping the compiled module in-place so
 * bare imports continue resolving against the project directory.
 */
const loadRpcModule = async (
	compiledPath: string,
): Promise<Record<string, unknown>> => {
	const compiledUrl = pathToFileURL(compiledPath);
	compiledUrl.searchParams.set(
		"t",
		`${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	return await import(compiledUrl.href);
};

/**
 * Builds the RPC namespace from the loaded module's exports.
 *
 * - `default` export: if it's an object, each key becomes a namespace entry
 * - Named exports: each becomes a namespace entry (except `default`)
 *
 * @param moduleExports The dynamically imported module
 * @returns An ApiNamespace-compatible record
 */
const buildRpcNamespace = (
	moduleExports: Record<string, unknown>,
): Record<string, unknown> => {
	const namespace: Record<string, unknown> = {};

	// Process default export: spread its entries as top-level namespaces
	if (moduleExports.default && typeof moduleExports.default === "object") {
		const defaultObj = moduleExports.default as Record<string, unknown>;
		for (const [key, value] of Object.entries(defaultObj)) {
			if (value && (typeof value === "object" || typeof value === "function")) {
				namespace[key] = value;
			}
		}
	}

	// Process named exports as additional namespaces
	for (const [key, value] of Object.entries(moduleExports)) {
		if (key === "default") continue;
		// Skip type-only exports (interfaces, types won't appear at runtime)
		if (value && (typeof value === "object" || typeof value === "function")) {
			namespace[key] = value;
		}
	}

	return namespace;
};

/**
 * Initialize the RPC server from the project's rpc.ts/rpc.js file.
 *
 * This function discovers, compiles, loads, and registers the RPC module.
 * It dynamically imports `defuss-rpc/server.js` to avoid a hard dependency.
 *
 * @param projectDir The project root directory
 * @param config The SSG config
 * @param debug Enable verbose logging
 * @returns true if RPC was set up successfully, false if no rpc.ts found or defuss-rpc not installed
 */
export const initializeRpc = async (
	projectDir: string,
	config: SsgConfig,
	debug = false,
): Promise<boolean> => {
	// Check if RPC is disabled in config
	if (config.rpc === false) {
		if (debug) {
			console.log("RPC disabled in config");
		}
		return false;
	}

	// Determine the RPC file path
	let rpcFilePath: string | null = null;
	if (typeof config.rpc === "string") {
		const customPath = resolve(projectDir, config.rpc);
		if (existsSync(customPath)) {
			rpcFilePath = customPath;
		}
	} else {
		rpcFilePath = discoverRpcFile(projectDir);
	}

	if (!rpcFilePath) {
		if (debug) {
			console.log("No rpc.ts/rpc.js found in project root");
		}
		return false;
	}

	// Try to import defuss-rpc
	let rpcServer: {
		createRpcServer: (ns: Record<string, unknown>) => void;
		clearRpcServer: () => void | Promise<void>;
	};
	try {
		// @ts-expect-error defuss-rpc is an optional peer dependency
		rpcServer = await import("defuss-rpc/server.js");
	} catch {
		console.warn(
			"[defuss-ssg] defuss-rpc is not installed. Install it to enable RPC support:\n" +
			"  npm install defuss-rpc",
		);
		return false;
	}

	// Compile and load the module
	try {
		const compiledPath = await compileRpcModule(rpcFilePath, projectDir, debug);

		// Clear previous RPC state before importing the module so side-effect
		// registrations such as addUploadHandler() remain active.
		await rpcServer.clearRpcServer();

		const moduleExports = await loadRpcModule(compiledPath);
		const namespace = buildRpcNamespace(moduleExports);

		if (Object.keys(namespace).length === 0) {
			console.warn(
				"[defuss-ssg] rpc.ts was found but exports no RPC namespace entries",
			);
			return false;
		}

		rpcServer.createRpcServer(namespace as any);

		console.log(
			`RPC initialized with ${Object.keys(namespace).length} namespace(s): ${Object.keys(namespace).join(", ")}`,
		);
		return true;
	} catch (error) {
		console.error("[defuss-ssg] Failed to initialize RPC:", error);
		return false;
	}
};

// Cached reference to the rpcRoute handler - resolved once, reused on every request
// Type is 'any' because defuss-rpc exports APIRoute (Astro-compatible) which has a wider context
let _cachedRpcRoute: any | null = null;

const getRpcRoute = async () => {
	if (_cachedRpcRoute) return _cachedRpcRoute;
	const { rpcRoute } = await import("defuss-rpc/server.js");
	_cachedRpcRoute = rpcRoute;
	return rpcRoute;
};

/**
 * Handle an RPC request by forwarding the original Fetch request to
 * defuss-rpc's rpcRoute handler.
 *
 * The RPC wire format is DSON, not JSON, so the request body must reach
 * rpcRoute untouched.
 *
 * @param ctx Context containing the original request
 */
export const handleRpcRequest = async (ctx: {
	request: Request;
}): Promise<Response> => {
	try {
		const rpcRoute = await getRpcRoute();
		return await rpcRoute({ request: ctx.request } as any);
	} catch (error) {
		console.error("[defuss-ssg] RPC request error:", error);
		return Response.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
};
