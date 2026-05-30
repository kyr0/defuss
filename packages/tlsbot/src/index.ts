/**
 * defuss-tlsbot — Zero-dependency TypeScript TLS certificate bot.
 *
 * Delegates ACME to certbot, manages DNS challenge lifecycle via provider plugins,
 * and falls back to self-signed certificates when public trust is unavailable.
 *
 * @example
 * ```ts
 * import { createTlsCertBot, defineConfig, definePlugin, builtinPlugins } from "defuss-tlsbot";
 *
 * const bot = createTlsCertBot(builtinPlugins);
 * ```
 *
 * @module
 */

export {
  // Config
  defineConfig,
  definePlugin,
  loadConfig,
  resolveTarget,
  createRuntimeContext,

  // Bot factory
  createTlsCertBot,

  // Certbot integration
  issueWithCertbotDns,
  issueSelfSignedFallback,
  issueWithPlugins,
  persistIssuedCertificate,
  runPluginCommand,

  // CLI argument parsing
  parseArgs,
  flagString,
  flagBoolean,

  // DNS utilities
  waitForDnsTxt,
  acmeRecordFqdn,
  relativeRecordName,
  makeChallengeFromCertbotEnv,
  hasSiblingIdentifierForSameRecord,
  stripWildcard,

  // Provider config helpers
  getProviderConfig,
  secretFromConfig,

  // Filesystem utilities
  ensureDir,
  fileExists,
  writeJson,
  copyFileResolved,

  // HTTP utility
  httpJson,

  // Shell utilities
  shellQuote,
  sanitizeCertName,
  runCommandStreaming,
  sleep,

  // Certbot directory helpers
  certbotStateDir,
  certbotConfigDir,
  certbotWorkDir,
  certbotLogsDir,
  certNameForTarget,

  // Server URL resolution
  resolveServerUrl,
  inferRuntimeCommand,
  defaultEntryFile,

  // Constants
  LETS_ENCRYPT_STAGING_DIRECTORY,
} from "./core.js";

export type {
  JsonObject,
  MaybePromise,
  TargetConfig,
  TlsCertBotConfig,
  IssueResult,
  RuntimeContext,
  Challenge,
  ParsedArgs,
  PluginCommandContext,
  TlsCertBotPlugin,
} from "./core.js";

export { hetznerPlugin } from "./providers/hetzner.js";
export { cloudflarePlugin } from "./providers/cloudflare.js";
export { netcupPlugin } from "./providers/netcup.js";
export { scalewayPlugin } from "./providers/scaleway.js";
export { internalPlugin } from "./providers/internal.js";

export { builtinPlugins, bot } from "./tls-cert-bot.js";
