import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resolver, resolve4, resolve6, resolveNs } from "node:dns/promises";

/** A plain JSON-serializable object. */
export type JsonObject = Record<string, unknown>;

/** A value that may be synchronous or a Promise. */
export type MaybePromise<T> = T | Promise<T>;

/** Configuration for a single certificate target (domain group). */
export type TargetConfig = {
  /** Unique name identifying this target (e.g. `"prod-example"`). */
  name: string;
  /** Domains to include in the certificate, including wildcards (e.g. `["example.com", "*.example.com"]`). */
  domains: string[];
  /** DNS zone that contains the domains (e.g. `"example.com"`). */
  zone: string;
  /** Directory where final certificate files are written. */
  outputDir: string;
  /** Override the global plugin order for this target. */
  pluginOrder?: string[];
  /** ACME account email. Falls back to `defaultEmail`. */
  email?: string | null;
  /** Custom certbot `--cert-name`. Defaults to the first domain. */
  certName?: string;
  /** ACME server: `"production"` (default), `"staging"`, or a custom directory URL. */
  server?: "production" | "staging" | string;
  /** Seconds to wait for DNS TXT propagation before giving up. */
  dnsPropagationTimeoutSeconds?: number;
  /** Seconds between DNS propagation polling attempts. */
  dnsPropagationIntervalSeconds?: number;
  /** Override certbot `--config-dir`. */
  certbotConfigDir?: string;
  /** Override certbot `--work-dir`. */
  certbotWorkDir?: string;
  /** Override certbot `--logs-dir`. */
  certbotLogsDir?: string;
  /** Path to the certbot binary. Defaults to `"certbot"`. */
  certbotBin?: string;
  /** Path to the openssl binary. Defaults to `"openssl"`. */
  opensslBin?: string;
  /** Key type for certificate generation. */
  keyType?: "rsa" | "ecdsa";
  /** RSA key size in bits (only used when `keyType` is `"rsa"`). */
  rsaBits?: number;
  /** Validity days for self-signed fallback certificates. */
  fallbackDays?: number;
  /** Per-target provider configuration keyed by plugin name. */
  providers?: Record<string, JsonObject>;
};

/** Top-level configuration for defuss-tlsbot. */
export type TlsCertBotConfig = {
  /** Default ACME account email for all targets. */
  defaultEmail?: string | null;
  /** Default ACME server for all targets. */
  defaultServer?: "production" | "staging" | string;
  /** Default plugin execution order. First successful plugin wins. */
  pluginOrder?: string[];
  /** Path to the certbot binary (global default). */
  certbotBin?: string;
  /** Path to the openssl binary (global default). */
  opensslBin?: string;
  /** Shell command to invoke the CLI entry point for certbot hooks. Auto-detected if omitted. */
  runtimeCommand?: string;
  /** Directory for certbot state files. Defaults to `outputDir/.bot-state`. */
  stateDir?: string;
  /** Certificate targets to manage. At least one is required. */
  targets: TargetConfig[];
  /** Global provider configuration keyed by plugin name. Merged with per-target overrides. */
  providers?: Record<string, JsonObject>;
};

/** Result of a successful certificate issuance. */
export type IssueResult = {
  ok: true;
  /** Name of the plugin that produced the certificate. */
  plugin: string;
  /** Whether the certificate is ACME-issued or a self-signed fallback. */
  kind: "acme" | "fallback";
  /** Directory containing the certificate files. */
  outputDir: string;
  /** Path to the fullchain certificate file. */
  certPath: string;
  /** Path to the private key file. */
  keyPath: string;
  /** Certbot certificate name. */
  certName: string;
  /** Human-readable status messages. */
  details?: string[];
};

/** Runtime context passed to plugins during certificate operations. */
export type RuntimeContext = {
  /** The full parsed configuration. */
  config: TlsCertBotConfig;
  /** The resolved target configuration. */
  target: TargetConfig;
  /** Name of the current target. */
  targetName: string;
  /** Absolute path to the config file. */
  configPath: string;
  /** Absolute path to the CLI entry file (used for certbot hook commands). */
  entryFile: string;
  /** When true, certbot runs against the staging server with `--dry-run`. */
  dryRun?: boolean;
  /** Process environment variables. */
  env: NodeJS.ProcessEnv;
};

/** ACME DNS-01 challenge details passed to plugin hooks. */
export type Challenge = {
  /** DNS zone containing the challenge record. */
  zone: string;
  /** The domain being validated (may include wildcard prefix). */
  domain: string;
  /** Relative record name within the zone (e.g. `"_acme-challenge"` or `"_acme-challenge.sub"`). */
  recordName: string;
  /** Fully-qualified domain name of the TXT record (e.g. `"_acme-challenge.example.com"`). */
  recordFqdn: string;
  /** The validation token to set as TXT record content. */
  value: string;
  /** TTL in seconds for the DNS record. */
  ttl: number;
  /** Number of remaining challenges after this one. */
  remainingChallenges: number;
  /** All domain identifiers being validated in this certificate order. */
  allIdentifiers: string[];
  /** Output from a previous auth hook (only set during cleanup). */
  authOutput?: string;
};

/** Parsed CLI arguments: named flags and positional arguments. */
export type ParsedArgs = {
  /** Named flags from `--key value` or `--key=value` pairs. Boolean flags have value `true`. */
  flags: Record<string, string | boolean>;
  /** Positional (non-flag) arguments. */
  positionals: string[];
};

/** Context passed to plugin subcommand handlers. */
export type PluginCommandContext = {
  /** The runtime context for the current target. */
  runtime: RuntimeContext;
  /** The parsed CLI arguments. */
  parsed: ParsedArgs;
  /** The subcommand name being executed. */
  subcommand: string;
};

/**
 * A DNS provider plugin for defuss-tlsbot.
 *
 * Plugins implement DNS challenge lifecycle methods and optionally
 * provide custom CLI subcommands. The pipeline runs plugins in order;
 * the first to return a result wins.
 */
export type TlsCertBotPlugin = {
  /** Unique plugin name (e.g. `"hetzner"`, `"cloudflare"`). */
  name: string;
  /** Human-readable description shown in `list` output. */
  description?: string;
  /** Default DNS propagation timeout in seconds for this provider. */
  defaultPropagationSeconds?: number;
  /** Issue a certificate. Return `null` to skip, throw to fail, return result to succeed. */
  issue?: (ctx: RuntimeContext) => Promise<IssueResult | null>;
  /** Create a DNS TXT record for an ACME challenge. Called by certbot's auth hook. */
  presentChallenge?: (ctx: RuntimeContext, challenge: Challenge) => Promise<void>;
  /** Remove the DNS TXT record after validation. Called by certbot's cleanup hook. */
  cleanupChallenge?: (ctx: RuntimeContext, challenge: Challenge) => Promise<void>;
  /** Additional CLI subcommands exposed under `defuss-tlsbot <plugin> <subcommand>`. */
  commands?: Record<string, (ctx: PluginCommandContext) => Promise<number | void> | number | void>;
};

/** Let's Encrypt staging ACME directory URL. */
export const LETS_ENCRYPT_STAGING_DIRECTORY = "https://acme-staging-v02.api.letsencrypt.org/directory";

/**
 * Identity function for defining a plugin with full type inference.
 *
 * @example
 * ```ts
 * const myPlugin = () => definePlugin({
 *   name: "my-dns",
 *   async presentChallenge(ctx, challenge) { ... },
 *   async cleanupChallenge(ctx, challenge) { ... },
 * });
 * ```
 */
export const definePlugin = <T extends TlsCertBotPlugin>(plugin: T): T => plugin;

/**
 * Identity function for defining a typed configuration.
 *
 * Use this in `defuss-tlsbot.config.ts` for editor autocompletion and type checking.
 *
 * @example
 * ```ts
 * // defuss-tlsbot.config.ts
 * import { defineConfig } from "defuss-tlsbot";
 *
 * export default defineConfig({
 *   defaultEmail: "ops@example.com",
 *   targets: [{ name: "prod", domains: ["example.com"], zone: "example.com", outputDir: "/certs" }],
 * });
 * ```
 */
export const defineConfig = (config: TlsCertBotConfig): TlsCertBotConfig => config;

/**
 * Create a TLS certificate bot instance with the given plugins.
 *
 * The bot provides methods to issue certificates, run the plugin pipeline,
 * and execute plugin subcommands.
 */
export const createTlsCertBot = (plugins: TlsCertBotPlugin[]) => {
  const registry = new Map(plugins.map((plugin) => [plugin.name, plugin]));

  return {
    plugins,
    registry,
    /** Look up a plugin by name. */
    getPlugin(name: string) {
      return registry.get(name);
    },
    /** Run the issuance pipeline. First successful plugin wins. */
    async issue(runtime: RuntimeContext, requestedOrder?: string[]) {
      return issueWithPlugins(runtime, plugins, requestedOrder);
    },
    /** Execute a named subcommand on a specific plugin. */
    async runPluginCommand(name: string, subcommand: string, ctx: PluginCommandContext) {
      const plugin = registry.get(name);
      if (!plugin) {
        throw new Error(`Unknown plugin: ${name}`);
      }
      return runPluginCommand(plugin, subcommand, ctx);
    },
  };
};

/**
 * Load and validate a defuss-tlsbot configuration file.
 *
 * Supports both `.ts` files (loaded via dynamic `import()`, expects a default export)
 * and `.json` files (loaded via `fs.readFile` + `JSON.parse`).
 *
 * @param configPath - Absolute or relative path to the config file.
 * @returns The validated configuration object.
 * @throws If the file cannot be loaded or validation fails.
 */
export const loadConfig = async (configPath: string): Promise<TlsCertBotConfig> => {
  let parsed: TlsCertBotConfig;

  if (configPath.endsWith(".ts") || configPath.endsWith(".mts") || configPath.endsWith(".cts")) {
    const absolutePath = path.resolve(configPath);
    const mod = await import(absolutePath);
    parsed = (mod.default ?? mod) as TlsCertBotConfig;
  } else {
    const raw = await fs.readFile(configPath, "utf8");
    parsed = JSON.parse(raw) as TlsCertBotConfig;
  }

  if (!parsed || !Array.isArray(parsed.targets) || parsed.targets.length === 0) {
    throw new Error("Config must contain at least one target in targets[].");
  }

  for (const target of parsed.targets) {
    if (!target.name) {
      throw new Error("Each target requires a name.");
    }
    if (!Array.isArray(target.domains) || target.domains.length === 0) {
      throw new Error(`Target ${target.name} must define domains[].`);
    }
    if (!target.zone) {
      throw new Error(`Target ${target.name} must define zone.`);
    }
    if (!target.outputDir) {
      throw new Error(`Target ${target.name} must define outputDir.`);
    }
  }

  return parsed;
};

/**
 * Resolve a target by name from the config. Returns the first target if no name is given.
 *
 * @throws If the named target is not found.
 */
export const resolveTarget = (config: TlsCertBotConfig, targetName?: string): TargetConfig => {
  if (!targetName) {
    return config.targets[0]!;
  }
  const found = config.targets.find((target) => target.name === targetName);
  if (!found) {
    throw new Error(`Unknown target: ${targetName}`);
  }
  return found;
};

/**
 * Build a {@link RuntimeContext} from a config file path and optional overrides.
 *
 * Loads and validates the config, resolves the target, and assembles
 * all context needed by plugins and the issuance pipeline.
 */
export const createRuntimeContext = async (params: {
  configPath: string;
  targetName?: string;
  dryRun?: boolean;
  entryFile?: string;
}): Promise<RuntimeContext> => {
  const configPath = path.resolve(params.configPath);
  const config = await loadConfig(configPath);
  const target = resolveTarget(config, params.targetName);
  return {
    config,
    target,
    targetName: target.name,
    configPath,
    entryFile: params.entryFile ? path.resolve(params.entryFile) : defaultEntryFile(),
    dryRun: params.dryRun,
    env: process.env,
  };
};

/** Resolve the default CLI entry file path from the current module location. */
export const defaultEntryFile = (): string => {
  return fileURLToPath(new URL("./cli.js", import.meta.url));
};

/**
 * Parse CLI arguments into named flags and positional arguments.
 *
 * Supports `--key value`, `--key=value`, and `--bool-flag` (no value → `true`).
 */
export const parseArgs = (argv: string[]): ParsedArgs => {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const body = arg.slice(2);
    const eq = body.indexOf("=");
    if (eq >= 0) {
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1);
      flags[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[body] = true;
      continue;
    }

    flags[body] = next;
    index += 1;
  }

  return { flags, positionals };
};

/** Extract a string flag value, or `undefined` if not present. */
export const flagString = (parsed: ParsedArgs, key: string): string | undefined => {
  const value = parsed.flags[key];
  return typeof value === "string" ? value : undefined;
};

/** Extract a boolean flag value. Recognizes `true`, `1`, `yes`, `on` as truthy. */
export const flagBoolean = (parsed: ParsedArgs, key: string): boolean => {
  const value = parsed.flags[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
};

/** Shell-escape a string value using single quotes. */
export const shellQuote = (value: string): string => {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
};

/** Sanitize a string for use as a certbot `--cert-name` value. */
export const sanitizeCertName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]+/g, "-");

/** Strip a leading wildcard prefix (`*.`) from a domain, if present. */
export const stripWildcard = (domain: string): string => domain.startsWith("*.") ? domain.slice(2) : domain;

/** Build the ACME challenge FQDN for a domain (e.g. `_acme-challenge.example.com`). */
export const acmeRecordFqdn = (identifier: string): string => `_acme-challenge.${stripWildcard(identifier)}`;

/**
 * Compute the relative record name within a zone.
 *
 * @returns `"@"` if the FQDN equals the zone, otherwise the prefix before `.zone`.
 * @throws If the FQDN is not inside the given zone.
 */
export const relativeRecordName = (zone: string, recordFqdn: string): string => {
  if (recordFqdn === zone) {
    return "@";
  }
  const suffix = `.${zone}`;
  if (!recordFqdn.endsWith(suffix)) {
    throw new Error(`Record ${recordFqdn} is not inside zone ${zone}`);
  }
  return recordFqdn.slice(0, -suffix.length);
};

/**
 * Build a {@link Challenge} from certbot environment variables.
 *
 * Reads `CERTBOT_DOMAIN`, `CERTBOT_VALIDATION`, and related env vars
 * set by certbot during manual hook execution.
 *
 * @throws If required environment variables are missing.
 */
export const makeChallengeFromCertbotEnv = (ctx: RuntimeContext): Challenge => {
  const domain = ctx.env.CERTBOT_DOMAIN;
  const value = ctx.env.CERTBOT_VALIDATION;
  if (!domain || !value) {
    throw new Error("CERTBOT_DOMAIN and CERTBOT_VALIDATION are required for hook commands.");
  }

  const recordFqdn = acmeRecordFqdn(domain);
  return {
    zone: ctx.target.zone,
    domain,
    recordFqdn,
    recordName: relativeRecordName(ctx.target.zone, recordFqdn),
    value,
    ttl: 60,
    remainingChallenges: Number(ctx.env.CERTBOT_REMAINING_CHALLENGES ?? "0"),
    allIdentifiers: (ctx.env.CERTBOT_ALL_IDENTIFIERS ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
    authOutput: ctx.env.CERTBOT_AUTH_OUTPUT,
  };
};

/**
 * Check whether another identifier in the same order shares the same ACME challenge record.
 *
 * This happens when both `example.com` and `*.example.com` are in the same certificate —
 * they use the same `_acme-challenge.example.com` TXT record.
 */
export const hasSiblingIdentifierForSameRecord = (challenge: Challenge): boolean => {
  const current = acmeRecordFqdn(challenge.domain);
  return challenge.allIdentifiers
    .filter((identifier) => identifier !== challenge.domain)
    .some((identifier) => acmeRecordFqdn(identifier) === current);
};

/**
 * Merge global and per-target provider configuration for a named plugin.
 *
 * Per-target values override global values.
 */
export const getProviderConfig = <T extends JsonObject = JsonObject>(ctx: RuntimeContext, pluginName: string): T => {
  return {
    ...(ctx.config.providers?.[pluginName] ?? {}),
    ...(ctx.target.providers?.[pluginName] ?? {}),
  } as T;
};

/**
 * Resolve a secret value from config, with env var lookup fallback.
 *
 * Checks, in order:
 * 1. Direct value from `source[directKey]`
 * 2. Environment variable named by `source[envKeyField]`
 * 3. Environment variable named by `fallbackEnvKey`
 */
export const secretFromConfig = (
  source: JsonObject,
  directKey: string,
  envKeyField: string,
  fallbackEnvKey?: string,
): string | undefined => {
  const direct = source[directKey];
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const envKey = source[envKeyField];
  if (typeof envKey === "string" && envKey.length > 0) {
    const value = process.env[envKey];
    if (value) {
      return value;
    }
  }

  if (fallbackEnvKey) {
    return process.env[fallbackEnvKey];
  }

  return undefined;
};

/** Create a directory and all parent directories if they don't exist. */
export const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

/** Check whether a file exists at the given path. */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/** Write a JSON value to a file, creating parent directories as needed. */
export const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

/**
 * Make an HTTP request and parse the JSON response.
 *
 * @throws On non-2xx responses with a summary of the error body.
 */
export const httpJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown = text;
  if (contentType.includes("application/json") || text.startsWith("{") || text.startsWith("[")) {
    data = text.length > 0 ? JSON.parse(text) : null;
  }

  if (!response.ok) {
    const summary = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`HTTP ${response.status} for ${url}: ${summary}`);
  }

  return data as T;
};

/** Sleep for `ms` milliseconds. */
export const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolve authoritative name server IP addresses for a DNS zone. */
const authoritativeServersForZone = async (zone: string): Promise<string[]> => {
  const nameServers = await resolveNs(zone);
  const ips: string[] = [];

  for (const ns of nameServers) {
    try {
      ips.push(...await resolve4(ns));
    } catch {
      // ignore
    }
    try {
      ips.push(...await resolve6(ns));
    } catch {
      // ignore
    }
  }

  return Array.from(new Set(ips));
};

/** Query TXT records via specific DNS servers (or system resolver if none given). */
const resolveTxtVia = async (servers: string[] | undefined, recordFqdn: string): Promise<string[]> => {
  const resolver = new Resolver();
  if (servers && servers.length > 0) {
    resolver.setServers(servers);
  }
  const rows = await resolver.resolveTxt(recordFqdn);
  return rows.map((entry) => entry.join(""));
};

/**
 * Poll DNS until a TXT record with the expected value appears, or time out.
 *
 * Prefers querying authoritative name servers for the zone, falling back
 * to the system resolver if NS lookup fails.
 *
 * @throws After `timeoutSeconds` if the expected value is not found.
 */
export const waitForDnsTxt = async (params: {
  zone: string;
  recordFqdn: string;
  expectedValue: string;
  timeoutSeconds: number;
  intervalSeconds: number;
}): Promise<void> => {
  const { zone, recordFqdn, expectedValue, timeoutSeconds, intervalSeconds } = params;
  const deadline = Date.now() + timeoutSeconds * 1000;

  let authoritativeServers: string[] | undefined;
  try {
    authoritativeServers = await authoritativeServersForZone(zone);
  } catch {
    authoritativeServers = undefined;
  }

  while (Date.now() < deadline) {
    try {
      const txtValues = await resolveTxtVia(authoritativeServers, recordFqdn);
      if (txtValues.includes(expectedValue)) {
        return;
      }
    } catch {
      // not propagated yet
    }
    await sleep(intervalSeconds * 1000);
  }

  throw new Error(`Timed out waiting for DNS TXT ${recordFqdn} to contain expected value.`);
};

/**
 * Resolve a server name to an ACME directory URL.
 *
 * - `"production"` or `undefined` → default Let's Encrypt production
 * - `"staging"` → Let's Encrypt staging
 * - Any other string is treated as a custom directory URL
 */
export const resolveServerUrl = (value: string | undefined): string | undefined => {
  if (!value || value === "production") {
    return undefined;
  }
  if (value === "staging") {
    return LETS_ENCRYPT_STAGING_DIRECTORY;
  }
  return value;
};

/**
 * Determine the shell command for invoking the CLI entry point.
 *
 * Used to build certbot `--manual-auth-hook` and `--manual-cleanup-hook` commands.
 * Checks (in order): `config.runtimeCommand`, `TLS_CERT_BOT_RUNTIME` env var,
 * bun runtime detection, fallback to Node with `--experimental-strip-types`.
 */
export const inferRuntimeCommand = (ctx: RuntimeContext): string => {
  if (ctx.config.runtimeCommand && ctx.config.runtimeCommand.trim().length > 0) {
    return ctx.config.runtimeCommand.trim();
  }
  if (ctx.env.TLS_CERT_BOT_RUNTIME && ctx.env.TLS_CERT_BOT_RUNTIME.trim().length > 0) {
    return ctx.env.TLS_CERT_BOT_RUNTIME.trim();
  }
  if ((process as NodeJS.Process & { versions?: { bun?: string } }).versions?.bun) {
    return `bun run ${shellQuote(ctx.entryFile)}`;
  }
  return `node --experimental-strip-types ${shellQuote(ctx.entryFile)}`;
};

/** Resolve the certbot state directory for a target. */
export const certbotStateDir = (ctx: RuntimeContext): string => {
  const explicit = ctx.config.stateDir;
  if (explicit) {
    return path.resolve(explicit, ctx.target.name);
  }
  return path.resolve(ctx.target.outputDir, ".bot-state");
};

/** Resolve the certbot `--config-dir` for a target. */
export const certbotConfigDir = (ctx: RuntimeContext): string => ctx.target.certbotConfigDir ?? path.join(certbotStateDir(ctx), "certbot-config");

/** Resolve the certbot `--work-dir` for a target. */
export const certbotWorkDir = (ctx: RuntimeContext): string => ctx.target.certbotWorkDir ?? path.join(certbotStateDir(ctx), "certbot-work");

/** Resolve the certbot `--logs-dir` for a target. */
export const certbotLogsDir = (ctx: RuntimeContext): string => ctx.target.certbotLogsDir ?? path.join(certbotStateDir(ctx), "certbot-logs");

/** Derive the certbot `--cert-name` for a target. */
export const certNameForTarget = (ctx: RuntimeContext): string => sanitizeCertName(ctx.target.certName ?? ctx.target.domains[0]!);

/**
 * Spawn a child process and stream its stdio to the parent.
 *
 * @throws If the command exits with a non-zero code.
 */
export const runCommandStreaming = async (command: string, args: string[], options?: {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: options?.env,
      cwd: options?.cwd,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(" ")} (exit ${code ?? "null"})`));
    });
  });
};

/** Copy a file, resolving symlinks in the source path. */
export const copyFileResolved = async (source: string, destination: string): Promise<void> => {
  const realSource = await fs.realpath(source);
  await fs.copyFile(realSource, destination);
};

/**
 * Copy issued certificate files from a certbot live directory to the target output directory.
 *
 * Sets appropriate file permissions (600 for private key, 644 for certificates)
 * and writes a `tls-cert-bot.result.json` metadata file.
 */
export const persistIssuedCertificate = async (ctx: RuntimeContext, sourceLiveDir: string, pluginName: string): Promise<IssueResult> => {
  const outputDir = path.resolve(ctx.target.outputDir);
  await ensureDir(outputDir);

  const fullchainPath = path.join(outputDir, "fullchain.pem");
  const privkeyPath = path.join(outputDir, "privkey.pem");
  const chainPath = path.join(outputDir, "chain.pem");
  const certPath = path.join(outputDir, "cert.pem");

  await copyFileResolved(path.join(sourceLiveDir, "fullchain.pem"), fullchainPath);
  await copyFileResolved(path.join(sourceLiveDir, "privkey.pem"), privkeyPath);

  if (await fileExists(path.join(sourceLiveDir, "chain.pem"))) {
    await copyFileResolved(path.join(sourceLiveDir, "chain.pem"), chainPath);
  }
  if (await fileExists(path.join(sourceLiveDir, "cert.pem"))) {
    await copyFileResolved(path.join(sourceLiveDir, "cert.pem"), certPath);
  }

  await fs.chmod(privkeyPath, 0o600).catch(() => undefined);
  await fs.chmod(fullchainPath, 0o644).catch(() => undefined);
  if (await fileExists(chainPath)) {
    await fs.chmod(chainPath, 0o644).catch(() => undefined);
  }
  if (await fileExists(certPath)) {
    await fs.chmod(certPath, 0o644).catch(() => undefined);
  }

  await writeJson(path.join(outputDir, "tls-cert-bot.result.json"), {
    plugin: pluginName,
    kind: "acme",
    domains: ctx.target.domains,
    zone: ctx.target.zone,
    updatedAt: new Date().toISOString(),
  });

  return {
    ok: true,
    plugin: pluginName,
    kind: "acme",
    outputDir,
    certPath: fullchainPath,
    keyPath: privkeyPath,
    certName: certNameForTarget(ctx),
    details: [`Persisted certificate lineage into ${outputDir}`],
  };
};

/**
 * Issue a certificate using certbot in manual DNS-01 mode.
 *
 * Builds the certbot command with auth/cleanup hooks that call back into
 * the CLI, invoking the plugin's `presentChallenge` and `cleanupChallenge` methods.
 *
 * @returns The issue result, or `null` if the plugin lacks challenge hooks.
 */
export const issueWithCertbotDns = async (plugin: TlsCertBotPlugin, ctx: RuntimeContext): Promise<IssueResult | null> => {
  if (!plugin.presentChallenge || !plugin.cleanupChallenge) {
    return null;
  }

  const certbotBin = ctx.target.certbotBin ?? ctx.config.certbotBin ?? "certbot";
  const certName = certNameForTarget(ctx);
  await ensureDir(certbotConfigDir(ctx));
  await ensureDir(certbotWorkDir(ctx));
  await ensureDir(certbotLogsDir(ctx));
  await ensureDir(ctx.target.outputDir);

  const runtimeCommand = inferRuntimeCommand(ctx);
  const configPath = ctx.configPath;
  const targetName = ctx.target.name;

  const authHook = `${runtimeCommand} ${shellQuote(plugin.name)} auth-hook --config ${shellQuote(configPath)} --target ${shellQuote(targetName)}`;
  const cleanupHook = `${runtimeCommand} ${shellQuote(plugin.name)} cleanup-hook --config ${shellQuote(configPath)} --target ${shellQuote(targetName)}`;

  const args = [
    "certonly",
    "--manual",
    "--preferred-challenges", "dns",
    "--manual-public-ip-logging-ok",
    "--manual-auth-hook", authHook,
    "--manual-cleanup-hook", cleanupHook,
    "--non-interactive",
    "--agree-tos",
    "--keep-until-expiring",
    "--config-dir", certbotConfigDir(ctx),
    "--work-dir", certbotWorkDir(ctx),
    "--logs-dir", certbotLogsDir(ctx),
    "--cert-name", certName,
  ];

  const email = ctx.target.email ?? ctx.config.defaultEmail;
  if (email) {
    args.push("--email", email);
  } else {
    args.push("--register-unsafely-without-email");
  }

  const keyType = ctx.target.keyType ?? "rsa";
  args.push("--key-type", keyType);
  if (keyType === "rsa") {
    args.push("--rsa-key-size", String(ctx.target.rsaBits ?? 2048));
  }

  const serverUrl = resolveServerUrl(ctx.target.server ?? ctx.config.defaultServer);
  if (serverUrl) {
    args.push("--server", serverUrl);
  }

  if (ctx.dryRun) {
    args.push("--dry-run");
  }

  for (const domain of ctx.target.domains) {
    args.push("-d", domain);
  }

  await runCommandStreaming(certbotBin, args, { env: ctx.env });

  const liveDir = path.join(certbotConfigDir(ctx), "live", certName);
  return persistIssuedCertificate(ctx, liveDir, plugin.name);
};

/**
 * Generate a self-signed fallback certificate using openssl.
 *
 * Used when all provider plugins fail or as an explicit fallback command.
 * Produces a short-lived certificate (default 7 days) so services can boot
 * even when public trust is unavailable.
 */
export const issueSelfSignedFallback = async (ctx: RuntimeContext, reason: string): Promise<IssueResult> => {
  const outputDir = path.resolve(ctx.target.outputDir);
  const opensslBin = ctx.target.opensslBin ?? ctx.config.opensslBin ?? "openssl";
  const primaryDomain = stripWildcard(ctx.target.domains[0]!);
  const fullchainPath = path.join(outputDir, "fullchain.pem");
  const privkeyPath = path.join(outputDir, "privkey.pem");
  const certPath = path.join(outputDir, "cert.pem");
  const chainPath = path.join(outputDir, "chain.pem");
  const san = ctx.target.domains.map((domain) => `DNS:${domain}`).join(",");

  await ensureDir(outputDir);

  const args = [
    "req",
    "-x509",
    "-newkey", `rsa:${ctx.target.rsaBits ?? 2048}`,
    "-sha256",
    "-nodes",
    "-days", String(ctx.target.fallbackDays ?? 7),
    "-subj", `/CN=${primaryDomain}`,
    "-addext", `subjectAltName=${san}`,
    "-addext", "basicConstraints=CA:FALSE",
    "-addext", "keyUsage=digitalSignature,keyEncipherment",
    "-addext", "extendedKeyUsage=serverAuth",
    "-keyout", privkeyPath,
    "-out", fullchainPath,
  ];

  await runCommandStreaming(opensslBin, args, { env: ctx.env });
  await fs.copyFile(fullchainPath, certPath);
  await fs.copyFile(fullchainPath, chainPath);
  await fs.chmod(privkeyPath, 0o600).catch(() => undefined);
  await fs.chmod(fullchainPath, 0o644).catch(() => undefined);
  await fs.chmod(certPath, 0o644).catch(() => undefined);
  await fs.chmod(chainPath, 0o644).catch(() => undefined);

  await writeJson(path.join(outputDir, "tls-cert-bot.result.json"), {
    plugin: "internal",
    kind: "fallback",
    domains: ctx.target.domains,
    zone: ctx.target.zone,
    updatedAt: new Date().toISOString(),
    reason,
  });

  return {
    ok: true,
    plugin: "internal",
    kind: "fallback",
    outputDir,
    certPath: fullchainPath,
    keyPath: privkeyPath,
    certName: certNameForTarget(ctx),
    details: [reason],
  };
};

/**
 * Run the plugin issuance pipeline.
 *
 * Iterates plugins in order. Each plugin can return a result (success),
 * return `null` (skip), or throw (failure). Falls back to a self-signed
 * certificate if no plugin succeeds.
 */
export const issueWithPlugins = async (
  ctx: RuntimeContext,
  plugins: TlsCertBotPlugin[],
  requestedOrder?: string[],
): Promise<IssueResult> => {
  const registry = new Map(plugins.map((plugin) => [plugin.name, plugin]));
  const order = requestedOrder ?? ctx.target.pluginOrder ?? ctx.config.pluginOrder ?? plugins.map((plugin) => plugin.name).filter((name) => name !== "internal");
  const failures: string[] = [];

  for (const name of order) {
    const plugin = registry.get(name);
    if (!plugin || !plugin.issue) {
      failures.push(`${name}: plugin missing or not issuable`);
      continue;
    }

    try {
      const result = await plugin.issue(ctx);
      if (result) {
        return result;
      }
      failures.push(`${name}: skipped`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
    }
  }

  const reason = failures.length > 0
    ? `Fell back to internal self-signed certificate after provider pipeline failed: ${failures.join("; ")}`
    : "Fell back to internal self-signed certificate because no provider plugin produced a result.";

  return issueSelfSignedFallback(ctx, reason);
};

/**
 * Execute a plugin subcommand.
 *
 * Built-in subcommands: `issue`, `auth-hook`, `cleanup-hook`, `present`, `cleanup`.
 * Plugins can register additional subcommands via `commands`.
 */
export const runPluginCommand = async (
  plugin: TlsCertBotPlugin,
  subcommand: string,
  ctx: PluginCommandContext,
): Promise<number> => {
  if (subcommand === "issue") {
    if (!plugin.issue) {
      throw new Error(`Plugin ${plugin.name} does not implement issue().`);
    }
    await plugin.issue(ctx.runtime);
    return 0;
  }

  if (subcommand === "auth-hook") {
    if (!plugin.presentChallenge) {
      throw new Error(`Plugin ${plugin.name} does not implement presentChallenge().`);
    }
    const challenge = makeChallengeFromCertbotEnv(ctx.runtime);
    await plugin.presentChallenge(ctx.runtime, challenge);
    const timeoutSeconds = ctx.runtime.target.dnsPropagationTimeoutSeconds ?? plugin.defaultPropagationSeconds ?? 120;
    const intervalSeconds = ctx.runtime.target.dnsPropagationIntervalSeconds ?? 5;
    await waitForDnsTxt({
      zone: challenge.zone,
      recordFqdn: challenge.recordFqdn,
      expectedValue: challenge.value,
      timeoutSeconds,
      intervalSeconds,
    });
    return 0;
  }

  if (subcommand === "cleanup-hook") {
    if (!plugin.cleanupChallenge) {
      throw new Error(`Plugin ${plugin.name} does not implement cleanupChallenge().`);
    }
    const challenge = makeChallengeFromCertbotEnv(ctx.runtime);
    await plugin.cleanupChallenge(ctx.runtime, challenge);
    return 0;
  }

  if (subcommand === "present") {
    if (!plugin.presentChallenge) {
      throw new Error(`Plugin ${plugin.name} does not implement presentChallenge().`);
    }
    const domain = flagString(ctx.parsed, "domain");
    const value = flagString(ctx.parsed, "value");
    const zone = flagString(ctx.parsed, "zone") ?? ctx.runtime.target.zone;
    if (!domain || !value) {
      throw new Error("present requires --domain and --value");
    }
    const recordFqdn = acmeRecordFqdn(domain);
    await plugin.presentChallenge(ctx.runtime, {
      zone,
      domain,
      recordFqdn,
      recordName: relativeRecordName(zone, recordFqdn),
      value,
      ttl: Number(flagString(ctx.parsed, "ttl") ?? "60"),
      remainingChallenges: 0,
      allIdentifiers: [domain],
    });
    return 0;
  }

  if (subcommand === "cleanup") {
    if (!plugin.cleanupChallenge) {
      throw new Error(`Plugin ${plugin.name} does not implement cleanupChallenge().`);
    }
    const domain = flagString(ctx.parsed, "domain");
    const value = flagString(ctx.parsed, "value");
    const zone = flagString(ctx.parsed, "zone") ?? ctx.runtime.target.zone;
    if (!domain || !value) {
      throw new Error("cleanup requires --domain and --value");
    }
    const recordFqdn = acmeRecordFqdn(domain);
    await plugin.cleanupChallenge(ctx.runtime, {
      zone,
      domain,
      recordFqdn,
      recordName: relativeRecordName(zone, recordFqdn),
      value,
      ttl: Number(flagString(ctx.parsed, "ttl") ?? "60"),
      remainingChallenges: 0,
      allIdentifiers: [domain],
    });
    return 0;
  }

  const handler = plugin.commands?.[subcommand];
  if (!handler) {
    throw new Error(`Unknown subcommand for plugin ${plugin.name}: ${subcommand}`);
  }

  const result = await handler(ctx);
  return typeof result === "number" ? result : 0;
};
