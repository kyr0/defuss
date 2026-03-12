import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const run = (command: string, cwd: string = root) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
};

run("rustup show active-toolchain");
run("rustup target add wasm32-unknown-unknown");
run("cargo install wasm-pack");
console.log("\n✔ Setup complete — run `bun run build` next.");
