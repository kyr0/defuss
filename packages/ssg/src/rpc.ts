import esbuild from "esbuild";
import { join, resolve } from "node:path";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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
 * Compile the RPC module source file with esbuild into the `.rpc/` directory.
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
  const outDir = join(projectDir, ".rpc");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  if (debug) {
    console.log(`Compiling RPC module: ${rpcFilePath}`);
  }

  console.time("[rpc] esbuild-compile");
  await esbuild.build({
    entryPoints: [rpcFilePath],
    format: "esm",
    bundle: true,
    platform: "node",
    target: ["esnext"],
    outdir: outDir,
    outExtension: { ".js": ".mjs" },
    // Mark defuss-rpc as external so it uses the installed version
    external: ["defuss-rpc", "defuss-rpc/*"],
  });
  console.timeEnd("[rpc] esbuild-compile");

  const compiledPath = join(outDir, "rpc.mjs");
  if (debug) {
    console.log(`RPC module compiled to: ${compiledPath}`);
  }
  return compiledPath;
};

/**
 * Dynamically import a compiled RPC module.
 * Uses a base64 data URL to bust Node's import cache.
 */
const loadRpcModule = async (
  compiledPath: string,
): Promise<Record<string, unknown>> => {
  const code = await readFile(compiledPath, "utf-8");
  const tmpFile = join(tmpdir(), `defuss-rpc-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(tmpFile, code, "utf-8");
  try {
    return await import(tmpFile);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
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
    clearRpcServer: () => void;
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
    const moduleExports = await loadRpcModule(compiledPath);
    const namespace = buildRpcNamespace(moduleExports);

    if (Object.keys(namespace).length === 0) {
      console.warn(
        "[defuss-ssg] rpc.ts was found but exports no RPC namespace entries",
      );
      return false;
    }

    // Clear any previously registered RPC server (for hot reload)
    rpcServer.clearRpcServer();
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

// Cached reference to the rpcRoute handler — resolved once, reused on every request
let _cachedRpcRoute: ((ctx: { request: Request }) => Promise<Response>) | null = null;

const getRpcRoute = async () => {
  if (_cachedRpcRoute) return _cachedRpcRoute;
  // @ts-expect-error defuss-rpc is an optional peer dependency
  const { rpcRoute } = await import("defuss-rpc/server.js");
  _cachedRpcRoute = rpcRoute;
  return rpcRoute;
};

/**
 * Handle an RPC request by forwarding to defuss-rpc's rpcRoute handler.
 * Receives an Elysia context and returns a Web Response.
 *
 * Elysia consumes the request body during parsing, so we reconstruct a
 * fresh Request with the body re-serialised from Elysia's `body` property.
 *
 * @param ctx Elysia context containing the parsed body and original request
 */
export const handleRpcRequest = async (ctx: { request: Request; body: unknown }): Promise<Response> => {
  try {
    const rpcRoute = await getRpcRoute();

    // Reconstruct a fresh Request so rpcRoute can call request.json()
    const bodyStr = JSON.stringify(ctx.body);
    const freshRequest = new Request(ctx.request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bodyStr,
    });

    return await rpcRoute({ request: freshRequest } as any);
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
