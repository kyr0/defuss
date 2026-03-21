import { execSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const exampleDir = __dirname;
const cli = resolve(packageRoot, "dist", "cli.mjs");
const readmeSrc = resolve(packageRoot, "README.md");
const readmeDst = resolve(exampleDir, "README.md");

// 1. Remove existing README.md if present, then copy fresh from package root
if (existsSync(readmeDst)) {
  unlinkSync(readmeDst);
}
console.log("Copying README.md into example/ ...");
copyFileSync(readmeSrc, readmeDst);
console.log("Done.\n");

// 2. Run aslopcleaner with -y to auto-fix all slop
console.log("Running: node dist/cli.mjs -y");
execSync(`node ${cli} -y`, { cwd: exampleDir, stdio: "inherit" });
console.log("\nFirst run complete.\n");

// 3. Run aslopcleaner again without -y - should exit 0 quickly (no slop left)
console.log("Running: node dist/cli.mjs (verify no slop remains)");
const TIMEOUT_MS = 150;

const child = spawn("node", [cli], {
  cwd: exampleDir,
  stdio: "inherit",
});

const timer = setTimeout(() => {
  child.kill();
  console.error(
    `\nERROR: Process did not exit within ${TIMEOUT_MS}ms - slop may still remain.`,
  );
  process.exit(1);
}, TIMEOUT_MS);

child.on("close", (code) => {
  clearTimeout(timer);
  if (code === 0) {
    console.log("\nVerification passed: no slop found, exited with code 0.");
    process.exit(0);
  } else {
    console.error(`\nERROR: Process exited with code ${code}.`);
    process.exit(1);
  }
});
