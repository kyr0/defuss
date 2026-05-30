#!/usr/bin/env node

/**
 * CLI entry point for defuss-tlsbot.
 *
 * Usage:
 *   npx defuss-tlsbot issue --config ./defuss-tlsbot.config.ts --target prod-example
 *   npx defuss-tlsbot list --config ./defuss-tlsbot.config.ts
 *   npx defuss-tlsbot --help
 *
 * @module
 */

import { main } from "./tls-cert-bot.js";

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
