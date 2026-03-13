import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const run = (command: string, cwd: string = root) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
};

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Install Rust via rustup if not present
if (!commandExists("rustup")) {
  console.log("Rust not found. Installing via rustup…");
  run("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y");
  // Source cargo env for the current process
  const cargoEnv = join(process.env.HOME ?? "~", ".cargo", "env");
  console.log(`Source cargo env: . "${cargoEnv}"`);
}

run("rustup show active-toolchain");
run("rustup target add wasm32-unknown-unknown");

// Install wasm-pack if not present
if (!commandExists("wasm-pack")) {
  console.log("Installing wasm-pack…");
  run("curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh");
} else {
  console.log("\n✔ wasm-pack already installed");
}

// Optional: check for wasm-opt
if (!commandExists("wasm-opt")) {
  console.log("\nℹ wasm-opt not found (optional). Install binaryen for smaller WASM output.");
}

console.log("\n✔ Setup complete — run `bun run build` next.");
