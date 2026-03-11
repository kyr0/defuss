import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));

const run = (command: string) => {
  execSync(command, {
    cwd: pkgRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PKG_VERSION: pkg.version,
    },
  });
};

run("wasm-pack build --release --target bundler --out-dir wasm/pkg .");

// Bundle with bun — mark wasm pkg as external so it's not inlined
run("bun build src/index.ts --outdir dist --format esm --external ../wasm/pkg/* --sourcemap=external");

// Generate .d.ts declarations
run("bunx tsc --project tsconfig.build.json");
