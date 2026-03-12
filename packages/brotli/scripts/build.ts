import { existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const run = (command: string, cwd: string = root) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
};

const hasCommand = (command: string): boolean => {
  try {
    execSync(`${command} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

// Clean previous output
rmSync(join(root, "dist"), { recursive: true, force: true });
rmSync(join(root, "wasm", "pkg"), { recursive: true, force: true });

// Build compressor WASM
run(
  "wasm-pack build --release --target bundler --out-dir ../../wasm/pkg/compressor .",
  join(root, "rust", "compressor"),
);

// Build decompressor WASM
run(
  "wasm-pack build --release --target bundler --out-dir ../../wasm/pkg/decompressor .",
  join(root, "rust", "decompressor"),
);

// Optimize WASM with wasm-opt if available
if (hasCommand("wasm-opt")) {
  const wasmFiles = [
    join(root, "wasm", "pkg", "compressor", "defuss_brotli_compressor_bg.wasm"),
    join(root, "wasm", "pkg", "decompressor", "defuss_brotli_decompressor_bg.wasm"),
  ];
  for (const wasmFile of wasmFiles) {
    if (existsSync(wasmFile)) {
      run(`wasm-opt -Oz -o ${wasmFile} ${wasmFile}`);
    }
  }
}

// Bundle TS → dist/ (externalize wasm-pack generated JS so WASM stays in wasm/pkg/)
run("bun build src/compressor.ts src/decompressor.ts --outdir dist --format esm --sourcemap=external --target=browser --external '../wasm/*'");

// Generate .d.ts declarations
run("bunx tsc --project tsconfig.build.json");
