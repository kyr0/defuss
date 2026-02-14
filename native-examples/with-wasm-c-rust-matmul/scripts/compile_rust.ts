import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync("src/.gen/wasm_rust")) {
  // create src/.gen folder
  mkdirSync("src/.gen/wasm_rust", { recursive: true });
}

// Command to compile the Rust code with wasm-pack
const result = spawnSync(
  "wasm-pack",
  ["build", "--target", "web", "--out-dir", "./src/.gen/wasm_rust"],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Error executing wasm-pack:", result.error);
} else {
  console.log("wasm-pack command executed successfully");
}
