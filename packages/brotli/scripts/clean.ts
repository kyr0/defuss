import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

for (const rel of ["dist", "wasm/pkg", "coverage", "node_modules/.vite"]) {
  rmSync(join(root, rel), { recursive: true, force: true });
}
