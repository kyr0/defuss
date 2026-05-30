/**
 * Main module for defuss-tlsbot.
 *
 * Assembles builtin plugins, creates the bot instance, and provides
 * the CLI command dispatcher via {@link main}.
 *
 * @module
 */

import path from "node:path";
import {
  createRuntimeContext,
  createTlsCertBot,
  defaultEntryFile,
  flagBoolean,
  flagString,
  parseArgs,
  resolveTarget,
  issueSelfSignedFallback,
  type ParsedArgs,
  type RuntimeContext,
} from "./core.js";
import { cloudflarePlugin } from "./providers/cloudflare.js";
import { hetznerPlugin } from "./providers/hetzner.js";
import { internalPlugin } from "./providers/internal.js";
import { netcupPlugin } from "./providers/netcup.js";
import { scalewayPlugin } from "./providers/scaleway.js";

export { hetznerPlugin, cloudflarePlugin, netcupPlugin, scalewayPlugin, internalPlugin };

/** All built-in DNS provider plugins, in default execution order. */
export const builtinPlugins = [
  hetznerPlugin(),
  cloudflarePlugin(),
  netcupPlugin(),
  scalewayPlugin(),
  internalPlugin(),
];

/** Pre-configured bot instance with all built-in plugins. */
export const bot = createTlsCertBot(builtinPlugins);

const defaultConfigPath = (): string => path.resolve(process.cwd(), "defuss-tlsbot.config.ts");

const pluginNames = (): string[] => bot.plugins.map((plugin) => plugin.name);

const usage = () => `
defuss-tlsbot — TLS certificate bot with DNS-01 ACME via certbot.

Commands:
  issue      [--config PATH] [--target NAME] [--plugins p1,p2] [--dry-run]
  list       [--config PATH]
  fallback   [--config PATH] [--target NAME]
  <plugin> issue        [--config PATH] [--target NAME] [--dry-run]
  <plugin> auth-hook    [--config PATH] [--target NAME]
  <plugin> cleanup-hook [--config PATH] [--target NAME]
  <plugin> present      --domain DOMAIN --value TOKEN [--zone ZONE] [--config PATH] [--target NAME]
  <plugin> cleanup      --domain DOMAIN --value TOKEN [--zone ZONE] [--config PATH] [--target NAME]

Plugins:
  ${pluginNames().join(", ")}

Examples:
  npx defuss-tlsbot issue --config ./defuss-tlsbot.config.ts --target prod-example
  npx defuss-tlsbot list --config ./defuss-tlsbot.config.ts
  npx defuss-tlsbot --help
`.trim();

const runtimeForParsed = async (parsed: ParsedArgs): Promise<RuntimeContext> => {
  const configPath = flagString(parsed, "config") ?? defaultConfigPath();
  const targetName = flagString(parsed, "target");
  const dryRun = flagBoolean(parsed, "dry-run");
  return createRuntimeContext({
    configPath,
    targetName,
    dryRun,
    entryFile: defaultEntryFile(),
  });
};

const listCommand = async (parsed: ParsedArgs): Promise<number> => {
  const runtime = await runtimeForParsed(parsed);
  const config = runtime.config;
  const resolvedTarget = flagString(parsed, "target")
    ? resolveTarget(config, flagString(parsed, "target"))
    : config.targets[0]!;

  console.log(JSON.stringify({
    plugins: bot.plugins.map((plugin) => ({
      name: plugin.name,
      description: plugin.description,
    })),
    targets: config.targets.map((target) => ({
      name: target.name,
      domains: target.domains,
      zone: target.zone,
      outputDir: target.outputDir,
      pluginOrder: target.pluginOrder ?? config.pluginOrder ?? [],
    })),
    selectedTarget: {
      name: resolvedTarget.name,
      domains: resolvedTarget.domains,
      zone: resolvedTarget.zone,
      outputDir: resolvedTarget.outputDir,
    },
  }, null, 2));
  return 0;
};

const issueCommand = async (parsed: ParsedArgs): Promise<number> => {
  const runtime = await runtimeForParsed(parsed);
  const pluginOrder = flagString(parsed, "plugins")?.split(",").map((value) => value.trim()).filter(Boolean);
  const result = await bot.issue(runtime, pluginOrder);
  console.log(JSON.stringify(result, null, 2));
  return 0;
};

const fallbackCommand = async (parsed: ParsedArgs): Promise<number> => {
  const runtime = await runtimeForParsed(parsed);
  const result = await issueSelfSignedFallback(runtime, "Fallback command invoked explicitly.");
  console.log(JSON.stringify(result, null, 2));
  return 0;
};

const pluginCommand = async (pluginName: string, parsed: ParsedArgs): Promise<number> => {
  const runtime = await runtimeForParsed(parsed);
  const subcommand = parsed.positionals[1];
  if (!subcommand) {
    throw new Error(`Missing subcommand for plugin ${pluginName}.`);
  }

  const result = await bot.runPluginCommand(pluginName, subcommand, {
    runtime,
    parsed,
    subcommand,
  });
  return result;
};

/**
 * CLI entry point. Parses `argv` and dispatches to the appropriate command.
 *
 * @param argv - CLI arguments (defaults to `process.argv.slice(2)`).
 * @returns Exit code (0 = success).
 */
export const main = async (argv = process.argv.slice(2)): Promise<number> => {
  const parsed = parseArgs(argv);
  const command = parsed.positionals[0];

  if (!command || command === "help" || command === "--help") {
    console.log(usage());
    return 0;
  }

  if (command === "list") {
    return listCommand(parsed);
  }

  if (command === "issue") {
    return issueCommand(parsed);
  }

  if (command === "fallback") {
    return fallbackCommand(parsed);
  }

  if (pluginNames().includes(command)) {
    return pluginCommand(command, parsed);
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
};
