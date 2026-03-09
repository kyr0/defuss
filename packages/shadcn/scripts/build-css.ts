import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir} from "node:fs/promises";
import { join} from "node:path";

const execPromise = promisify(exec);

const rootDir = join(import.meta.dirname, "..");
const srcCssDir = join(rootDir, "src", "css");
const cssDistDir = join(rootDir, "dist", "css");

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function main() {
  // Build CSS package
  console.log("Building CSS package...");
  await ensureDir(cssDistDir);

  // Create Tailwind CSS builds for the CSS package
  const cdnCssSrc = join(srcCssDir, "shadcn.cdn.css");
  const cssDistCdnPath = join(cssDistDir, "shadcn.cdn.css");
  const cssDistCdnMinPath = join(cssDistDir, "shadcn.cdn.min.css");

  console.log("Generating non-minified CSS...");
  await execPromise(`bun run tailwindcss -i "${cdnCssSrc}" -o "${cssDistCdnPath}"`);
  console.log(`Generated non-minified CSS: ${cssDistCdnPath}`);

  console.log("Generating minified CSS...");
  await execPromise(`bun run tailwindcss -i "${cdnCssSrc}" -o "${cssDistCdnMinPath}" --minify`);
  console.log(`Generated minified CSS: ${cssDistCdnMinPath}`);

  console.log("CSS build finished successfully!");
}

main().catch((err) => {
  console.error("CSS build failed:", err);
  process.exit(1);
});
