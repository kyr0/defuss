import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync("public/wasm_rust")) {
  // create src/.gen folder
  mkdirSync("public/wasm_rust", { recursive: true });
}

// Command to compile the Rust code with wasm-pack
const result = spawnSync(
  "wasm-pack",
  ["build", "--target", "web", "--out-dir", "./public/wasm_rust"],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Error executing wasm-pack:", result.error);
} else {
  console.log("wasm-pack command executed successfully");
}
