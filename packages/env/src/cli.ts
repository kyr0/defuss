// defuss-env.ts (ESM CLI)
// Usage:
//   bunx defuss-env               -> parse and print ./.env
//   bunx defuss-env path/to/file  -> parse and print the given .env file

import { load as loadEnv } from "./env.js";
import { resolve } from "node:path";

/** Print a parsed EnvMap to stdout. */
function printEnvMap(env: Record<string, string>, filePath: string): void {
  const keys = Object.keys(env).sort();
  console.log(
    `Read ${keys.length} entr${keys.length === 1 ? "y" : "ies"} from ${filePath}:`,
  );
  for (const k of keys) {
    console.log(`${k}=${env[k]}`);
  }
}

function printUsage(): void {
  console.error(`Usage:
  bunx defuss-env             # parse and print ./.env
  bunx defuss-env <path>      # parse and print the given .env file
`);
}

async function main() {
  const fileArg = process.argv[2] ?? ".env";
  const envPath = resolve(process.cwd(), fileArg);

  try {
    // parse only; do not inject, do not override
    const env = loadEnv(envPath, false, false);
    printEnvMap(env, fileArg);
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Error reading ${fileArg}: ${msg}`);
    printUsage();
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
