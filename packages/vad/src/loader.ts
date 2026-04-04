import type { TenVADModule, TenVADModuleOptions } from "../wasm/ten_vad.d.ts";

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
}): Promise<TenVADModule> {
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

  if (isNode()) {
    // Node.js path: read .wasm from disk if no binary provided
    if (!moduleOpts.wasmBinary) {
      const { readFile } = await import("node:fs/promises");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");

      const thisDir = dirname(fileURLToPath(import.meta.url));
      // Resolve relative to this file => ../wasm/ten_vad.wasm
      const wasmPath = join(thisDir, "..", "wasm", "ten_vad.wasm");
      const buf = await readFile(wasmPath);
      moduleOpts.wasmBinary = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      );
    }

    // Dynamic import of the JS glue module
    const { readFile: readFileStr } = await import("node:fs/promises");
    const { fileURLToPath: fu2p } = await import("node:url");
    const { dirname: dn, join: jn } = await import("node:path");

    const dir = dn(fu2p(import.meta.url));
    const jsPath = jn(dir, "..", "wasm", "ten_vad.js");

    // The ten_vad.js uses import.meta.url internally. We need to patch it
    // for Node.js consumption so it can resolve the .wasm path correctly.
    const jsContent = await readFileStr(jsPath, "utf-8");
    const { pathToFileURL } = await import("node:url");
    const jsFileUrl = pathToFileURL(jsPath).href;
    const patched = jsContent.replace(/import\.meta\.url/g, `"${jsFileUrl}"`);

    // Write to a temp data URL and import it
    const blob = `data:text/javascript;base64,${Buffer.from(patched).toString("base64")}`;
    const mod = await import(/* @vite-ignore */ blob);
    const createVADModule = mod.default;

    const m: TenVADModule = await createVADModule(moduleOpts);
    addHelpers(m);
    return m;
  }

  // Browser path: dynamic import of the vendored JS glue
  // Use a URL relative to this module for the WASM file
  const jsUrl = new URL("../wasm/ten_vad.js", import.meta.url).href;

  if (!moduleOpts.locateFile) {
    const wasmUrl = new URL("../wasm/ten_vad.wasm", import.meta.url).href;
    moduleOpts.locateFile = (path: string, _prefix: string) => {
      if (path.endsWith(".wasm")) return wasmUrl;
      return path;
    };
  }

  const mod = await import(/* @vite-ignore */ jsUrl);
  const createVADModule = mod.default;

  const m: TenVADModule = await createVADModule(moduleOpts);
  addHelpers(m);
  return m;
}
