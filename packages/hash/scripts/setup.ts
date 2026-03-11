import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const run = (command: string, cwd = repoRoot) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
};

// 1. Ensure the stable Rust toolchain is installed (reads rust-toolchain.toml)
run("rustup show active-toolchain");

// 2. Add wasm32 target (idempotent)
run("rustup target add wasm32-unknown-unknown");

// 3. Install wasm-pack
run("cargo install wasm-pack");

console.log("\n✔ Setup complete — you can now run: bun run build\n");
